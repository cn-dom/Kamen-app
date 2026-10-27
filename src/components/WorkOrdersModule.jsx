import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Plus, Search, X, CalendarDays, UserRound, Ruler, ChevronDown, CheckCircle2, Clock3, Hammer, Trash2 } from 'lucide-react';

const seedOrders = [
  { id: 'RN-2026-001', customer: 'Primjer kupca d.o.o.', project: 'Kuhinjska radna ploča', material: 'Brački kamen', due: '2026-11-02', status: 'U pripremi', note: 'Provjeriti šablonu prije pilanja', pieces: [{ name: 'Radna ploča — glavni dio', length: 240, width: 62, thickness: 3, quantity: 1 }, { name: 'Bočna ploča', length: 62, width: 8, thickness: 3, quantity: 2 }] },
  { id: 'RN-2026-002', customer: 'Obitelj Horvat', project: 'Vanjske stepenice', material: 'Granit', due: '2026-11-05', status: 'U tijeku', note: '', pieces: [{ name: 'Gazište', length: 120, width: 32, thickness: 3, quantity: 8 }] }
];
const STORAGE_KEY = 'kamen-app-work-orders-v1';
function readStoredOrders() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : seedOrders;
  } catch { return seedOrders; }
}

const blankForm = { customer: '', project: '', material: '', due: '', note: '' };
const blankPiece = () => ({ name: '', length: '', width: '', thickness: '3', quantity: '1' });
const statuses = ['U pripremi', 'Spreman za pilanje', 'U tijeku', 'Čeka kontrolu', 'Završen'];

