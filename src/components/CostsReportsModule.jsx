import React, { useEffect, useMemo, useState } from 'react';
import { Wallet, Plus, Search, Download, Printer, X, TrendingUp, Clock3, Receipt, FolderKanban, AlertCircle, Trash2 } from 'lucide-react';
import { calculateOrderFinancials, summarizeFinancials } from '../lib/financials.js';
import { buildOperationalCostRecords } from '../lib/operationalCosts.js';

const ORDERS_KEY = 'kamen-app-work-orders-v1';
const COSTS_KEY = 'kamen-app-cost-records-v1';
const PRODUCTION_KEY = 'kamen-app-production-stages-v1';
const INVOICES_KEY = 'kamen-app-invoices-v1';
const PAYMENTS_KEY = 'kamen-app-payments-v1';
const MATERIAL_CONSUMPTION_KEY = 'kamen-app-material-consumption-v1';
const QUOTES_KEY = 'kamen-app-quotes-v1';
const FIELD_WORK_KEY = 'kamen-app-field-work-v1';
const COMPANY_SETTINGS_KEY = 'kamen-app-company-settings-v1';
const CATEGORIES = ['Materijal', 'Rad', 'Prijevoz', 'Vanjska obrada', 'Montaža', 'Terenski rad', 'Najam stroja', 'Potrošni materijal', 'Ostalo'];
const SEED_ORDERS = [];
const categoriesOf = record => Array.isArray(record.categories) ? record.categories : [record.category || 'Ostalo'];
const today = () => new Date().toISOString().slice(0, 10);
const read = (key, fallback) => {
  try { const value = window.localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
  catch { return fallback; }
};
const money = value => new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR' }).format(Number(value || 0));
const blank = { orderId: '', kind: 'Stvarni trošak', categories: ['Materijal'], description: '', amount: '', hours: '', hourlyRate: '', date: today(), note: '' };

export default function CostsReportsModule({ onBack }) {
  const [orders, setOrders] = useState(() => { const saved = read(ORDERS_KEY, null); return Array.isArray(saved) ? saved : SEED_ORDERS; });
  const [records, setRecords] = useState(() => read(COSTS_KEY, []));
  const [productionRecords] = useState(() => read(PRODUCTION_KEY, { pieces: {} }));
  const [invoices] = useState(() => read(INVOICES_KEY, []));
  const [payments] = useState(() => read(PAYMENTS_KEY, []));
  const [materialConsumption] = useState(() => read(MATERIAL_CONSUMPTION_KEY, []));
  const [quotes] = useState(() => read(QUOTES_KEY, []));
  const [fieldJobs] = useState(() => read(FIELD_WORK_KEY, []));
  const [companySettings] = useState(() => read(COMPANY_SETTINGS_KEY, { workRules: {} }));
  const automaticCosts = useMemo(() => buildOperationalCostRecords({ orders, productionRecords, fieldJobs, workRules: companySettings.workRules || {}, existingCosts: records }), [orders, productionRecords, fieldJobs, companySettings, records]);
  const allCostRecords = useMemo(() => [...records, ...automaticCosts], [records, automaticCosts]);
  const [query, setQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState('Svi projekti');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  useEffect(() => { try { window.localStorage.setItem(COSTS_KEY, JSON.stringify(records)); } catch { setError('Preglednik ne dopušta spremanje. Izvezi evidenciju kako ne bi izgubio podatke.'); } }, [records]);

  const projectRecords = useMemo(() => allCostRecords.filter(r => selectedOrder === 'Svi projekti' || r.orderId === selectedOrder), [allCostRecords, selectedOrder]);
  const filtered = useMemo(() => projectRecords.filter(r => {
    const order = orders.find(o => o.id === r.orderId);
    const q = query.trim().toLocaleLowerCase('hr');
    return !q || [r.description, ...categoriesOf(r), r.note, order?.customer, order?.project, r.orderId].some(v => String(v || '').toLocaleLowerCase('hr').includes(q));
  }), [projectRecords, query, orders]);
  const actual = projectRecords.filter(r => r.kind === 'Stvarni trošak');
  const planned = projectRecords.filter(r => r.kind === 'Planirani trošak');
  const plannedTotal = planned.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const hoursTotal = actual.reduce((sum, r) => sum + Number(r.hours || 0), 0) + automaticCosts.reduce((sum, r) => sum + Number(r.hours || 0), 0);
  const formatDate = value => value ? new Date(value + 'T12:00:00').toLocaleDateString('hr-HR') : '—';
  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const save = event => {
    event.preventDefault();
    const selectedCategories = form.categories || [];
    const hasLabor = selectedCategories.includes('Rad');
    const enteredAmount = Number(form.amount);
    const calculatedLabor = hasLabor && Number(form.hours) > 0 && Number(form.hourlyRate) > 0 ? Number(form.hours) * Number(form.hourlyRate) : 0;
    const amount = Number.isFinite(enteredAmount) && enteredAmount > 0 ? enteredAmount : calculatedLabor;
    if (!form.orderId || !selectedCategories.length || !form.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError('Odaberi projekt, opiši stavku i unesi iznos ili sate rada i cijenu sata.');
      return;
    }
    const entry = {
      id: 'TR-' + Date.now(), orderId: form.orderId, kind: form.kind, categories: selectedCategories, category: selectedCategories.join(', '),
      description: form.description.trim(), amount: Math.round(amount * 100) / 100,
      hours: hasLabor ? Number(form.hours || 0) : 0,
      hourlyRate: hasLabor ? Number(form.hourlyRate || 0) : 0,
      amountSource: !enteredAmount && calculatedLabor > 0 ? 'Izračun sati × cijena sata' : 'Ručni unos',
      date: form.date, note: form.note.trim(), createdAt: new Date().toISOString()
    };
    setRecords(prev => [entry, ...prev]);
    setSelectedOrder(form.orderId); setForm(blank); setShowForm(false); setError('');
  };
  const remove = id => {
    if (!window.confirm('Ukloniti ovu stavku iz lokalne evidencije troškova?')) return;
    setRecords(prev => prev.filter(r => r.id !== id));
  };
  const exportCsv = () => {
    const rows = [['Vrsta', 'Projekt', 'Kupac', 'Datum', 'Kategorija', 'Opis', 'Sati', 'Cijena sata EUR', 'Iznos EUR', 'Napomena']];
    filtered.forEach(r => {
      const order = orders.find(o => o.id === r.orderId);
      rows.push([r.kind, r.orderId + ' — ' + (order?.project || 'Nepoznat projekt'), order?.customer || '', r.date, categoriesOf(r).join(', '), r.description, r.hours || '', r.hourlyRate || '', r.amount, r.note || '']);
    });
    const csv = '\uFEFF' + rows.map(row => row.map(value => '"' + String(value ?? '').replaceAll('"', '""') + '"').join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'kamen-troskovi-izvjestaj.csv'; link.click(); URL.revokeObjectURL(url);
  };

  const projects = orders.map(order => ({ ...order, financial: calculateOrderFinancials(order, allCostRecords, productionRecords, Date.now(), invoices, payments, materialConsumption, quotes) }));
  const financialSummary = summarizeFinancials(projects.map(project => project.financial));
  const actualTotal = summarizeFinancials(projects.filter(project => selectedOrder === 'Svi projekti' || project.id === selectedOrder).map(project => project.financial)).totalActualCost;
  const movementData = read('kamen-app-movements-v1', []);
  const linkedMovements = movementData.filter(m => m.orderId && (selectedOrder === 'Svi projekti' || m.orderId === selectedOrder));
  const legacyUnpricedCuts = linkedMovements.filter(m => m.kind === 'Potrošnja za pilanje' && !materialConsumption.some(record => record.orderId === m.orderId));
  const unknownMaterialCosts = legacyUnpricedCuts.length > 0 && !actual.some(r => categoriesOf(r).includes('Materijal'));
  const unpricedConsumption = financialSummary.unpricedMaterialConsumptionCount;
  const consumptionRows = materialConsumption.filter(record => {
    const order = orders.find(item => item.id === record.orderId);
    const q = query.trim().toLocaleLowerCase('hr');
    const selected = selectedOrder === 'Svi projekti' || record.orderId === selectedOrder;
    return selected && (!q || [record.materialName, record.orderId, order?.customer, order?.project].some(value => String(value || '').toLocaleLowerCase('hr').includes(q)));
  }).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  return <div className="page-content module-page costs-page">
    <section className="welcome-row module-welcome">
      <div><div className="eyebrow"><span className="live-dot"/> KONTROLA POSLOVANJA</div><h1>Troškovi i izvještaji</h1><p className="subtitle">Prati planirane i stvarne troškove, sate rada i financijski rezultat svakog projekta.</p></div>
      <div className="costs-actions"><button className="button button-secondary" onClick={onBack}>← Povratak na pregled</button><button className="button button-secondary" onClick={exportCsv}><Download size={16}/> Izvoz CSV</button><button className="button button-primary" onClick={() => { const latestOrders = read(ORDERS_KEY, SEED_ORDERS); setOrders(Array.isArray(latestOrders) ? latestOrders : SEED_ORDERS); setForm(blank); setError(''); setShowForm(true); }}><Plus size={16}/> Nova stavka</button></div>
    </section>

    <section className="costs-stats">
      <article className="panel costs-stat"><span className="costs-stat-icon blue"><Wallet size={19}/></span><div><small>Planirani troškovi</small><strong>{money(plannedTotal)}</strong><span>{planned.length} evidentiranih stavki</span></div></article>
      <article className="panel costs-stat"><span className="costs-stat-icon violet"><Receipt size={19}/></span><div><small>Ukupni stvarni troškovi</small><strong>{money(actualTotal)}</strong><span>{actual.length} ručnih stavki · uključuje pilanje</span></div></article>
      <article className="panel costs-stat"><span className="costs-stat-icon amber"><TrendingUp size={19}/></span><div><small>Razlika plana i stvarnog</small><strong className={actualTotal > plannedTotal && plannedTotal > 0 ? 'cost-over' : ''}>{plannedTotal ? money(plannedTotal - actualTotal) : '—'}</strong><span>{plannedTotal ? (actualTotal > plannedTotal ? 'Prekoračenje plana' : 'Preostalo do plana') : 'Plan još nije unesen'}</span></div></article>
      <article className="panel costs-stat"><span className="costs-stat-icon green"><Clock3 size={19}/></span><div><small> evidentirani radni sati</small><strong>{hoursTotal.toLocaleString('hr-HR')} h</strong><span>Sati uneseni uz trošak rada</span></div></article>
    </section>

    <section className="panel costs-toolbar-panel">
      <div className="costs-toolbar"><div><h2>Pregled po projektu</h2><p>Odaberi projekt za detaljnu kontrolu troškova.</p></div><label className="costs-project-select">Projekt<select value={selectedOrder} onChange={e => setSelectedOrder(e.target.value)}><option>Svi projekti</option>{orders.map(o => <option key={o.id} value={o.id}>{o.id} · {o.project}</option>)}</select></label></div>
      {!orders.length && <div className="costs-empty"><FolderKanban size={25}/><strong>Nema radnih naloga</strong><span>Najprije izradi radni nalog pa će se pojaviti u ovom izboru.</span></div>}
      {unknownMaterialCosts && <div className="costs-warning"><AlertCircle size={17}/><span>Postoje evidentirana skladišna kretanja povezana s projektom, ali nemaju spremljenu nabavnu cijenu. Trošak materijala zato nije automatski izračunat. Unesi stvarni trošak materijala kao zasebnu stavku.</span></div>}
      <div className="costs-financial-summary"><div><small>Planirani izdaci</small><strong>{money(financialSummary.plannedCost)}</strong></div><div><small>Ukupni stvarni trošak</small><strong>{money(financialSummary.totalActualCost)}</strong><span>Uključuje automatski obračun utrošenog kamena</span></div><div><small>Bruto vrijednost potrošenih ploča</small><strong>{money(financialSummary.consumedMaterialCost)}</strong><span>{financialSummary.consumedMaterialAreaM2.toLocaleString('hr-HR',{maximumFractionDigits:4})} m² ulaznog materijala</span></div><div><small>Vrijednost vraćenih ostataka</small><strong>{money(financialSummary.remnantMaterialValue)}</strong><span>{financialSummary.remnantMaterialAreaM2.toLocaleString('hr-HR',{maximumFractionDigits:4})} m² ostaje na zalihi</span></div><div><small>Stvarni trošak kamena za naloge</small><strong>{money(financialSummary.jobMaterialCost)}</strong><span>Bruto potrošnja umanjena za vrijednost ostataka</span></div><div><small>Otpad i procesni gubitak</small><strong>{money(financialSummary.wasteMaterialCost)}</strong><span>{(financialSummary.wasteMaterialAreaM2 + financialSummary.processLossAreaM2).toLocaleString('hr-HR',{maximumFractionDigits:4})} m² · otpad i rezovi</span></div><div><small>Procjena materijala u nalogu</small><strong>{money(financialSummary.estimatedMaterialCost)}</strong><span>Planirana vrijednost, ne pribraja se stvarnom trošku</span></div><div><small>Vrijeme u proizvodnji</small><strong>{financialSummary.productionHours.toLocaleString('hr-HR')} h</strong></div><div><small>Izdano računa · neto</small><strong>{money(financialSummary.invoiceNet)}</strong></div><div><small>PDV na izdanim računima</small><strong>{money(financialSummary.invoiceGross - financialSummary.invoiceNet)}</strong></div><div><small>Stvarno naplaćeno</small><strong>{money(financialSummary.collected)}</strong></div><div><small>Otvorena potraživanja</small><strong>{money(financialSummary.receivable)}</strong></div><div className={financialSummary.netDifference<0?'cost-result-negative':''}><small>Ostvarena marža na izdanim računima</small><strong>{money(financialSummary.netDifference)}</strong><span>{financialSummary.projectsWithInvoices} projekata s računom</span></div></div><div className="costs-table-wrap"><table className="costs-table"><thead><tr><th>PROJEKT</th><th>KUPAC</th><th>PLANIRANO</th><th>PROCJENA MATERIJALA</th><th>STVARNI TROŠAK</th><th>UTROŠENI KAMEN</th><th>OD TOGA RAD</th><th>RAČUNI NETO</th><th>NAPLAĆENO</th><th>ZA NAPLATU</th><th>NETO RAZLIKA</th><th>PROIZVODNJA</th></tr></thead><tbody>{projects.filter(p => selectedOrder === 'Svi projekti' || p.id === selectedOrder).map(p => <tr key={p.id}><td><strong>{p.id}</strong><small>{p.project}</small><small>{p.status || 'Status nije unesen'}</small></td><td>{p.customer || '—'}</td><td>{p.financial.plannedCost ? money(p.financial.plannedCost) : '—'}</td><td>{p.financial.estimatedMaterialCost == null ? <span className="cost-over">Nema cijene</span> : money(p.financial.estimatedMaterialCost)}</td><td><strong>{p.financial.totalActualCost ? money(p.financial.totalActualCost) : '—'}</strong><small>Rad: {money(p.financial.costBreakdown.labor)} · prijevoz: {money(p.financial.costBreakdown.transport)}</small><small>Obrada: {money(p.financial.costBreakdown.processing)} · montaža: {money(p.financial.costBreakdown.installation)}</small><small>Strojevi i ostalo: {money(p.financial.costBreakdown.equipment + p.financial.costBreakdown.other)}</small></td><td>{p.financial.materialConsumptionCount ? <><strong>{money(p.financial.jobMaterialCost)}</strong><small>{p.financial.consumedMaterialAreaM2.toLocaleString('hr-HR',{maximumFractionDigits:4})} m² · {p.financial.materialConsumptionCount} pilanja</small><small>Ostatak: {money(p.financial.remnantMaterialValue)}</small></> : '—'}</td><td>{p.financial.laborCost ? money(p.financial.laborCost) : '—'}</td><td>{p.financial.invoiceNet ? money(p.financial.invoiceNet) : '—'}<small>{p.financial.invoiceCount} izdanih računa</small>{p.financial.acceptedQuoteNet != null && <small>Prihvaćena ponuda: {money(p.financial.acceptedQuoteNet)} neto · procijenjena marža: {money(p.financial.estimatedGrossMargin)}</small>}</td><td>{p.financial.collected ? money(p.financial.collected) : '—'}</td><td>{p.financial.receivable ? money(p.financial.receivable) : '—'}</td><td><strong className={p.financial.netDifference<0?'cost-result-negative':''}>{p.financial.invoiceCount?money(p.financial.netDifference):'—'}</strong><small>{p.financial.invoiceCount?'Neto računi − stvarni izdaci':'Račun još nije izdan'}</small></td><td>{p.financial.productionHours.toLocaleString('hr-HR')} h<small>{p.financial.trackedPieces} praćenih komada</small></td></tr>)}</tbody></table></div>{unpricedConsumption>0&&<div className="costs-warning"><AlertCircle size={17}/><span>{unpricedConsumption} evidentiranih pilanja nema spremljenu nabavnu cijenu po m². Njihova potrošnja i površina su evidentirane, ali nisu uključene u iznos troška. Dopuni cijenu materijala u skladištu za buduća pilanja; povijesni zapis zadržava cijenu koja je vrijedila u trenutku pilanja.</span></div>}{financialSummary.incompleteMaterialEstimates>0&&<div className="costs-warning"><AlertCircle size={17}/><span>Za {financialSummary.incompleteMaterialEstimates} projekta nema potpune nabavne cijene u alokacijama materijala. Procjena materijala prikazuje se samo kada su svi povezani iznosi poznati.</span></div>}
    </section>

    <section className="panel costs-ledger-panel">
      <div className="costs-toolbar"><div><h2>Stavke troškova</h2><p>Plan i stvarni izdaci odvojeni su radi jasne kontrole.</p></div><label className="costs-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Traži opis, kupca ili kategoriju…"/></label></div>
      <div className="costs-table-wrap"><table className="costs-table"><thead><tr><th>DATUM</th><th>PROJEKT</th><th>VRSTA / KATEGORIJA</th><th>OPIS</th><th>IZNOS</th><th></th></tr></thead><tbody>{filtered.map(r => { const order = orders.find(o => o.id === r.orderId); return <tr key={r.id}><td>{formatDate(r.date)}</td><td><strong>{r.orderId}</strong><small>{order?.project || 'Projekt nije pronađen'}</small></td><td><span className={'cost-kind ' + (r.kind === 'Planirani trošak' ? 'planned' : 'actual')}>{r.kind}</span><small>{categoriesOf(r).join(' · ')}{r.hours ? ' · ' + r.hours + ' h' : ''}</small></td><td><strong>{r.description}</strong>{r.note && <small>{r.note}</small>}</td><td><strong>{money(r.amount)}</strong></td><td>{r.automatic ? <span className="cost-kind actual">Automatski</span> : <button className="row-action" onClick={() => remove(r.id)} aria-label="Ukloni stavku" title="Ukloni"><Trash2 size={15}/></button>}</td></tr>; })}{!filtered.length && <tr><td colSpan="6"><div className="costs-empty"><Receipt size={24}/><strong>Nema stavki za prikaz</strong><span>Dodaj planirani ili stvarni trošak za odabrani projekt.</span></div></td></tr>}</tbody></table></div>
      <div className="costs-foot"><span>Prikazano {filtered.length} stavki · Iznos je u eurima</span><button className="text-action" onClick={() => window.print()}><Printer size={15}/> Ispis izvještaja</button></div>
    </section>
    <section className="panel costs-ledger-panel">
      <div className="costs-toolbar"><div><h2>Automatska evidencija utroška kamena</h2><p>Neizmjenjivi zapisi nastali potvrdom pilanja, s cijenom spremljenom u trenutku potrošnje.</p></div><span className="count-pill">{consumptionRows.length}</span></div>
      <div className="costs-table-wrap"><table className="costs-table"><thead><tr><th>DATUM</th><th>RADNI NALOG</th><th>MATERIJAL / PLOČA</th><th>ULAZ</th><th>GOTOVI KOMADI</th><th>OSTATAK</th><th>OTPAD + GUBITAK</th><th>ISKORISTIVOST</th><th>VRIJEDNOST OSTATAKA</th><th>TROŠAK NALOGA</th></tr></thead><tbody>{consumptionRows.map(record => { const order = orders.find(item => item.id === record.orderId); return <tr key={record.id}><td>{formatDate(String(record.date || '').slice(0,10))}</td><td><strong>{record.orderId === 'SKLADIŠTE' ? 'Bez radnog naloga' : record.orderId}</strong><small>{order?.project || (record.orderId === 'SKLADIŠTE' ? 'Opće pilanje' : 'Projekt nije pronađen')}</small></td><td><strong>{record.materialName}</strong><small>{record.boardLengthCm || '—'} × {record.boardWidthCm || '—'} cm · {record.usedQuantity} ploča</small></td><td>{Number(record.consumedAreaM2 || 0).toLocaleString('hr-HR',{maximumFractionDigits:4})} m²</td><td>{Number(record.finishedAreaM2 || 0).toLocaleString('hr-HR',{maximumFractionDigits:4})} m²</td><td>{Number(record.remnantAreaM2 || 0).toLocaleString('hr-HR',{maximumFractionDigits:4})} m²<small>{(record.outputs || []).filter(output => output.type === 'Ostatak').map(output => `${output.name}: ${output.lengthCm} × ${output.widthCm} cm · ${output.value == null ? 'bez cijene' : money(output.value)}`).join(' · ') || 'Nema uporabnog ostatka'}</small></td><td>{Number((record.wasteAreaM2 || 0) + (record.processLossAreaM2 || 0)).toLocaleString('hr-HR',{maximumFractionDigits:4})} m²<small>Otpad: {Number(record.wasteAreaM2 || 0).toLocaleString('hr-HR',{maximumFractionDigits:4})} · rez/obrez: {Number(record.processLossAreaM2 || 0).toLocaleString('hr-HR',{maximumFractionDigits:4})}</small><small>{(record.outputs || []).filter(output => output.type === 'Otpad').map(output => `${output.name}: ${output.lengthCm} × ${output.widthCm} cm`).join(' · ') || 'Nema zasebno evidentiranog otpada'}</small></td><td><strong>{Number(record.reusableYieldPercent ?? record.finishedYieldPercent ?? 0).toLocaleString('hr-HR',{maximumFractionDigits:2})}%</strong><small>Gotovi komadi: {Number(record.finishedYieldPercent || 0).toLocaleString('hr-HR',{maximumFractionDigits:2})}%</small></td><td><strong>{record.priceKnown ? money(record.remnantValue || 0) : 'Nema cijene'}</strong></td><td><strong>{record.priceKnown ? money(record.jobMaterialCost ?? record.materialCost) : 'Nije obračunato'}</strong></td></tr>; })}{!consumptionRows.length&&<tr><td colSpan="10"><div className="costs-empty"><Receipt size={24}/><strong>Nema evidentiranog pilanja</strong><span>Zapisi se pojavljuju nakon potvrde pilanja, s radnim nalogom ili bez njega.</span></div></td></tr>}</tbody></table></div>
      <div className="costs-foot"><span>{consumptionRows.length} zapisa · Iskoristivost uključuje gotove komade i uporabne ostatke. Vrijednost ostataka ostaje u zalihi.</span></div>
    </section>
    <section className="costs-disclaimer"><AlertCircle size={17}/><span>Podaci se spremaju lokalno u ovom pregledniku. Evidencija utroška materijala po pilanju čuva nabavnu cijenu koja je vrijedila u trenutku potrošnje i uključena je u sigurnosnu kopiju. Procjena materijala preuzima cijene spremljene na radnom nalogu, a sati se zbrajaju iz vremenskih sesija proizvodnih faza. Utrošak pilanja dijeli se na gotove komade, uporabne ostatke, evidentirani otpad i procesni gubitak (rez i obrezivanje). Vrijednost uporabnih ostataka ostaje u zalihi i odbija se od troška materijala radnog naloga; otpad i procesni gubitak ostaju trošak posla. Iskoristivost uključuje gotove komade i ostatke. Ako za nalog postoji automatska evidencija pilanja, ručno unesene stavke kategorije Materijal zamjenjuju se automatskim iznosom kako se isti kamen ne bi dvostruko obračunao; ostale stvarne izdatke i dalje unosi ručno. Neto razlika računa i ukupnih evidentiranih stvarnih troškova nije konačna dobit: ne uključuje neevidentirane materijale, režije, poreze ni druge poslovne obveze; procjena materijala ostaje odvojena kako se ne bi dvostruko zbrajala. Izdani računi prikazuju se iz zasebne evidencije računa, a naplata samo iz evidentiranih uplata. Prihvaćena ponuda sama po sebi nije račun niti dokaz naplate. Ovo nije računovodstveni ni e-račun sustav.</span></section>

    {showForm && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false); }}><section className="modal costs-modal" role="dialog" aria-modal="true" aria-labelledby="costs-modal-title"><div className="modal-head"><div><span className="modal-kicker">FINANCIJSKA EVIDENCIJA</span><h2 id="costs-modal-title">Nova stavka troška</h2><p>Unos se veže uz odabrani radni nalog.</p></div><button className="icon-button" onClick={() => setShowForm(false)} aria-label="Zatvori"><X size={19}/></button></div>
      <form onSubmit={save}><label>Projekt<select value={form.orderId} onChange={e => update('orderId',e.target.value)} required><option value="">Odaberi radni nalog</option>{orders.map(o => <option key={o.id} value={o.id}>{o.id} · {o.project} — {o.customer}</option>)}</select></label><div className="form-row"><label>Vrsta<select value={form.kind} onChange={e => update('kind',e.target.value)}><option>Stvarni trošak</option><option>Planirani trošak</option></select></label><div className="cost-category-field"><span>Kategorije <small>(označi sve koje se odnose na stavku)</small></span><div className="cost-category-options">{CATEGORIES.map(category => <label className={form.categories.includes(category) ? 'cost-category-option selected' : 'cost-category-option'} key={category}><input type="checkbox" checked={form.categories.includes(category)} onChange={e => update('categories', e.target.checked ? [...form.categories, category] : form.categories.filter(item => item !== category))}/><span>{category}</span></label>)}</div></div></div><label>Opis stavke<input value={form.description} onChange={e => update('description',e.target.value)} placeholder="Npr. granitna ploča, montaža, prijevoz…" required/></label>{form.categories.includes('Rad') && <div className="form-row"><label>Radni sati (neobavezno)<input type="number" min="0" step="0.1" value={form.hours} onChange={e => update('hours',e.target.value)}/></label><label>Cijena sata (EUR, neobavezno)<input type="number" min="0" step="0.01" value={form.hourlyRate} onChange={e => update('hourlyRate',e.target.value)}/></label></div>}<label>Ukupni iznos stavke (EUR)<input type="number" min="0" step="0.01" value={form.amount} onChange={e => update('amount',e.target.value)} placeholder={form.categories.includes('Rad') && Number(form.hours) > 0 && Number(form.hourlyRate) > 0 ? (Number(form.hours) * Number(form.hourlyRate)).toFixed(2) + ' — automatski izračun' : 'Unesi iznos'}/></label><label>Datum<input type="date" value={form.date} onChange={e => update('date',e.target.value)} required/></label><label>Napomena<textarea rows="2" value={form.note} onChange={e => update('note',e.target.value)} placeholder="Broj računa, dobavljač ili dodatna napomena…"/></label>{error && <p className="workorders-error">{error}</p>}<div className="modal-note"><AlertCircle size={16}/><span>Unos je evidencija u pregledniku, nije računovodstveni dokument ni potvrda plaćanja.</span></div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setShowForm(false)}>Odustani</button><button type="submit" className="button button-primary"><Plus size={16}/> Spremi stavku</button></div></form></section></div>}
  </div>;
}
