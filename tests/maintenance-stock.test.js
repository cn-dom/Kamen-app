import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareSparePartIssue, sparePartReorderSuggestions } from '../src/lib/maintenance.js';

test('izdavanje dijelova umanjuje zalihu i stvara skladišno kretanje s referencom',()=>{
 const materials=[{id:'M1',name:'Rezni disk',quantity:10,unit:'kom',location:'Polica A'},{id:'M2',name:'Ulje',quantity:4,unit:'l'}];
 const result=prepareSparePartIssue(materials,[{materialId:'M1',quantity:'2'},{materialId:'M2',quantity:'1.5'}],{id:'ODR-1'},1000);
 assert.equal(result.ok,true);
 assert.equal(result.materials.find(x=>x.id==='M1').quantity,8);
 assert.equal(result.materials.find(x=>x.id==='M2').quantity,2.5);
 assert.equal(result.movements.length,2);
 assert.equal(result.movements[0].kind,'Izdavanje - održavanje');
 assert.equal(result.movements[0].referenceId,'ODR-1');
 assert.equal(result.movements[0].reason,'Servisni nalog ODR-1');
});
test('ne dopušta izdavanje veće količine od raspoložive zalihe',()=>{
 const result=prepareSparePartIssue([{id:'M1',name:'Ležaj',quantity:1,unit:'kom'}],[{materialId:'M1',quantity:2}],{id:'ODR-2'},2000);
 assert.equal(result.ok,false);
 assert.match(result.error,/Nema dovoljno zalihe/);
});
test('odbija neispravne količine i ne mijenja izvorne podatke',()=>{
 const materials=[{id:'M1',name:'Pasta',quantity:5,unit:'kg'}];
 const result=prepareSparePartIssue(materials,[{materialId:'M1',quantity:'0.001'}],{id:'ODR-3'},3000);
 assert.equal(result.ok,false);
 assert.equal(materials[0].quantity,5);
});
test('ne dopušta izdavanje arhiviranog ili nepostojećeg artikla',()=>{
 const result=prepareSparePartIssue([{id:'M1',name:'Stari disk',quantity:3,archived:true}],[{materialId:'M1',quantity:1}],{id:'ODR-4'},4000);
 assert.equal(result.ok,false);
 assert.match(result.error,/više nije dostupan/);
});



test('prijedlog nabave pojavljuje se samo za označene rezervne dijelove ispod minimuma',()=>{
 const result=sparePartReorderSuggestions([
  {id:'A',name:'Ležaj',isSparePart:true,quantity:1,min:2,unit:'kom',location:'Polica A'},
  {id:'B',name:'Rezni disk',isSparePart:true,quantity:5,min:2,unit:'kom'},
  {id:'C',name:'Granit',isSparePart:false,quantity:0,min:3,unit:'ploča'},
  {id:'D',name:'Filter',isSparePart:true,quantity:0,min:1,unit:'kom',reorderTo:4}
 ]);
 assert.equal(result.length,2);
 assert.equal(result[0].name,'Filter');
 assert.equal(result[0].severity,'high');
 assert.equal(result[0].suggestedQuantity,4);
 assert.equal(result[1].name,'Ležaj');
 assert.equal(result[1].suggestedQuantity,3);
 assert.equal(result[1].location,'Polica A');
});

test('ciljna zaliha može biti posebno podešena, a arhivirani dijelovi se ignoriraju',()=>{
 const result=sparePartReorderSuggestions([
  {id:'A',name:'Ulje',isSparePart:true,quantity:2,min:3,reorderTo:8,unit:'l'},
  {id:'B',name:'Stari dio',isSparePart:true,quantity:0,min:3,archived:true}
 ]);
 assert.equal(result.length,1);
 assert.equal(result[0].target,8);
 assert.equal(result[0].suggestedQuantity,6);
});
