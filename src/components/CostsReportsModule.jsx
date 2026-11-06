import React, { useEffect, useMemo, useState } from 'react';
import { Wallet, Plus, Search, Download, Printer, X, TrendingUp, Clock3, Receipt, FolderKanban, AlertCircle, Trash2 } from 'lucide-react';

const ORDERS_KEY = 'kamen-app-work-orders-v1';
const COSTS_KEY = 'kamen-app-cost-records-v1';
const CATEGORIES = ['Materijal', 'Rad', 'Prijevoz', 'Vanjska obrada', 'Ostalo'];
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
  const [query, setQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState('Svi projekti');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  useEffect(() => { try { window.localStorage.setItem(COSTS_KEY, JSON.stringify(records)); } catch { setError('Preglednik ne dopušta spremanje. Izvezi evidenciju kako ne bi izgubio podatke.'); } }, [records]);

  const projectRecords = useMemo(() => records.filter(r => selectedOrder === 'Svi projekti' || r.orderId === selectedOrder), [records, selectedOrder]);
  const filtered = useMemo(() => projectRecords.filter(r => {
    const order = orders.find(o => o.id === r.orderId);
    const q = query.trim().toLocaleLowerCase('hr');
    return !q || [r.description, ...categoriesOf(r), r.note, order?.customer, order?.project, r.orderId].some(v => String(v || '').toLocaleLowerCase('hr').includes(q));
  }), [projectRecords, query, orders]);
  const actual = projectRecords.filter(r => r.kind === 'Stvarni trošak');
  const planned = projectRecords.filter(r => r.kind === 'Planirani trošak');
  const actualTotal = actual.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const plannedTotal = planned.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const hoursTotal = actual.reduce((sum, r) => sum + Number(r.hours || 0), 0);
  const formatDate = value => value ? new Date(value + 'T12:00:00').toLocaleDateString('hr-HR') : '—';
  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const save = event => {
    event.preventDefault();
    const selectedCategories = form.categories || [];
    const hasLabor = selectedCategories.includes('Rad');
    const amount = Number(form.amount);
    if (!form.orderId || !selectedCategories.length || !form.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError('Odaberi projekt, opiši stavku i unesi valjan iznos.');
      return;
    }
    const entry = {
      id: 'TR-' + Date.now(), orderId: form.orderId, kind: form.kind, categories: selectedCategories, category: selectedCategories.join(', '),
      description: form.description.trim(), amount: Math.round(amount * 100) / 100,
      hours: hasLabor ? Number(form.hours || 0) : 0,
      hourlyRate: hasLabor ? Number(form.hourlyRate || 0) : 0,
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

  const projects = orders.map(order => ({ ...order, plan: records.filter(r => r.orderId === order.id && r.kind === 'Planirani trošak').reduce((s, r) => s + Number(r.amount || 0), 0), spent: records.filter(r => r.orderId === order.id && r.kind === 'Stvarni trošak').reduce((s, r) => s + Number(r.amount || 0), 0) }));
  const movementData = read('kamen-app-movements-v1', []);
  const linkedMovements = movementData.filter(m => m.orderId && (selectedOrder === 'Svi projekti' || m.orderId === selectedOrder));
  const unknownMaterialCosts = linkedMovements.length > 0 && !actual.some(r => categoriesOf(r).includes('Materijal'));

  return <div className="page-content module-page costs-page">
    <section className="welcome-row module-welcome">
      <div><div className="eyebrow"><span className="live-dot"/> KONTROLA POSLOVANJA</div><h1>Troškovi i izvještaji</h1><p className="subtitle">Prati planirane i stvarne troškove, sate rada i financijski rezultat svakog projekta.</p></div>
      <div className="costs-actions"><button className="button button-secondary" onClick={onBack}>← Povratak na pregled</button><button className="button button-secondary" onClick={exportCsv}><Download size={16}/> Izvoz CSV</button><button className="button button-primary" onClick={() => { const latestOrders = read(ORDERS_KEY, SEED_ORDERS); setOrders(Array.isArray(latestOrders) ? latestOrders : SEED_ORDERS); setForm(blank); setError(''); setShowForm(true); }}><Plus size={16}/> Nova stavka</button></div>
    </section>

    <section className="costs-stats">
      <article className="panel costs-stat"><span className="costs-stat-icon blue"><Wallet size={19}/></span><div><small>Planirani troškovi</small><strong>{money(plannedTotal)}</strong><span>{planned.length} evidentiranih stavki</span></div></article>
      <article className="panel costs-stat"><span className="costs-stat-icon violet"><Receipt size={19}/></span><div><small>Stvarni troškovi</small><strong>{money(actualTotal)}</strong><span>{actual.length} evidentiranih stavki</span></div></article>
      <article className="panel costs-stat"><span className="costs-stat-icon amber"><TrendingUp size={19}/></span><div><small>Razlika plana i stvarnog</small><strong className={actualTotal > plannedTotal && plannedTotal > 0 ? 'cost-over' : ''}>{plannedTotal ? money(plannedTotal - actualTotal) : '—'}</strong><span>{plannedTotal ? (actualTotal > plannedTotal ? 'Prekoračenje plana' : 'Preostalo do plana') : 'Plan još nije unesen'}</span></div></article>
      <article className="panel costs-stat"><span className="costs-stat-icon green"><Clock3 size={19}/></span><div><small> evidentirani radni sati</small><strong>{hoursTotal.toLocaleString('hr-HR')} h</strong><span>Sati uneseni uz trošak rada</span></div></article>
    </section>

    <section className="panel costs-toolbar-panel">
      <div className="costs-toolbar"><div><h2>Pregled po projektu</h2><p>Odaberi projekt za detaljnu kontrolu troškova.</p></div><label className="costs-project-select">Projekt<select value={selectedOrder} onChange={e => setSelectedOrder(e.target.value)}><option>Svi projekti</option>{orders.map(o => <option key={o.id} value={o.id}>{o.id} · {o.project}</option>)}</select></label></div>
      {!orders.length && <div className="costs-empty"><FolderKanban size={25}/><strong>Nema radnih naloga</strong><span>Najprije izradi radni nalog pa će se pojaviti u ovom izboru.</span></div>}
      {unknownMaterialCosts && <div className="costs-warning"><AlertCircle size={17}/><span>Postoje evidentirana skladišna kretanja povezana s projektom, ali nemaju spremljenu nabavnu cijenu. Trošak materijala zato nije automatski izračunat. Unesi stvarni trošak materijala kao zasebnu stavku.</span></div>}
      <div className="costs-table-wrap"><table className="costs-table"><thead><tr><th>PROJEKT</th><th>KUPAC</th><th>PLANIRANO</th><th>STVARNO</th><th>ODSTUPANJE</th></tr></thead><tbody>{projects.filter(p => selectedOrder === 'Svi projekti' || p.id === selectedOrder).map(p => <tr key={p.id}><td><strong>{p.id}</strong><small>{p.project}</small></td><td>{p.customer}</td><td>{p.plan ? money(p.plan) : '—'}</td><td>{p.spent ? money(p.spent) : '—'}</td><td><span className={p.plan && p.spent > p.plan ? 'cost-over' : 'cost-under'}>{p.plan ? money(p.plan - p.spent) : 'Plan nije unesen'}</span></td></tr>)}</tbody></table></div>
    </section>

    <section className="panel costs-ledger-panel">
      <div className="costs-toolbar"><div><h2>Stavke troškova</h2><p>Plan i stvarni izdaci odvojeni su radi jasne kontrole.</p></div><label className="costs-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Traži opis, kupca ili kategoriju…"/></label></div>
      <div className="costs-table-wrap"><table className="costs-table"><thead><tr><th>DATUM</th><th>PROJEKT</th><th>VRSTA / KATEGORIJA</th><th>OPIS</th><th>IZNOS</th><th></th></tr></thead><tbody>{filtered.map(r => { const order = orders.find(o => o.id === r.orderId); return <tr key={r.id}><td>{formatDate(r.date)}</td><td><strong>{r.orderId}</strong><small>{order?.project || 'Projekt nije pronađen'}</small></td><td><span className={'cost-kind ' + (r.kind === 'Planirani trošak' ? 'planned' : 'actual')}>{r.kind}</span><small>{categoriesOf(r).join(' · ')}{r.hours ? ' · ' + r.hours + ' h' : ''}</small></td><td><strong>{r.description}</strong>{r.note && <small>{r.note}</small>}</td><td><strong>{money(r.amount)}</strong></td><td><button className="row-action" onClick={() => remove(r.id)} aria-label="Ukloni stavku" title="Ukloni"><Trash2 size={15}/></button></td></tr>; })}{!filtered.length && <tr><td colSpan="6"><div className="costs-empty"><Receipt size={24}/><strong>Nema stavki za prikaz</strong><span>Dodaj planirani ili stvarni trošak za odabrani projekt.</span></div></td></tr>}</tbody></table></div>
      <div className="costs-foot"><span>Prikazano {filtered.length} stavki · Iznos je u eurima</span><button className="text-action" onClick={() => window.print()}><Printer size={15}/> Ispis izvještaja</button></div>
    </section>
    <section className="costs-disclaimer"><AlertCircle size={17}/><span>Podaci se spremaju lokalno u ovom pregledniku. Nabavne cijene materijala, prihodi i stvarni radni sati nisu automatski dostupni iz postojećih evidencija. Dobit se zato ne prikazuje dok se ne evidentiraju i prihodi i svi troškovi.</span></section>

    {showForm && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false); }}><section className="modal costs-modal" role="dialog" aria-modal="true" aria-labelledby="costs-modal-title"><div className="modal-head"><div><span className="modal-kicker">FINANCIJSKA EVIDENCIJA</span><h2 id="costs-modal-title">Nova stavka troška</h2><p>Unos se veže uz odabrani radni nalog.</p></div><button className="icon-button" onClick={() => setShowForm(false)} aria-label="Zatvori"><X size={19}/></button></div>
      <form onSubmit={save}><label>Projekt<select value={form.orderId} onChange={e => update('orderId',e.target.value)} required><option value="">Odaberi radni nalog</option>{orders.map(o => <option key={o.id} value={o.id}>{o.id} · {o.project} — {o.customer}</option>)}</select></label><div className="form-row"><label>Vrsta<select value={form.kind} onChange={e => update('kind',e.target.value)}><option>Stvarni trošak</option><option>Planirani trošak</option></select></label><div className="cost-category-field"><span>Kategorije <small>(označi sve koje se odnose na stavku)</small></span><div className="cost-category-options">{CATEGORIES.map(category => <label className={form.categories.includes(category) ? 'cost-category-option selected' : 'cost-category-option'} key={category}><input type="checkbox" checked={form.categories.includes(category)} onChange={e => update('categories', e.target.checked ? [...form.categories, category] : form.categories.filter(item => item !== category))}/><span>{category}</span></label>)}</div></div></div><label>Opis stavke<input value={form.description} onChange={e => update('description',e.target.value)} placeholder="Npr. granitna ploča, montaža, prijevoz…" required/></label>{form.categories.includes('Rad') && <div className="form-row"><label>Radni sati (neobavezno)<input type="number" min="0" step="0.1" value={form.hours} onChange={e => update('hours',e.target.value)}/></label><label>Cijena sata (EUR, neobavezno)<input type="number" min="0" step="0.01" value={form.hourlyRate} onChange={e => update('hourlyRate',e.target.value)}/></label></div>}<label>Ukupni iznos stavke (EUR)<input type="number" min="0.01" step="0.01" value={form.amount} onChange={e => update('amount',e.target.value)} required/></label><label>Datum<input type="date" value={form.date} onChange={e => update('date',e.target.value)} required/></label><label>Napomena<textarea rows="2" value={form.note} onChange={e => update('note',e.target.value)} placeholder="Broj računa, dobavljač ili dodatna napomena…"/></label>{error && <p className="workorders-error">{error}</p>}<div className="modal-note"><AlertCircle size={16}/><span>Unos je evidencija u pregledniku, nije računovodstveni dokument ni potvrda plaćanja.</span></div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setShowForm(false)}>Odustani</button><button type="submit" className="button button-primary"><Plus size={16}/> Spremi stavku</button></div></form></section></div>}
  </div>;
}
