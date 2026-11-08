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
