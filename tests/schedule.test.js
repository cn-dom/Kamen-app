import test from 'node:test';
import assert from 'node:assert/strict';
import { findScheduleConflict, scheduleIntervalsOverlap, scheduleDurationHours, validateWorkerSchedule } from '../src/lib/schedule.js';

const base = [
  { id:'a', start:'2026-11-09T08:00:00.000Z', end:'2026-11-09T10:00:00.000Z', worker:'Ivan', machine:'Mostna pila', status:'Planirano' },
  { id:'b', start:'2026-11-09T10:00:00.000Z', end:'2026-11-09T12:00:00.000Z', worker:'Marko', machine:'Kanterica', status:'Planirano' },
  { id:'c', start:'2026-11-09T08:30:00.000Z', end:'2026-11-09T09:30:00.000Z', worker:'Ivan', machine:'Polirka', status:'Otkazano' }
];

test('prepoznaje preklapanje termina, ali dopušta dodirne termine',()=>{
  assert.equal(scheduleIntervalsOverlap('2026-11-09T09:00:00Z','2026-11-09T11:00:00Z',base[0].start,base[0].end),true);
  assert.equal(scheduleIntervalsOverlap('2026-11-09T10:00:00Z','2026-11-09T11:00:00Z',base[0].start,base[0].end),false);
});

test('sprječava dvostruku dodjelu istog radnika ili stroja',()=>{
  assert.equal(findScheduleConflict(base,{start:'2026-11-09T09:00:00Z',end:'2026-11-09T09:45:00Z',worker:'Ivan',machine:'CNC'}).id,'a');
  assert.equal(findScheduleConflict(base,{start:'2026-11-09T10:30:00Z',end:'2026-11-09T11:30:00Z',worker:'Ana',machine:'Kanterica'}).id,'b');
});

test('zanemaruje otkazane termine i vlastiti zapis pri uređivanju',()=>{
  assert.equal(findScheduleConflict(base,{start:'2026-11-09T08:45:00Z',end:'2026-11-09T09:15:00Z',worker:'Ivan',machine:'Polirka'},'a'),null);
  assert.equal(findScheduleConflict(base,{start:'2026-11-09T08:45:00Z',end:'2026-11-09T09:15:00Z',worker:'Ivan',machine:'Polirka'},'c').id,'a');
});

test('računa planirano trajanje u satima i štiti od negativnog trajanja',()=>{
  assert.equal(scheduleDurationHours('2026-11-09T08:00:00Z','2026-11-09T10:30:00Z'),2.5);
  assert.equal(scheduleDurationHours('2026-11-09T10:00:00Z','2026-11-09T09:00:00Z'),0);
});

test('odbija dodjelu radniku bez vještine za odabranu fazu',()=>{
 assert.match(validateWorkerSchedule({worker:'Ivan',stage:'Pilanje',start:'2026-11-10T08:00',end:'2026-11-10T10:00',workerSkills:{Ivan:['Poliranje']}}),/nema evidentiranu vještinu/);
});
test('dopušta radniku fazu za koju ima evidentiranu vještinu',()=>{
 assert.equal(validateWorkerSchedule({worker:'Ivan',stage:'Pilanje',start:'2026-11-10T08:00',end:'2026-11-10T10:00',workerSkills:{Ivan:['Pilanje']}}),'');
});
test('odbija odsutnog radnika i radnika izvan smjene',()=>{
 assert.match(validateWorkerSchedule({worker:'Ivan',stage:'Pilanje',start:'2026-11-10T08:00',end:'2026-11-10T10:00',attendance:{date:'2026-11-10',statuses:{Ivan:'Odsutan'}}}),/odsutan/);
 assert.match(validateWorkerSchedule({worker:'Ivan',stage:'Pilanje',start:'2026-11-10T08:00',end:'2026-11-10T10:00',attendance:{date:'2026-11-10',statuses:{Ivan:'Izvan smjene'}}}),/izvan smjene/);
});
test('upozorava kada je radnik raspoređen na teren, a planira se radionica',()=>{
 assert.match(validateWorkerSchedule({worker:'Ivan',stage:'Poliranje',start:'2026-11-10T08:00',end:'2026-11-10T10:00',deployment:{date:'2026-11-10',assignments:{Ivan:{area:'Teren'}}}}),/već raspoređen na teren/);
});
test('traži odvojene termine za različite radne dane',()=>{
 assert.match(validateWorkerSchedule({worker:'Ivan',stage:'Pilanje',start:'2026-11-10T08:00',end:'2026-11-11T10:00'}),/istog radnog dana/);
});
