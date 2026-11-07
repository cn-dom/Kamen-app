import test from 'node:test';
import assert from 'node:assert/strict';
import { maintenanceCost, maintenanceDue, nextMaintenance, dashboardOperationalAlerts } from '../src/lib/maintenance.js';
test('računa dijelove, rad i ostale troškove',()=>assert.equal(maintenanceCost({partsCost:120,laborHours:2,hourlyRate:35,otherCost:15}),205));
test('prepoznaje dospjelo održavanje po datumu i radnim satima',()=>{assert.equal(maintenanceDue({status:'U pogonu',intervalDays:30,lastServiceDate:'2026-09-01',intervalHours:0},'2026-10-01'),'Dospjelo');assert.equal(maintenanceDue({status:'U pogonu',intervalDays:0,intervalHours:100,lastServiceHours:200,hours:300},'2026-10-01'),'Dospjelo');});
test('označava servis koji uskoro dospijeva',()=>assert.equal(maintenanceDue({status:'U pogonu',intervalDays:90,lastServiceDate:'2026-08-01',intervalHours:0},'2026-10-20'),'Uskoro'));
test('računa sljedeći servis po kalendarskom i satnom intervalu',()=>assert.equal(nextMaintenance({intervalDays:30,lastServiceDate:'2026-10-01',intervalHours:100,lastServiceHours:250}),'2026-10-31 / na 350 h'));

test('objedinjuje dospjele servise i rokove aktivnih naloga',()=>{
 const alerts=dashboardOperationalAlerts(
  [{id:'m1',name:'Mostna pila',status:'U pogonu',intervalDays:30,lastServiceDate:'2026-09-01',intervalHours:0}],
  [{id:'RN-1',project:'Spomenik',due:'2026-10-28',status:'U tijeku'},{id:'RN-2',project:'Gotov nalog',due:'2026-10-28',status:'Završen'},{id:'RN-3',project:'Kasniji rok',due:'2026-11-10',status:'U tijeku'}],
  '2026-11-01'
 );
 assert.equal(alerts.length,2);
 assert.equal(alerts[0].type,'maintenance');
 assert.equal(alerts[1].type,'order');
 assert.equal(alerts[1].severity,'high');
});
test('upozorava na rok danas i u sljedeća tri dana, ali ignorira neispravne datume',()=>{
 const alerts=dashboardOperationalAlerts([],[
  {id:'a',project:'Danas',due:'2026-11-07',status:'U tijeku'},
  {id:'b',project:'Uskoro',due:'2026-11-10',status:'U pripremi'},
  {id:'c',project:'Daleko',due:'2026-11-11',status:'U tijeku'},
  {id:'d',project:'Neispravno',due:'Danas',status:'U tijeku'}
 ],'2026-11-07');
 assert.equal(alerts.length,2);
 assert.equal(alerts[0].description,'Rok je danas.');
});
