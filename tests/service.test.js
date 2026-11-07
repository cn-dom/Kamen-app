import test from 'node:test';
import assert from 'node:assert/strict';
import { serviceCost, validateService, addServiceEvent, isServiceOverdue } from '../src/lib/service.js';

const valid = { customerName:'Kamen kupac', title:'Napuknuta klupica', reportedAt:'2026-11-07', type:'Reklamacija', status:'Zaprimljeno' };

test('zbraja dijelove, rad, put i ostale troškove', () => {
  assert.deepEqual(serviceCost({ partsCost:45, laborHours:2.5, hourlyRate:30, travelCost:12, otherCost:3 }), { parts:45, labor:75, travel:12, other:3, total:135 });
});

test('provjerava obvezne podatke i datume', () => {
  assert.equal(validateService(valid), '');
  assert.match(validateService({ ...valid, customerName:'' }), /kupca/i);
  assert.match(validateService({ ...valid, dueDate:'2026-11-06' }), /Rok/i);
});

test('dodaje neizbrisiv događaj u povijest naloga', () => {
  const next = addServiceEvent(valid, { action:'Status promijenjen', note:'U radu' }, '2026-11-07T10:00:00.000Z');
  assert.equal(next.history.length, 1);
  assert.equal(next.history[0].note, 'U radu');
  assert.equal(valid.history, undefined);
});

test('prepoznaje dospjele otvorene naloge, ali ne i završene', () => {
  assert.equal(isServiceOverdue({ ...valid, dueDate:'2026-11-06' }, '2026-11-07'), true);
  assert.equal(isServiceOverdue({ ...valid, dueDate:'2026-11-06', status:'Završeno' }, '2026-11-07'), false);
});
