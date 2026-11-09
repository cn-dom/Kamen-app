import test from 'node:test';
import assert from 'node:assert/strict';
import { can, defaultPermissions, visibleNavForRole, COMPANY_ROLES } from '../src/lib/accessControl.js';

test('definira svih pet poslovnih uloga',()=>assert.deepEqual(COMPANY_ROLES.map(r=>r.id),['owner','manager','warehouse','worker','finance']));
test('vlasnik ima sva dopuštenja',()=>assert.equal(can('owner','finance.margin.read'),true));
test('radnik nema financijski pristup po zadanim postavkama',()=>{assert.equal(can('worker','finance.costs.read'),false);assert.equal(can('worker','finance.margin.read'),false)});
test('skladištar može voditi kretanja ali ne odobriti vlastiti otpis',()=>{assert.equal(can('warehouse','warehouse.move'),true);assert.equal(can('warehouse','warehouse.writeoff.approve'),false)});
test('voditelj nema automatski pristup marži',()=>assert.equal(can('manager','finance.margin.read'),false));
test('dodatna ovlast može proširiti prava ne-vlasničke uloge',()=>assert.equal(can('manager','finance.costs.read',['finance.costs.read']),true));
test('radnik ne vidi financije ni upravljanje članovima u navigaciji',()=>{const nav=visibleNavForRole('worker');assert.equal(nav.includes('Troškovi i izvještaji'),false);assert.equal(nav.includes('Korisnici i ovlasti'),false)});
test('financijska uloga vidi financijski modul ali ne upravljanje članovima',()=>{const nav=visibleNavForRole('finance');assert.equal(nav.includes('Troškovi i izvještaji'),true);assert.equal(nav.includes('Korisnici i ovlasti'),false)});
