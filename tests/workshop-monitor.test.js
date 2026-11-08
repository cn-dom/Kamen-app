import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeWorkshopCapacity } from '../src/lib/workshopMonitor.js';

const orders = [{ id: 'RN-1', status: 'U tijeku', pieces: [{ name: 'Vertikala', quantity: 2, material: 'Impala' }] }];
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const present = (workers, pieces = {}) => ({ workers, pieces, attendance: { date: today(), statuses: Object.fromEntries(workers.map(name => [name, 'Prisutan'])) } });

test('upozorava kada nema aktivnog posla u ručnoj obradi, a radnici su potvrđeno prisutni', () => {
  const result = analyzeWorkshopCapacity(orders, present(['Ivan', 'Marko']));
  const alert = result.alerts.find(item => item.id === 'manual-capacity-idle');
  assert.ok(alert);
  assert.equal(alert.severity, 'info');
  assert.match(alert.description, /2 radnika/);
});

test('upozorava da komadi čekaju ručnu obradu kada su prethodne faze završene', () => {
  const pieces = {};
  for (let i = 1; i <= 2; i++) {
    const key = 'RN-1::0::' + i;
    pieces[key] = { stages: {
      'Pilanje': { status: 'Završeno' },
      'Kanterica / obrada rubova': { status: 'Završeno' },
      'Poliranje': { status: 'Završeno' },
      'Ostala obrada': { status: 'Nije započeto' }
    } };
  }
  const result = analyzeWorkshopCapacity(orders, present(['Ivan'], pieces));
  const alert = result.alerts.find(item => item.id === 'manual-capacity-idle');
  assert.equal(alert.severity, 'warning');
  assert.equal(alert.waiting, 2);
});

test('ne smatra neunesenu prisutnost raspoloživim kapacitetom', () => {
  const result = analyzeWorkshopCapacity(orders, { workers: ['Ivan'], pieces: {} });
  assert.equal(result.presentWorkers.length, 0);
  assert.equal(result.idleWorkers.length, 0);
  assert.equal(result.alerts.some(item => item.id === 'manual-capacity-idle'), false);
  assert.equal(result.alerts.some(item => item.id === 'attendance-unrecorded'), true);
});

test('odsutni i radnici izvan smjene ne ulaze u neiskorišten kapacitet', () => {
  const production = { workers: ['Ivan', 'Marko', 'Ana'], pieces: {}, attendance: { date: today(), statuses: { Ivan: 'Odsutan', Marko: 'Izvan smjene', Ana: 'Prisutan' } } };
  const result = analyzeWorkshopCapacity(orders, production);
  assert.deepEqual(result.presentWorkers, ['Ana']);
  assert.deepEqual(result.absentWorkers, ['Ivan']);
  assert.deepEqual(result.offShiftWorkers, ['Marko']);
  assert.deepEqual(result.idleWorkers, ['Ana']);
});

test('ignorira završene i otkazane radne naloge', () => {
  const result = analyzeWorkshopCapacity([{ ...orders[0], status: 'Završen' }], present(['Ivan']));
  assert.equal(result.summary.activePieces, 0);
});


test('radnik na terenu ne ulazi u slobodan kapacitet radionice', () => {
  const production = {
    ...present(['Ivan', 'Marko']),
    deployment: {
      date: today(),
      assignments: {
        Ivan: { area: 'Teren', task: 'Montaža spomenika', location: 'Krapina' },
        Marko: { area: 'Radionica', task: '', location: '' }
      }
    }
  };
  const result = analyzeWorkshopCapacity(orders, production);
  assert.deepEqual(result.fieldWorkers, [{ name: 'Ivan', task: 'Montaža spomenika', location: 'Krapina' }]);
  assert.deepEqual(result.workshopWorkers, ['Marko']);
  assert.deepEqual(result.idleWorkers, ['Marko']);
  assert.equal(result.activeWorkers, 0);
  const alert = result.alerts.find(item => item.id === 'manual-capacity-idle');
  assert.match(alert.description, /1 radnika je prisutno u radionici/);
  assert.match(alert.description, /1 radnika je na terenu/);
});

test('upozorava kada terenski zadatak nema vrstu posla ili lokaciju', () => {
  const production = {
    ...present(['Ivan']),
    deployment: { date: today(), assignments: { Ivan: { area: 'Teren', task: 'Izmjera', location: '' } } }
  };
  const result = analyzeWorkshopCapacity(orders, production);
  assert.equal(result.fieldWorkers.length, 1);
  assert.equal(result.idleWorkers.length, 0);
  assert.equal(result.alerts.some(item => item.id === 'field-assignment-incomplete'), true);
});

test('stari dnevni raspored ne prenosi radnika na teren u novi dan', () => {
  const production = {
    ...present(['Ivan']),
    deployment: { date: '2020-01-01', assignments: { Ivan: { area: 'Teren', task: 'Montaža', location: 'Zagreb' } } }
  };
  const result = analyzeWorkshopCapacity(orders, production);
  assert.equal(result.fieldWorkers.length, 0);
  assert.deepEqual(result.workshopWorkers, ['Ivan']);
});


test('predlaže samo prisutne radnike u radionici s odgovarajućom vještinom', () => {
  const pieces = {};
  for (let i = 1; i <= 2; i++) pieces['RN-1::0::' + i] = { stages: { 'Pilanje': { status: 'Nije započeto' } } };
  const production = { ...present(['Ivan','Marko']), workerSkills: { Ivan: ['Pilanje'], Marko: ['Poliranje'] } };
  const result = analyzeWorkshopCapacity(orders, production);
  const recommendation = result.recommendations.find(item => item.stage === 'Pilanje');
  assert.ok(recommendation);
  assert.deepEqual(recommendation.workers, ['Ivan']);
});

test('ne predlaže odsutne, terenske ili već zauzete radnike', () => {
  const production = { ...present(['Ivan','Marko','Ana']), attendance: { date: today(), statuses: { Ivan: 'Odsutan', Marko: 'Prisutan', Ana: 'Prisutan' } }, workerSkills: { Ivan: ['Pilanje'], Marko: ['Pilanje'], Ana: ['Pilanje'] }, deployment: { date: today(), assignments: { Marko: { area: 'Teren' } } } };
  const pieces = { 'RN-1::0::1': { stages: { 'Pilanje': { status: 'U tijeku', assignedTo: 'Ana' } } } };
  const result = analyzeWorkshopCapacity(orders, { ...production, pieces });
  assert.equal(result.recommendations.some(item => item.stage === 'Pilanje'), false);
});
