import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeWorkshopCapacity } from '../src/lib/workshopMonitor.js';

const orders = [{ id: 'RN-1', status: 'U tijeku', pieces: [{ name: 'Vertikala', quantity: 2, material: 'Impala' }] }];

test('upozorava kada nema aktivnog posla u ručnoj obradi, a radnici su evidentirani', () => {
  const result = analyzeWorkshopCapacity(orders, { workers: ['Ivan', 'Marko'], pieces: {} });
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
  const result = analyzeWorkshopCapacity(orders, { workers: ['Ivan'], pieces });
  const alert = result.alerts.find(item => item.id === 'manual-capacity-idle');
  assert.equal(alert.severity, 'warning');
  assert.equal(alert.waiting, 2);
});

test('ne prikazuje upozorenje o neiskorištenim radnicima ako popis radnika nije evidentiran', () => {
  const result = analyzeWorkshopCapacity(orders, { workers: [], pieces: {} });
  assert.equal(result.alerts.some(item => item.id === 'manual-capacity-idle'), false);
});

test('ignorira završene i otkazane radne naloge', () => {
  const result = analyzeWorkshopCapacity([{ ...orders[0], status: 'Završen' }], { workers: ['Ivan'], pieces: {} });
  assert.equal(result.summary.activePieces, 0);
});
