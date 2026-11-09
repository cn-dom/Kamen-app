import test from 'node:test';
import assert from 'node:assert/strict';
import { appendInventoryMovements, applyFinishedProductStockAction, commitInventoryTransaction } from '../src/lib/inventoryLedger.js';

function memoryStorage(seed = {}) {
  const values = new Map(Object.entries(seed).map(([key, value]) => [key, JSON.stringify(value)]));
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    read: key => JSON.parse(values.get(key) || 'null')
  };
}

test('dnevnik čuva cijelu povijest i uklanja ponovljene događaje', () => {
  const old = Array.from({ length: 140 }, (_, index) => ({ id: 'old-' + index }));
  const next = appendInventoryMovements(old, [{ id: 'new', operationId: 'op-1' }, { id: 'new', operationId: 'op-1' }]);
  assert.equal(next.length, 141);
  assert.equal(next[0].id, 'new');
  assert.equal(next.filter(row => row.operationId === 'op-1').length, 1);
  const grouped = appendInventoryMovements([], [{ id: 'op-2:1', operationId: 'op-2' }, { id: 'op-2:2', operationId: 'op-2' }]);
  assert.equal(grouped.length, 2);
});

test('djelomična prodaja i ugradnja čuvaju preostalu zalihu', () => {
  const product = { id: 'p1', name: 'Klupica', quantity: 10, stockQuantity: 10, unit: 'kom', status: 'Na zalihi' };
  const sale = applyFinishedProductStockAction(product, { operationId: 'sale-1', kind: 'Prodaja', quantity: 3 });
  assert.equal(sale.product.stockQuantity, 7);
  const install = applyFinishedProductStockAction(sale.product, { operationId: 'install-1', kind: 'Ugradnja', quantity: 2 });
  assert.equal(install.product.stockQuantity, 5);
  assert.equal(install.product.soldQuantity, 3);
  assert.equal(install.product.installedQuantity, 2);
});

test('odbija izdavanje iznad zalihe i decimalne komade', () => {
  const product = { id: 'p1', quantity: 4, stockQuantity: 4, unit: 'kom', status: 'Na zalihi' };
  assert.match(applyFinishedProductStockAction(product, { operationId: 'bad-1', kind: 'Prodaja', quantity: 5 }).error, /dovoljno/i);
  assert.match(applyFinishedProductStockAction(product, { operationId: 'bad-2', kind: 'Ugradnja', quantity: 1.5 }).error, /cijeli broj/i);
});

test('povrat nakon zatvaranja vraća samo unesenu količinu i ponovno otvara proizvod', () => {
  const product = { id: 'p1', quantity: 2, stockQuantity: 0, unit: 'kom', status: 'Prodano', soldQuantity: 2 };
  const returned = applyFinishedProductStockAction(product, { operationId: 'return-1', kind: 'Povrat', quantity: 1, reason: 'Kupac vratio jedan komad' });
  assert.equal(returned.product.stockQuantity, 1);
  assert.equal(returned.product.status, 'Na zalihi');
  assert.equal(returned.product.soldQuantity, 2);
});

test('korekcije zahtijevaju razlog i ne dopuštaju negativnu zalihu', () => {
  const product = { id: 'p1', quantity: 2, stockQuantity: 2, unit: 'kom', status: 'Na zalihi' };
  assert.match(applyFinishedProductStockAction(product, { operationId: 'adj-1', kind: 'Korekcija +', quantity: 1 }).error, /razlog/i);
  assert.match(applyFinishedProductStockAction(product, { operationId: 'adj-2', kind: 'Korekcija −', quantity: 3, reason: 'Greška' }).error, /dovoljno/i);
});

test('ista skladišna operacija ne može dvaput proknjižiti promjene', () => {
  const storage = memoryStorage({ 'kamen-app-materials-v1': [{ id: 'm1', quantity: 2 }] });
  const operation = {
    operationId: 'issue-1',
    writes: [{ key: 'kamen-app-materials-v1', value: [{ id: 'm1', quantity: 1 }] }],
    movements: [{ id: 'issue-1', material: 'Impala', kind: 'Izdavanje', quantity: 1 }]
  };
  assert.equal(commitInventoryTransaction(storage, operation).duplicate, false);
  assert.equal(commitInventoryTransaction(storage, operation).duplicate, true);
  assert.equal(storage.read('kamen-app-materials-v1')[0].quantity, 1);
  assert.equal(storage.read('kamen-app-movements-v1').length, 1);
});

test('ako spremanje jednog dijela transakcije ne uspije, vraća sve prethodne zapise', () => {
  const storage = memoryStorage({ 'a': [{ id: 1 }], 'kamen-app-movements-v1': [] });
  const originalSet = storage.setItem;
  storage.setItem = (key, value) => {
    if (key === 'b') throw new Error('disk full');
    originalSet(key, value);
  };
  assert.throws(() => commitInventoryTransaction(storage, {
    operationId: 'rollback-1',
    writes: [{ key: 'a', value: [{ id: 2 }] }, { key: 'b', value: [] }],
    movements: [{ id: 'rollback-1', material: 'X', kind: 'Izdavanje', quantity: 1 }]
  }), /vraćeno/i);
  assert.deepEqual(storage.read('a'), [{ id: 1 }]);
  assert.equal(storage.read('kamen-app-movements-v1').length, 0);
});

test('ne prepisuje oštećen postojeći dnevnik kretanja', () => {
  const storage = memoryStorage();
  storage.setItem('kamen-app-movements-v1', '{broken');
  assert.throws(() => commitInventoryTransaction(storage, {
    operationId: 'corrupt-1',
    writes: [{ key: 'a', value: [1] }],
    movements: [{ id: 'corrupt-1', kind: 'Izdavanje' }]
  }), /nije valjan JSON/i);
  assert.equal(storage.getItem('a'), null);
});
