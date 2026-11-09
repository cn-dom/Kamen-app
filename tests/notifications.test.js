import test from 'node:test';
import assert from 'node:assert/strict';
import {buildOperationalNotifications} from '../src/lib/notifications.js';
test('stvara upozorenja za zakašnjeli rok, blokadu, nisku zalihu i zakašnjeli alat',()=>{
 const rows=buildOperationalNotifications({today:'2026-11-09',
  orders:[{id:'RN1',title:'Spomenik',status:'Zastoj',deadline:'2026-11-08'}],
  inventory:[{id:'M1',name:'Impala',quantity:2,minimumQuantity:4,unit:'m²'}],
  tools:[{id:'A1',name:'Bušilica',status:'Zadužen',currentIssueId:'I1'}],
  toolEvents:[{id:'I1',dueDate:'2026-11-07',person:'Ivan'}]});
 assert.deepEqual(rows.map(x=>x.type),['blocked','deadline','stock','tool']);
});
test('ne upozorava na dovršene poslove niti na zalihu iznad minimuma',()=>{
 const rows=buildOperationalNotifications({today:'2026-11-09',orders:[{id:'RN1',status:'Završen',deadline:'2026-11-01'}],inventory:[{id:'M1',quantity:8,minimumQuantity:4}]});
 assert.equal(rows.length,0);
});
test('prepoznaje skori rok, zastoj proizvodne faze i današnji teren',()=>{
 const rows=buildOperationalNotifications({today:'2026-11-09',orders:[{id:'RN2',title:'Vaza',status:'U tijeku',deadline:'2026-11-11'}],productionData:{pieces:{'RN2-1':{stages:{Pilanje:{status:'Zastoj'}}}}},fieldWork:[{id:'T1',project:'Montaža',status:'Planirano',date:'2026-11-09',location:'Groblje'}]});
 assert.deepEqual(rows.map(x=>x.type),['deadline','blocked','field']);
});

test('prikazuje naziv stroja i ispravno označava zakašnjeli servis',()=>{
 const rows=buildOperationalNotifications({today:'2026-11-09',machines:[
  {id:'S1',name:'Mostna pila',nextServiceDate:'2026-11-08',status:'U pogonu'},
  {id:'S2',name:'Polirka',nextServiceDate:'2026-11-12',status:'U pogonu'},
  {id:'S3',name:'Stari stroj',nextServiceDate:'2026-11-01',status:'Otpisan'}
 ]});
 assert.equal(rows.length,2);
 assert.equal(rows[0].title,'Kasni održavanje: Mostna pila');
 assert.equal(rows[0].severity,'high');
 assert.equal(rows[1].title,'Uskoro održavanje: Polirka');
 assert.equal(rows[1].severity,'warning');
});
