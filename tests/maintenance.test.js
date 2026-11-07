import test from 'node:test';
import assert from 'node:assert/strict';
import { maintenanceCost, maintenanceDue, nextMaintenance } from '../src/lib/maintenance.js';
test('računa dijelove, rad i ostale troškove',()=>assert.equal(maintenanceCost({partsCost:120,laborHours:2,hourlyRate:35,otherCost:15}),205));
test('prepoznaje dospjelo održavanje po datumu i radnim satima',()=>{assert.equal(maintenanceDue({status:'U pogonu',intervalDays:30,lastServiceDate:'2026-09-01',intervalHours:0},'2026-10-01'),'Dospjelo');assert.equal(maintenanceDue({status:'U pogonu',intervalDays:0,intervalHours:100,lastServiceHours:200,hours:300},'2026-10-01'),'Dospjelo');});
test('označava servis koji uskoro dospijeva',()=>assert.equal(maintenanceDue({status:'U pogonu',intervalDays:90,lastServiceDate:'2026-08-01',intervalHours:0},'2026-10-20'),'Uskoro'));
test('računa sljedeći servis po kalendarskom i satnom intervalu',()=>assert.equal(nextMaintenance({intervalDays:30,lastServiceDate:'2026-10-01',intervalHours:100,lastServiceHours:250}),'2026-10-31 / na 350 h'));
