import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePurchaseLine, purchaseOrderTotals, materialCostPerM2, receivePurchaseLine } from '../src/lib/purchasing.js';

test('izračunava neto, PDV i bruto iz količine i cijene jedinice',()=>{
 assert.deepEqual(calculatePurchaseLine({quantity:3,unitPrice:120,vatRate:25}),{net:360,vat:90,gross:450});
});
test('zbraja više stavki narudžbe',()=>{
 assert.deepEqual(purchaseOrderTotals([{quantity:2,unitPrice:50,vatRate:25},{quantity:1,unitPrice:100,vatRate:0}]),{net:200,vat:25,gross:225});
});
test('preračunava nabavnu cijenu ploče na €/m²',()=>{
 assert.equal(materialCostPerM2({unit:'ploča',unitPrice:240,length:300,width:200}),40);
 assert.equal(materialCostPerM2({unit:'m²',unitPrice:37.5}),37.5);
 assert.equal(materialCostPerM2({unit:'kom',unitPrice:20}),null);
});
test('djelomično zaprimanje ažurira zaprimljenu količinu',()=>{
 assert.deepEqual(receivePurchaseLine({orderedQty:10,receivedQty:2},3),{orderedQty:10,receivedQty:5});
 assert.throws(()=>receivePurchaseLine({orderedQty:10,receivedQty:8},3),RangeError);
 assert.throws(()=>receivePurchaseLine({orderedQty:10,receivedQty:2},-1),RangeError);
});
