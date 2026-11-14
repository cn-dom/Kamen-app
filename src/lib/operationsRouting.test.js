import test from 'node:test';
import assert from 'node:assert/strict';
import { getPieceProductionRouting, applyPieceProductionRouting } from './operationsRouting.js';

test('spomenik s oblinama, lepezom i okapnicom dobiva samo potrebne faze', () => {
  const route = getPieceProductionRouting({ productType: 'Spomenik', processing: { monumentShape: 'obline', includesFan: true, dripEdge: true } });
  assert.deepEqual(route.requiredStages, ['Pilanje', 'Kanterica / obrada rubova', 'Poliranje šmusa i okapnica', 'Ručna obrada']);
  assert.deepEqual(route.operations, ['Ručna obrada lepeze']);
});

test('ravni spomenik bez dodatne obrade ne dobiva kantericu ni ručnu obradu', () => {
  const route = getPieceProductionRouting({ productType: 'Spomenik', processing: { monumentShape: 'ravno', includesFan: false, dripEdge: false } });
  assert.deepEqual(route.requiredStages, ['Pilanje', 'Ravno poliranje']);
});

test('poklopnica razlikuje brušenje lijeve, desne, obje ili nijedne glave', () => {
  for (const [headGrinding, expected] of [['left','Brušenje lijeve glave poklopnice'],['right','Brušenje desne glave poklopnice'],['both','Brušenje obje glave poklopnice']]) {
    const route = getPieceProductionRouting({ productType: 'Poklopnica', processing: { headGrinding } });
    assert.ok(route.requiredStages.includes('Ručna obrada'));
    assert.deepEqual(route.operations, [expected]);
  }
  const none = getPieceProductionRouting({ productType: 'Poklopnica', processing: { headGrinding: 'none' } });
  assert.deepEqual(none.requiredStages, ['Pilanje']);
});

test('namjena klupice ostaje spremljena kao podatak za raspored obrade', () => {
  assert.equal(getPieceProductionRouting({ productType: 'Klupica', processing: { benchUse: 'unutarnja' } }).details, 'Unutarnja klupica');
  assert.equal(getPieceProductionRouting({ productType: 'Klupica', processing: { benchUse: 'vanjska' } }).details, 'Vanjska klupica');
});

test('označava nepotrebne faze i čuva faze koje proizvod zahtijeva', () => {
  const record = { stages: {
    'Pilanje': { status: 'Nije započeto' },
    'Kanterica / obrada rubova': { status: 'Nije započeto' },
    'Ravno poliranje': { status: 'Nije započeto' },
    'Ručna obrada': { status: 'Nije započeto' }
  } };
  const routed = applyPieceProductionRouting(record, { productType: 'Spomenik', processing: { monumentShape: 'ravno', includesFan: false } });
  assert.equal(routed.stages['Pilanje'].status, 'Nije započeto');
  assert.equal(routed.stages['Ravno poliranje'].status, 'Nije započeto');
  assert.equal(routed.stages['Kanterica / obrada rubova'].status, 'Nije potrebno');
  assert.equal(routed.stages['Ručna obrada'].status, 'Nije potrebno');
});
