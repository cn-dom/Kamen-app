export const COMPANY_ROLES = [
  { id: 'owner', label: 'Vlasnik tvrtke', description: 'Puni pristup poslovanju i upravljanju članovima.' },
  { id: 'manager', label: 'Voditelj / poslovođa', description: 'Operativno upravljanje projektima i proizvodnjom.' },
  { id: 'warehouse', label: 'Skladištar', description: 'Skladišne količine, lokacije i kretanja.' },
  { id: 'worker', label: 'Radnik / monter', description: 'Samo dodijeljeni poslovi i radne upute.' },
  { id: 'finance', label: 'Financije', description: 'Financijski podaci prema dodijeljenim ovlastima.' },
];
export const PERMISSIONS = [
  { id:'projects.read', label:'Pregled projekata', group:'Projekti', defaults:['owner','manager','finance'] },
  { id:'projects.manage', label:'Izrada i uređivanje projekata', group:'Projekti', defaults:['owner','manager'] },
  { id:'production.update', label:'Ažuriranje proizvodnih faza', group:'Proizvodnja', defaults:['owner','manager','worker'] },
  { id:'warehouse.read', label:'Pregled količina i lokacija', group:'Skladište', defaults:['owner','manager','warehouse'] },
  { id:'warehouse.move', label:'Primitak, izdavanje i premještaj', group:'Skladište', defaults:['owner','warehouse'] },
  { id:'warehouse.writeoff.approve', label:'Odobravanje otpisa i korekcija', group:'Skladište', defaults:['owner'] },
  { id:'finance.costs.read', label:'Pregled troškova i nabavnih cijena', group:'Financije', defaults:['owner','finance'] },
  { id:'finance.margin.read', label:'Pregled prodajnih cijena i marži', group:'Financije', defaults:['owner','finance'] },
  { id:'finance.export', label:'Izvoz financijskih izvještaja', group:'Financije', defaults:['owner','finance'] },
  { id:'members.manage', label:'Upravljanje korisnicima i ulogama', group:'Administracija', defaults:['owner'] },
  { id:'audit.read', label:'Pregled povijesti promjena', group:'Administracija', defaults:['owner'] },
];
export function defaultPermissions(role) {
  return PERMISSIONS.filter(p => p.defaults.includes(role)).map(p => p.id);
}
export function can(role, permission, overrides = []) {
  if (role === 'owner') return true;
  return overrides.includes(permission) || defaultPermissions(role).includes(permission);
}
export function visibleNavForRole(role) {
  const all = ['Pregled','Pametni nadzor','Radni nalozi','Proizvodnja','Raspored','Nabava','Ponude','Isporuke i naplata','Servis i reklamacije','Održavanje strojeva','Skladište','Terenski rad','Kupci','Troškovi i izvještaji','Korisnici i ovlasti'];
  return all.filter(item => {
    if (item === 'Korisnici i ovlasti') return role === 'owner';
    if (item === 'Troškovi i izvještaji') return ['owner','finance'].includes(role);
    if (['Ponude','Isporuke i naplata','Nabava'].includes(item)) return ['owner','manager','finance'].includes(role);
    if (item === 'Kupci') return ['owner','manager','finance'].includes(role);
    return true;
  });
}