export default function WorkOrdersModule({ onBack }) {
  const [orders, setOrders] = useState(readStoredOrders);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Svi statusi');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [pieces, setPieces] = useState([blankPiece()]);
  const [expanded, setExpanded] = useState('RN-2026-001');
  const [error, setError] = useState('');
  useEffect(() => { try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders)); } catch { /* Browser storage may be disabled or full. */ } }, [orders]);
  const filtered = useMemo(() => orders.filter(o => {
    const q = query.trim().toLowerCase();
    return (!q || [o.id, o.customer, o.project, o.material].some(v => v.toLowerCase().includes(q))) &&
      (statusFilter === 'Svi statusi' || o.status === statusFilter);
  }), [orders, query, statusFilter]);
  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const updatePiece = (index, key, value) => setPieces(prev => prev.map((p, i) => i === index ? { ...p, [key]: value } : p));
  const createOrder = (event) => {
    event.preventDefault();
    if (!form.customer.trim() || !form.project.trim() || !form.material.trim()) {
      setError('Unesi kupca, naziv projekta i materijal.');
      return;
    }
    if (!pieces.length || pieces.some(p => !p.name.trim() || Number(p.length) <= 0 || Number(p.width) <= 0 || Number(p.thickness) <= 0 || Number(p.quantity) <= 0)) {
      setError('Za svaki komad unesi naziv, pozitivne dimenzije, debljinu i količinu.');
      return;
    }
    const id = 'RN-2026-' + String(Math.max(0, ...orders.map(o => Number(o.id.split('-').at(-1)) || 0)) + 1).padStart(3, '0');
    const order = { ...form, id, status: 'U pripremi', pieces: pieces.map(p => ({ ...p, length: Number(p.length), width: Number(p.width), thickness: Number(p.thickness), quantity: Number(p.quantity) })) };
    setOrders(prev => [order, ...prev]);
    setExpanded(id); setShowForm(false); setForm(blankForm); setPieces([blankPiece()]); setError('');
  };
  const changeStatus = (id, status) => setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  const removeOrder = (id) => { setOrders(prev => prev.filter(o => o.id !== id)); if (expanded === id) setExpanded(''); };
  const pieceCount = orders.reduce((sum, order) => sum + order.pieces.reduce((n, p) => n + p.quantity, 0), 0);
  return <div className="page-content workorders-page">
    <section className="welcome-row module-welcome">
      <div><div className="eyebrow"><span className="live-dot" /> PROJEKTI I EVIDENCIJA</div><h1>Radni nalozi</h1><p className="subtitle">Evidentiraj narudžbu, kupca i svaki komad koji treba izrezati ili obraditi.</p></div>
      <div className="workorders-actions"><button className="button button-secondary" onClick={onBack}>← Pregled</button><button className="button button-primary" onClick={() => { setShowForm(true); setError(''); }}><Plus size={17}/> Novi radni nalog</button></div>
    </section>
    <section className="workorders-stats">
      <article className="panel workorders-stat"><span className="workorders-stat-icon blue"><ClipboardList size={19}/></span><div><small>Ukupno naloga</small><strong>{orders.length}</strong></div></article>
      <article className="panel workorders-stat"><span className="workorders-stat-icon amber"><Clock3 size={19}/></span><div><small>U tijeku</small><strong>{orders.filter(o => ['Spreman za pilanje','U tijeku','Čeka kontrolu'].includes(o.status)).length}</strong></div></article>
      <article className="panel workorders-stat"><span className="workorders-stat-icon green"><CheckCircle2 size={19}/></span><div><small>Završeni</small><strong>{orders.filter(o => o.status === 'Završen').length}</strong></div></article>
      <article className="panel workorders-stat"><span className="workorders-stat-icon purple"><Ruler size={19}/></span><div><small>Komada po nacrtu</small><strong>{pieceCount}</strong></div></article>
    </section>
    <section className="panel workorders-list-panel">
      <div className="workorders-list-head"><div><h2>Popis radnih naloga</h2><p>Otvori nalog za pregled komada i promjenu statusa.</p></div><div className="workorders-filters"><label className="workorders-search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Traži nalog, kupca ili projekt…"/></label><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option>Svi statusi</option>{statuses.map(s => <option key={s}>{s}</option>)}</select></div></div>
      <div className="workorders-cards">{filtered.map(order => <article className="workorder-card" key={order.id}>
        <button className="workorder-card-head" onClick={() => setExpanded(expanded === order.id ? '' : order.id)} aria-expanded={expanded === order.id}>
          <span className="workorder-id">{order.id}</span><span className={'workorder-status status-' + order.status.toLowerCase().replaceAll(' ', '-')}>{order.status}</span><span className="workorder-title">{order.project}</span><span className="workorder-customer"><UserRound size={14}/>{order.customer}</span><span className="workorder-material">{order.material}</span><span className="workorder-due"><CalendarDays size={14}/>{order.due || 'Rok nije određen'}</span><ChevronDown size={17} className={expanded === order.id ? 'workorder-chevron open' : 'workorder-chevron'}/>
        </button>
        {expanded === order.id && <div className="workorder-details">
          <div className="workorder-detail-top"><div><strong>Komadi za izradu</strong><p>{order.pieces.length} stavki · ukupno {order.pieces.reduce((n,p) => n + p.quantity,0)} komada</p></div><label>Status naloga<select value={order.status} onChange={e => changeStatus(order.id, e.target.value)}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label></div>
          <div className="workorder-pieces-wrap"><table className="workorder-pieces"><thead><tr><th>Opis komada</th><th>Duljina (cm)</th><th>Širina (cm)</th><th>Debljina (cm)</th><th>Količina</th></tr></thead><tbody>{order.pieces.map((p,i) => <tr key={i}><td>{p.name}</td><td>{p.length}</td><td>{p.width}</td><td>{p.thickness}</td><td>{p.quantity}</td></tr>)}</tbody></table></div>
          {order.note && <p className="workorder-note"><strong>Napomena:</strong> {order.note}</p>}
          <div className="workorder-card-footer"><span><Hammer size={15}/> Sljedeći korak: priprema i evidentiranje pilanja</span><button className="button button-danger-light" onClick={() => removeOrder(order.id)}><Trash2 size={15}/> Ukloni nalog</button></div>
        </div>}
      </article>)}
      {!filtered.length && <div className="workorders-empty"><ClipboardList size={28}/><strong>Nema naloga za odabrani filter</strong><span>Promijeni pretragu ili izradi novi radni nalog.</span></div>}</div>
      <p className="workorders-footnote">Radni nalozi spremaju se u ovu preglednicu. Još nisu sinkronizirani s drugim uređajima niti povezani sa skladištem.</p>
    </section>
    {showForm && <div className="workorders-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false); }}><section className="workorders-modal" role="dialog" aria-modal="true" aria-labelledby="workorders-form-title">
      <div className="workorders-modal-head"><div><span className="eyebrow">NOVI PROJEKT</span><h2 id="workorders-form-title">Izradi radni nalog</h2><p>Unesi osnovne podatke i popis komada za pilanje.</p></div><button className="icon-button" onClick={() => setShowForm(false)} aria-label="Zatvori"><X size={20}/></button></div>
      <form onSubmit={createOrder}>
        <div className="workorders-form-grid"><label>Kupac *<input value={form.customer} onChange={e => updateForm('customer',e.target.value)} placeholder="Naziv kupca ili tvrtke"/></label><label>Naziv projekta *<input value={form.project} onChange={e => updateForm('project',e.target.value)} placeholder="Npr. kuhinjska ploča"/></label><label>Materijal *<input value={form.material} onChange={e => updateForm('material',e.target.value)} placeholder="Npr. granit, mramor"/></label><label>Rok izrade<input type="date" value={form.due} onChange={e => updateForm('due',e.target.value)}/></label></div>
        <div className="workorders-piece-head"><div><h3>Popis komada</h3><p>Dimenzije u centimetrima.</p></div><button type="button" className="button button-secondary" onClick={() => setPieces(prev => [...prev, blankPiece()])}><Plus size={15}/> Dodaj komad</button></div>
        {pieces.map((p,index) => <div className="workorders-piece-form" key={index}><label className="piece-name">Opis komada<input value={p.name} onChange={e => updatePiece(index,'name',e.target.value)} placeholder="Npr. gazište, klupčica"/></label><label>Duljina<input type="number" min="0.1" step="0.1" value={p.length} onChange={e => updatePiece(index,'length',e.target.value)} placeholder="cm"/></label><label>Širina<input type="number" min="0.1" step="0.1" value={p.width} onChange={e => updatePiece(index,'width',e.target.value)} placeholder="cm"/></label><label>Debljina<input type="number" min="0.1" step="0.1" value={p.thickness} onChange={e => updatePiece(index,'thickness',e.target.value)}/></label><label>Količina<input type="number" min="1" step="1" value={p.quantity} onChange={e => updatePiece(index,'quantity',e.target.value)}/></label>{pieces.length > 1 && <button type="button" className="piece-remove" onClick={() => setPieces(prev => prev.filter((_,i) => i !== index))} aria-label="Ukloni komad"><X size={16}/></button>}</div>)}
        <label className="workorders-note-label">Napomena<textarea value={form.note} onChange={e => updateForm('note',e.target.value)} rows="2" placeholder="Posebne upute, rubovi, završna obrada…"/></label>
        {error && <p className="workorders-error">{error}</p>}
        <div className="workorders-modal-footer"><button type="button" className="button button-secondary" onClick={() => setShowForm(false)}>Odustani</button><button type="submit" className="button button-primary"><Plus size={16}/> Izradi nalog</button></div>
      </form>
    </section></div>}
  </div>;
}
