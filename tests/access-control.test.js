import test from 'node:test';
import assert from 'node:assert/strict';
import {ACCESS_PERMISSIONS,defaultOwnerMember,getMemberPermissions,memberCan,normalizeTeamMembers} from '../src/lib/access-control.js';

test('owner receives all configured permissions',()=>{const owner=defaultOwnerMember();assert.equal(getMemberPermissions(owner).length,ACCESS_PERMISSIONS.length);assert.equal(memberCan(owner,'team.manage'),true)});
test('worker has own-work access but no financial or team permissions by default',()=>{const worker={id:'w1',name:'Radnik',role:'worker',active:true};assert.equal(memberCan(worker,'production.time'),true);assert.equal(memberCan(worker,'finance.costs'),false);assert.equal(memberCan(worker,'finance.sales'),false);assert.equal(memberCan(worker,'team.manage'),false)});
test('warehouse can propose but cannot approve its own write-off',()=>{const storekeeper={id:'s1',name:'Skladištar',role:'warehouse',active:true};assert.equal(memberCan(storekeeper,'warehouse.writeoff'),true);assert.equal(memberCan(storekeeper,'warehouse.approve'),false)});
test('inactive members have no effective permissions',()=>{const manager={id:'m1',name:'Voditelj',role:'manager',active:false};assert.deepEqual(getMemberPermissions(manager),[])});
test('custom overrides grant or revoke only known permissions',()=>{const worker={id:'w1',name:'Radnik',role:'worker',active:true,overrides:{'finance.costs':true,'unknown.permission':true}};assert.equal(memberCan(worker,'finance.costs'),true);assert.equal(memberCan(worker,'unknown.permission'),false)});
test('normalization preserves one active local owner profile',()=>{const members=normalizeTeamMembers([{id:'x',name:'Član',role:'worker',active:true}]);assert.equal(members.some(item=>item.role==='owner'&&item.active),true)});
