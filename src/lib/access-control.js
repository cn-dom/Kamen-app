export const ACCESS_ROLES = {
 owner:{label:'Vlasnik tvrtke',description:'Upravlja svim podacima i ovlastima svoje tvrtke.'},
 manager:{label:'Voditelj / poslovođa',description:'Vodi projekte, proizvodnju, raspored i kvalitetu.'},
 warehouse:{label:'Skladištar',description:'Vodi primitke, izdavanja, premještaje i inventuru.'},
 worker:{label:'Radnik / monter',description:'Vidi dodijeljene poslove i evidentira svoj rad.'},
 finance:{label:'Financije',description:'Vidi financijske zapise i izvještaje prema dodijeljenoj ulozi.'}
};
export const ACCESS_PERMISSIONS=[
 {key:'projects.view',label:'Pregled projekata',group:'Projekti'},
 {key:'projects.edit',label:'Izrada i uređivanje projekata',group:'Projekti'},
 {key:'production.manage',label:'Proizvodnja i raspored',group:'Radionica'},
 {key:'production.time',label:'Evidencija vlastitog rada',group:'Radionica'},
 {key:'warehouse.view',label:'Pregled količina i lokacija',group:'Skladište'},
 {key:'warehouse.edit',label:'Primitak, izdavanje i premještaj',group:'Skladište'},
 {key:'warehouse.writeoff',label:'Predlaganje otpisa',group:'Skladište'},
 {key:'warehouse.approve',label:'Odobravanje otpisa i korekcija',group:'Skladište'},
 {key:'finance.costs',label:'Troškovi i nabavne cijene',group:'Financije'},
 {key:'finance.sales',label:'Prodajne cijene i marže',group:'Financije'},
 {key:'finance.reports',label:'Financijski izvještaji i izvoz',group:'Financije'},
 {key:'team.manage',label:'Upravljanje korisnicima i ulogama',group:'Administracija'},
 {key:'audit.view',label:'Pregled povijesti promjena',group:'Administracija'}
];
const ROLE_DEFAULTS={
 owner:ACCESS_PERMISSIONS.map(item=>item.key),
 manager:['projects.view','projects.edit','production.manage','production.time','warehouse.view','audit.view'],
 warehouse:['warehouse.view','warehouse.edit','warehouse.writeoff'],
 worker:['production.time'],
 finance:['projects.view','finance.costs','finance.sales','finance.reports','audit.view']
};
export function defaultOwnerMember(){return {id:'local-owner',name:'Vlasnik računa',email:'',role:'owner',active:true,overrides:{},isLocalProfile:true,createdAt:'2026-11-09T00:00:00.000Z'};}
export function getMemberPermissions(member){
 if(!member||!member.active||!ACCESS_ROLES[member.role])return [];
 const result=new Set(ROLE_DEFAULTS[member.role]);
 for(const [key,allowed] of Object.entries(member.overrides||{})){
  if(!ACCESS_PERMISSIONS.some(item=>item.key===key))continue;
  if(allowed)result.add(key);else result.delete(key);
 }
 return [...result];
}
export function memberCan(member,permission){return getMemberPermissions(member).includes(permission);}
export function createAccessAuditEntry({action,actor='Lokalni administrator',targetId='',details=''},now=new Date()){
 return {id:'ACL-'+now.getTime()+'-'+Math.random().toString(36).slice(2,8),action,actor,targetId,details,createdAt:now.toISOString()};
}
export function normalizeTeamMembers(value){
 if(!Array.isArray(value))return [defaultOwnerMember()];
 const members=value.filter(item=>item&&typeof item.id==='string'&&typeof item.name==='string'&&ACCESS_ROLES[item.role])
 .map(item=>({...item,active:item.active!==false,overrides:item.overrides&&typeof item.overrides==='object'?item.overrides:{}}));
 return members.some(item=>item.role==='owner'&&item.active)?members:[defaultOwnerMember(),...members.filter(item=>item.id!=='local-owner')];
}
