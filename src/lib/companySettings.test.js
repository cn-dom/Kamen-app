import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_COMPANY_SETTINGS,
  normalizeCompanySettings,
  validateCompanyProfile,
  validateCompanyWorkRules,
  calculateNetShiftMinutes
} from './companySettings.js';

test('normalizes company settings and removes duplicate list entries', () => {
  const value = normalizeCompanySettings({ locations: ['Stalak A', 'Stalak A', ''], units: ['m²'], workRules: { breakMinutes: '45' } });
  assert.deepEqual(value.locations, ['Stalak A']);
  assert.deepEqual(value.units, ['m²']);
  assert.equal(value.materialTypes.length, DEFAULT_COMPANY_SETTINGS.materialTypes.length);
  assert.equal(value.workRules.breakMinutes, '45');
});

test('uses safe defaults when company settings are missing or malformed', () => {
  const value = normalizeCompanySettings({ locations: 'not-an-array', workRules: null });
  assert.deepEqual(value.locations, DEFAULT_COMPANY_SETTINGS.locations);
  assert.equal(value.workRules.workStart, '07:00');
  assert.equal(value.workRules.requireWriteoffReason, true);
});

test('accepts an optional OIB and validates a supplied OIB', () => {
  assert.equal(validateCompanyProfile({ name: 'Kamen' }), '');
  assert.equal(validateCompanyProfile({ oib: '12345678901' }), '');
  assert.match(validateCompanyProfile({ oib: '12345' }), /11 znamenki/);
});

test('validates company email when provided', () => {
  assert.equal(validateCompanyProfile({ email: 'radionica@example.hr' }), '');
  assert.match(validateCompanyProfile({ email: 'nije-email' }), /e-mail/);
});

test('validates shift order, break duration and cost rates', () => {
  assert.equal(validateCompanyWorkRules(DEFAULT_COMPANY_SETTINGS.workRules), '');
  assert.match(validateCompanyWorkRules({ ...DEFAULT_COMPANY_SETTINGS.workRules, workEnd: '06:00' }), /Završetak smjene/);
  assert.match(validateCompanyWorkRules({ ...DEFAULT_COMPANY_SETTINGS.workRules, breakMinutes: '500' }), /pauze/);
  assert.match(validateCompanyWorkRules({ ...DEFAULT_COMPANY_SETTINGS.workRules, hourlyCostRate: '-1' }), /negativne/);
  assert.match(validateCompanyWorkRules({ ...DEFAULT_COMPANY_SETTINGS.workRules, overtimeMultiplier: '4' }), /između 1 i 3/);
});

test('calculates net shift minutes after the break', () => {
  assert.equal(calculateNetShiftMinutes(DEFAULT_COMPANY_SETTINGS.workRules), 450);
  assert.equal(calculateNetShiftMinutes({ workStart: '08:00', workEnd: '12:00', breakMinutes: '15' }), 225);
});
