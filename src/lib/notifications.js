export function buildOperationalNotifications({orders=[],inventory=[],tools=[],toolEvents=[],machines=[],productionData={},fieldWork=[],today=new Date().toISOString().slice(0,10)}={}){
 const addDays=(date,n)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};
 const out=[],push=(id,type,title,description,destination,severity='warning')=>out.push({id,type,title,description,destination,severity});
 for(const o of orders){const status=o.status||o.stage||'',due=o.dueDate||o.deadline||o.deliveryDate||o.date;
  if(['Zastoj','Blokirano','Blokiran'].includes(status))push('order-block-'+o.id,'blocked','Blokiran posao: '+(o.title||o.project||o.id),o.customer||'Potrebna je provjera razloga blokade.','Radni nalozi','high');
  if(due&&/^\d{4}-\d{2}-\d{2}$/.test(due)&&!['Završen','Otkazan','Isporučen'].includes(status)&&due<today)push('order-late-'+o.id,'deadline','Zakašnjeli rok: '+(o.title||o.project||o.id),'Rok '+due+' · '+(o.customer||'Kupac nije naveden'),'Radni nalozi','high');
  else if(due&&/^\d{4}-\d{2}-\d{2}$/.test(due)&&!['Završen','Otkazan','Isporučen'].includes(status)&&due>=today&&due<=addDays(today,3))push('order-soon-'+o.id,'deadline','Rok se približava: '+(o.title||o.project||o.id),'Rok '+due+' · '+(o.customer||'Kupac nije naveden'),'Radni nalozi','warning');
 }
 inventory.filter(x=>!x.archived&&Number(x.minimumQuantity)>0&&Number(x.quantity??x.currentQuantity??0)<=Number(x.minimumQuantity)).forEach(x=>push('stock-'+x.id,'stock','Niska zaliha: '+(x.name||'Materijal'),'Stanje '+(x.quantity??x.currentQuantity)+' '+(x.unit||'kom')+' · minimum '+x.minimumQuantity+' '+(x.unit||'kom'),'Nabava','high'));
 tools.filter(t=>t.status==='Zadužen').forEach(t=>{const ev=toolEvents.find(x=>x.id===t.currentIssueId&&!x.returnedAt);if(ev?.dueDate&&ev.dueDate<today)push('tool-late-'+t.id,'tool','Zakašnjeli povrat alata: '+t.name,'Zadužio '+(ev.person||'nije navedeno')+' · rok '+ev.dueDate,'Alati i oprema','high')});
 machines.forEach(m=>{const due=m.nextServiceDate||m.nextMaintenanceDate;if(due&&due<=addDays(today,7)&&m.status!=='Otpisan')push('maintenance-'+m.id,'maintenance',(due<today?'Kasni održavanje: ':'Uskoro održavanje: ')+(m.name||m.label||'Stroj'), 'Predviđeni datum '+due,'Održavanje strojeva',due<today?'high':'warning')});
 Object.entries(productionData.pieces||{}).forEach(([key,piece])=>Object.entries(piece.stages||{}).forEach(([stage,value])=>{if(value?.status==='Zastoj')push('stage-block-'+key+'-'+stage,'blocked','Zastoj u fazi: '+stage,key,'Proizvodnja','high')}));
 fieldWork.filter(x=>x.status==='Planirano'&&x.date===today).forEach(x=>push('field-today-'+x.id,'field','Današnji terenski posao: '+(x.project||x.customer||x.id),x.location||'Provjeri pripremu ekipe.','Terenski rad','info'));
 return out;
}
