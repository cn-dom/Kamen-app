import test from 'node:test';
import assert from 'node:assert/strict';
import { findFieldCrewConflicts, fieldJobInterval, normalizeFieldCrew, summarizeFieldWork } from '../src/lib/field-work.js';

test('normalizes modern crew arrays and legacy comma-separated team values', () => {
  assert.deepEqual(normalizeFieldCrew({ crew: [' Ana ', 'Ivan', 'Ana', ''] }), ['Ana', 'Ivan']);
  assert.deepEqual(normalizeFieldCrew({ team: 'Ana, Ivan; Marko' }), ['Ana', 'Ivan', 'Marko']);
});

test('validates field work intervals and rejects overnight or invalid ranges', () => {
  assert.deepEqual(fieldJobInterval({ date: '2026-11-08', startTime: '08:30', endTime: '12:00' }), {
    date: '2026-11-08', startMinutes: 510, endMinutes: 720
  });
  assert.equal(fieldJobInterval({ date: '2026-11-08', startTime: '16:00', endTime: '08:00' }), null);
  assert.equal(fieldJobInterval({ date: '2026-11-08', startTime: '25:00', endTime: '26:00' }), null);
});

test('detects overlapping assignments for shared crew members only', () => {
  const jobs = [
    { id: 'TR-1', date: '2026-11-08', startTime: '08:00', endTime: '12:00', crew: ['Ana', 'Ivan'], status: 'Planirano', project: 'Montaža A' },
    { id: 'TR-2', date: '2026-11-08', startTime: '12:00', endTime: '15:00', crew: ['Ana'], status: 'Planirano' },
    { id: 'TR-3', date: '2026-11-08', startTime: '09:00', endTime: '11:00', crew: ['Petar'], status: 'Planirano' },
    { id: 'TR-4', date: '2026-11-08', startTime: '09:00', endTime: '11:00', crew: ['Ana'], status: 'Završeno' }
  ];
  const conflicts = findFieldCrewConflicts(jobs, { date: '2026-11-08', startTime: '10:00', endTime: '13:00', crew: ['Ana'] });
  assert.deepEqual(conflicts.map(item => item.id), ['TR-1', 'TR-2']);
  assert.deepEqual(findFieldCrewConflicts(jobs, { date: '2026-11-08', startTime: '10:00', endTime: '13:00', crew: ['Ana'] }, 'TR-1').map(item => item.id), ['TR-2']);
});

test('summarizes active, today, unassigned and overdue field jobs', () => {
  const jobs = [
    { id: '1', date: '2026-11-07', status: 'Planirano', crew: ['Ana'] },
    { id: '2', date: '2026-11-08', status: 'Na putu', crew: [] },
    { id: '3', date: '2026-11-08', status: 'Završeno', crew: ['Ivan'] }
  ];
  assert.deepEqual(summarizeFieldWork(jobs, '2026-11-08'), { total: 3, active: 2, today: 1, unassigned: 1, overdue: 1 });
});

test('validira obvezne podatke, vremenski raspon i članove ekipe', () => {
  assert.match(validateFieldJob({project:'P',location:'Groblje',date:'2026-11-10',crew:['Ivan']}), /kupca/);
  assert.match(validateFieldJob({customer:'K',project:'P',location:'Groblje',date:'2026-11-10',startTime:'12:00',endTime:'08:00',crew:['Ivan']}), /nakon početka/);
  assert.match(validateFieldJob({customer:'K',project:'P',location:'Groblje',date:'2026-11-10',crew:[]}), /barem jednog člana/);
});
test('odbija terenski termin odsutnom članu ekipe', () => {
  assert.match(validateFieldJob({customer:'K',project:'P',location:'Groblje',date:'2026-11-10',crew:['Ivan']}, [], {attendance:{date:'2026-11-10',statuses:{Ivan:'Odsutan'}}}), /nije dostupan/);
});
test('odbija terenski termin radniku već dodijeljenom radionici', () => {
  assert.match(validateFieldJob({customer:'K',project:'P',location:'Groblje',date:'2026-11-10',crew:['Ivan']}, [], {deployment:{date:'2026-11-10',assignments:{Ivan:{area:'Radionica'}}}}), /već raspoređen/);
});
test('čuva kronološku povijest događaja', () => {
  const job={events:[{id:'old',type:'Nalog kreiran',at:'2026-11-09T08:00:00Z'}]};
  const next=appendFieldEvent(job,'Na putu','2026-11-09T09:00:00Z');
  assert.equal(next.events.length,2);
  assert.equal(next.events[1].type,'Na putu');
});
