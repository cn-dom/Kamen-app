import test from 'node:test';
import assert from 'node:assert/strict';
import { resetDemoDataOnce } from '../src/lib/resetDemoData.js';

test('legacy startup cleanup is disabled and does not touch local business data', () => {
  const records = new Map([
    ['kamen-app-materials-v1', JSON.stringify([{ id: 'MAT-001', name: 'Impala', quantity: 2 }])],
    ['kamen-app-movements-v1', JSON.stringify([{ id: 1, material: 'Impala' }])],
    ['kamen-app-work-orders-v1', JSON.stringify([{ id: 'RN-2026-001' }])],
    ['kamen-app-customers-v1', JSON.stringify([{ id: 'K-001', name: 'Kupac' }])],
    ['kamen-app-production-stages-v1', JSON.stringify({ pieces: { one: {} } })]
  ]);
  let writes = 0;
  let removals = 0;
  const originalWindow = globalThis.window;
  globalThis.window = {
    localStorage: {
      getItem: key => records.get(key) ?? null,
      setItem: (key, value) => { writes += 1; records.set(key, value); },
      removeItem: key => { removals += 1; records.delete(key); }
    }
  };

  try {
    const before = [...records.entries()];
    const result = resetDemoDataOnce();
    assert.equal(result.status, 'disabled');
    assert.deepEqual([...records.entries()], before);
    assert.equal(writes, 0);
    assert.equal(removals, 0);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});
