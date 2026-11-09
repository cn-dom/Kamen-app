export const TOOL_STATUSES=['Dostupan','Zadužen','Na popravku','Otpisan'];
export const TOOL_CONDITIONS=['Ispravno','Istrošeno','Oštećeno','Neispravno'];
export function normalizeTools(value){return Array.isArray(value)?value.filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string').map(x=>({...x,status:TOOL_STATUSES.includes(x.status)?x.status:'Dostupan',condition:TOOL_CONDITIONS.includes(x.condition)?x.condition:'Ispravno'})):[]}
export function validateToolIssue({tool,person,dueDate}){if(!tool||tool.status!=='Dostupan')return 'Alat nije dostupan za zaduživanje.';if(!String(person||'').trim())return 'Odaberi osobu ili ekipu kojoj se alat izdaje.';if(!dueDate)return 'Unesi očekivani datum povrata.';return ''}
export function issueTool(tool,{person,workOrder='',dueDate,condition='Ispravno',notes='',issuedBy='Vlasnik'},now=new Date()){
 const error=validateToolIssue({tool,person,dueDate});if(error)throw new Error(error);
 const issue={id:'ZAD-'+now.getTime(),kind:'Izdavanje',toolId:tool.id,person:String(person).trim(),workOrder:String(workOrder).trim(),dueDate,condition,notes,issuedBy,issuedAt:now.toISOString(),createdAt:now.toISOString(),returnedAt:null,returnCondition:null,returnNotes:''};
 return {tool:{...tool,status:'Zadužen',currentIssueId:issue.id},issue,event:{id:'ALAT-'+now.getTime(),toolId:tool.id,kind:'Izdavanje',person:issue.person,workOrder:issue.workOrder,condition,notes,dueDate,createdAt:now.toISOString()}};
}
export function returnTool(tool,issue,options={},now=new Date()){
 const {condition='Ispravno',notes='',returnedBy='Vlasnik'}=options||{};
 if(!tool||tool.status!=='Zadužen'||!issue||issue.returnedAt)throw new Error('Za ovaj alat nema otvorenog zaduženja.');
 const returnedAt=now.toISOString(),updatedIssue={...issue,returnedAt,returnCondition:condition,returnNotes:notes,returnedBy};
 const status=condition==='Neispravno'||condition==='Oštećeno'?'Na popravku':'Dostupan';
 return {tool:{...tool,status,condition,currentIssueId:null},issue:updatedIssue,event:{id:'POV-'+now.getTime(),toolId:tool.id,kind:'Povrat',person:issue.person,condition,notes,createdAt:returnedAt}};
}
export function toolIsOverdue(issue,today=new Date().toISOString().slice(0,10)){return Boolean(issue&&!issue.returnedAt&&issue.dueDate&&issue.dueDate<today)}
export function toolSummary(tools,issues,today=new Date().toISOString().slice(0,10)){return {total:tools.filter(x=>x.status!=='Otpisan').length,available:tools.filter(x=>x.status==='Dostupan').length,issued:tools.filter(x=>x.status==='Zadužen').length,repair:tools.filter(x=>x.status==='Na popravku').length,overdue:issues.filter(x=>toolIsOverdue(x,today)).length}}
