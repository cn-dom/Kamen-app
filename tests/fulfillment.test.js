import test from 'node:test';
import assert from 'node:assert/strict';
import { paymentSummary, validatePayment, validateDelivery, deliveryQuantityRemaining } from '../src/lib/fulfillment.js';

test('računa djelomične i potpune uplate',()=>{
 assert.deepEqual(paymentSummary(500,[{amount:125},{amount:75}]),{total:500,paid:200,due:300,status:'Djelomično plaćeno'});
 assert.equal(paymentSummary(200,[{amount:200}]).status,'Plaćeno');
 assert.equal(paymentSummary(100,[]).status,'Neplaćeno');
});
test('ne dopušta uplatu veću od preostalog duga',()=>{
 assert.equal(validatePayment({quoteId:'q',date:'2026-11-07',amount:50},50),'');
 assert.match(validatePayment({quoteId:'q',date:'2026-11-07',amount:51},50),/veća/i);
});
test('provjerava podatke otpremnice',()=>{
 assert.equal(validateDelivery({quoteId:'q',date:'2026-11-07',items:[{description:'Ploča',quantity:1}]}),'');
 assert.match(validateDelivery({}),/ponudu/i);
 assert.match(validateDelivery({quoteId:'q',date:'2026-11-07',items:[{description:'Ploča',quantity:4,remaining:3}]}),/preostale količine/i);
 assert.equal(validateDelivery({quoteId:'q',date:'2026-11-07',items:[{description:'Ploča',quantity:2,remaining:3}]}),'');
});
test('računa preostalu količinu za isporuku',()=>{
 const line={id:'l1',quantity:8};
 assert.equal(deliveryQuantityRemaining(line,[{items:[{quoteLineId:'l1',quantity:3}]},{items:[{quoteLineId:'l1',quantity:2}]}]),3);
});
