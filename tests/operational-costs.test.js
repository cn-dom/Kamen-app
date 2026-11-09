import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOperationalCostRecords } from '../src/lib/operationalCosts.js';
test('automatski obračunava proizvodne sate po cijeni sata i izuzima terensku fazu', () => {
  const result = buildOperationalCostRecords({
    orders: [{ id: 'RN-1' }],
    productionRecords: { pieces: { 'RN-1::0::1': { stages: {
      Pilanje: { sessions: [{ startedAt: '2026-11-09T08:00:00Z', endedAt: '2026-11-09T10:00:00Z' }] },
      Poliranje: { sessions: [{ startedAt: '2026-11-09T10:00:00Z', endedAt: '2026-11-09T11:30:00Z' }] },
      'Terenski rad / montaža': { sessions: [{ startedAt: '2026-11-09T11:30:00Z', endedAt: '2026-11-09T13:30:00Z' }] }
    } } } },
    workRules: { hourlyCostRate: '20' }, now: new Date('2026-11-09T15:00:00Z')
  });
  assert.equal(result[0].hours, 3.5);
  assert.equal(result[0].amount, 70);
});
test('obračunava terenski rad prema trajanju montaže i broju radnika', () => {
  const result = buildOperationalCostRecords({
    orders: [{ id: 'RN-2' }],
    fieldJobs: [{ orderId: 'RN-2', crew: ['Ana', 'Ivan'], status: 'Završeno', events: [
      { type: 'Montaža u tijeku', at: '2026-11-09T08:00:00Z' }, { type: 'Završeno', at: '2026-11-09T11:00:00Z' }
    ] }],
    workRules: { hourlyCostRate: '15' }
  });
  assert.equal(result[0].hours, 6);
  assert.equal(result[0].amount, 90);
});
test('obračunava prijevoz tek nakon povratka prema ukupnoj kilometraži', () => {
  const result = buildOperationalCostRecords({
    orders: [{ id: 'RN-3' }],
    fieldJobs: [{ orderId: 'RN-3', status: 'Vraćeno', distanceKm: '42.5' }],
    workRules: { travelCostPerKm: '0.5' }
  });
  assert.equal(result[0].kilometers, 42.5);
  assert.equal(result[0].amount, 21.25);
});
test('ručni trošak kategorije Rad zamjenjuje automatski obračun rada bez dvostrukog zbrajanja', () => {
  const result = buildOperationalCostRecords({
    orders: [{ id: 'RN-4' }],
    productionRecords: { pieces: { 'RN-4::0::1': { stages: { Pilanje: { sessions: [
      { startedAt: '2026-11-09T08:00:00Z', endedAt: '2026-11-09T09:00:00Z' }
    ] } } } },
    existingCosts: [{ orderId: 'RN-4', kind: 'Stvarni trošak', categories: ['Rad'] }],
    workRules: { hourlyCostRate: '20' }
  });
  assert.deepEqual(result, []);
});
