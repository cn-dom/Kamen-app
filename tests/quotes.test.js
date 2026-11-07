import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateQuote, validateQuote } from '../src/lib/quotes.js';

test('obračunava ponudu s različitim stopama PDV-a',()=>{
 const result=calculateQuote([{description:'Kamen',quantity:2,unitPrice:100,vatRate:25},{description:'Montaža',quantity:1,unitPrice:50,vatRate:13}],0);
 assert.equal(result.net,250);assert.equal(result.vat,56.5);assert.equal(result.gross,306.5);
});
test('popust umanjuje osnovicu prije obračuna PDV-a',()=>{
 const result=calculateQuote([{quantity:2,unitPrice:100,vatRate:25}],10);
 assert.equal(result.discountAmount,20);assert.equal(result.net,180);assert.equal(result.vat,45);assert.equal(result.gross,225);
});
test('validacija traži kupca, rok i valjane stavke',()=>{
 assert.equal(validateQuote({customerName:'Kupac',validUntil:'2026-12-01',items:[{description:'Rad',quantity:1,unitPrice:10,vatRate:25}]}),'');
 assert.match(validateQuote({}),/kupca/i);
 assert.match(validateQuote({customerName:'Kupac',validUntil:'2026-12-01',items:[{description:'',quantity:1,unitPrice:10,vatRate:25}]}),/opis/i);
 assert.match(validateQuote({customerName:'Kupac',validUntil:'2026-12-01',items:[{description:'Rad',quantity:0,unitPrice:10,vatRate:25}]}),/količinu/i);
});
