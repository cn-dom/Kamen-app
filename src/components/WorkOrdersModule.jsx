import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Plus, Search, X, CalendarDays, UserRound, Ruler, ChevronDown, CheckCircle2, Clock3, Hammer, Trash2, Wallet, Scissors, Boxes } from 'lucide-react';
import { isProductionOrderComplete } from '../lib/production.js';
import { calculateMaterialReservation } from '../lib/materialStock.js';
import { suggestRemnantAssignments } from '../lib/remnantPlanner.js';

const seedOrders = [];
const STORAGE_KEY = 'kamen-app-work-orders-v1';
const MATERIALS_KEY = 'kamen-app-materials-v1';
const PRODUCTION_KEY = 'kamen-app-production-stages-v1';
function readStoredOrders() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : seedOrders;
  } catch { return seedOrders; }
}

const blankForm = { customer: '', project: '', due: '', note: '' };
const parseQuantity = value => Number(String(value ?? '').trim().replace(',', '.'));
const calculateOrderAreaM2 = orderPieces => orderPieces.reduce((sum, piece) => sum + Number(piece.length || 0) * Number(piece.width || 0) * Number(piece.quantity || 0), 0) / 10000;
const money = value => new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));
const calculateSlabUsage = (stockItem, orderPieces) => calculateMaterialReservation(stockItem, orderPieces);
const blankPiece = () => ({ name: '', materialId: '', length: '', width: '', thickness: '3', quantity: '1' });
const statuses = ['U pripremi', 'Spreman za pilanje', 'U tijeku', 'Čeka kontrolu', 'Završen'];

export default function WorkOrdersModule({ onBack, openCreate = false, onCreateOpened }) {
  const [orders, setOrders] = useState(readStoredOrders);
  const [materials, setMaterials] = useState(() => { try { return JSON.parse(window.localStorage.getItem(MATERIALS_KEY) || '[]'); } catch { return []; } });
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Svi statusi');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [pieces, setPieces] = useState([blankPiece()]);
  const [expanded, setExpanded] = useState('');
  const [error, setError] = useState('');
  const [remnantSuggestion, setRemnantSuggestion] = useState('');
  useEffect(() => { try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders)); } catch { /* Browser storage may be disabled or full. */ } }, [orders]);
  useEffect(() => {
    if (!openCreate) return;
    try { setMaterials(JSON.parse(window.localStorage.getItem(MATERIALS_KEY) || '[]')); } catch { setMaterials([]); }
    setShowForm(true);
    setError('');
    onCreateOpened?.();
  }, [openCreate]);
  const filtered = useMemo(() => orders.filter(o => {
    const q = query.trim().toLowerCase();
    return (!q || [o.id, o.customer, o.project, o.material].some(v => v.toLowerCase().includes(q))) &&
      (statusFilter === 'Svi statusi' || (statusFilter === 'Otkazani' ? o.status === 'Otkazan' : o.status === statusFilter));
  }), [orders, query, statusFilter]);
  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const updatePiece = (index, key, value) => setPieces(prev => prev.map((p, i) => {
    if (i !== index) return p;
    const next = { ...p, [key]: value };
    if (['materialId', 'length', 'width', 'thickness', 'quantity'].includes(key)) delete next.remnantBoardKeys;
    return next;
  }));
  const applyRemnantSuggestions = () => {
    const suggestion = suggestRemnantAssignments(pieces, materials, { kerf: 0.4, trim: 1, allowRotation: true });
    if (!suggestion.assignedCount) {
      setRemnantSuggestion('Nije pronađen uporabni ostatak koji može primiti neki od odabranih komada. Izvorni odabir materijala nije promijenjen.');
      return;
    }
    setPieces(suggestion.pieces);
    const totalCopies = pieces.reduce((sum, piece) => sum + Math.max(0, Number(piece.quantity) || 0), 0);
    setRemnantSuggestion('Raspoređeno ' + suggestion.assignedCount + ' od ' + totalCopies + ' komada na uporabne ostatke. Preostali komadi ostaju na izvornom materijalu.');
  };
  const plateMaterials = materials.filter(item => ['Ploča', 'Ostatak'].includes(item.form) && !item.archived && Number(item.quantity || 0) > 0);
  const materialGroups = useMemo(() => {
    const groups = new Map();
    pieces.forEach((piece, index) => {
      const stock = plateMaterials.find(item => item.id === piece.materialId);
      if (!stock) return;
      if (!groups.has(stock.id)) groups.set(stock.id, { stock, pieces: [], areaM2: 0 });
      const group = groups.get(stock.id);
      group.pieces.push({ ...piece, sourceIndex: index });
      group.areaM2 += Number(piece.length || 0) * Number(piece.width || 0) * Number(piece.quantity || 0) / 10000;
    });
    return [...groups.values()].map(group => ({ ...group, materialQty: calculateSlabUsage(group.stock, group.pieces) }));
  }, [pieces, materials]);
  const calculatedAreaM2 = calculateOrderAreaM2(pieces);
  const calculatedMaterialCost = materialGroups.reduce((sum, group) => sum + (group.stock.pricePerM2 == null || group.stock.pricePerM2 === '' ? 0 : group.areaM2 * Number(group.stock.pricePerM2)), 0);
  const createOrder = (event) => {
    event.preventDefault();
    if (!form.customer.trim() || !form.project.trim()) {
      setError('Unesi kupca i naziv projekta.');
      return;
    }
    if (!pieces.length || pieces.some(p => !p.name.trim() || !p.materialId || Number(p.length) <= 0 || Number(p.width) <= 0 || Number(p.thickness) <= 0 || Number(p.quantity) <= 0)) {
      setError('Za svaki komad odaberi materijal te unesi naziv, dimenzije, debljinu i količinu.');
      return;
    }
    const allocations = materialGroups.map(group => ({ materialId: group.stock.id, material: group.stock.name, quantity: group.materialQty, areaM2: Math.round(group.areaM2 * 10000) / 10000, pricePerM2: group.stock.pricePerM2 == null || group.stock.pricePerM2 === '' ? null : Number(group.stock.pricePerM2), cost: group.stock.pricePerM2 == null || group.stock.pricePerM2 === '' ? null : Math.round(group.areaM2 * Number(group.stock.pricePerM2) * 100) / 100 }));
    if (!allocations.length || materialGroups.some(group => Number(group.stock?.length || 0) <= 0 || Number(group.stock?.width || 0) <= 0 || group.materialQty <= 0)) {
      setError('Za svaku stavku odaberi valjanu ploču ili uporabni ostatak iz skladišta s upisanim dimenzijama.');
      return;
    }
    for (const group of materialGroups) {
      if (group.pieces.some(piece => Number(piece.thickness) !== Number(group.stock.thickness))) {
        setError(`Debljina komada za materijal ${group.stock.name} mora odgovarati ploči (${group.stock.thickness} cm).`);
        return;
      }
      if (Number(group.stock.quantity) + 1e-9 < group.materialQty) {
        setError(`Nema dovoljno materijala ${group.stock.name}. Potrebno ${group.materialQty.toLocaleString('hr-HR')} ploča, dostupno ${Number(group.stock.quantity).toLocaleString('hr-HR')}.`);
        return;
      }
    }
    const id = 'RN-2026-' + String(Math.max(0, ...orders.map(o => Number(o.id.split('-').at(-1)) || 0)) + 1).padStart(3, '0');
    const reservationRecords = allocations.map(group => ({ materialId: group.materialId, material: group.material, form: group.stock.form || 'Ploča', quantity: group.quantity }));
    const order = { ...form, material: allocations.map(group => group.material).join(', '), materialAllocations: allocations, materialAreaM2: Math.round(calculatedAreaM2 * 10000) / 10000, estimatedMaterialCost: allocations.some(group => group.cost == null) ? null : Math.round(allocations.reduce((sum, group) => sum + group.cost, 0) * 100) / 100, reservedMaterials: reservationRecords, reservedMaterialId: allocations.length === 1 ? allocations[0].materialId : null, reservedMaterialQty: allocations.length === 1 ? allocations[0].quantity : 0, id, status: 'U pripremi', pieces: pieces.map(p => ({ ...p, length: Number(p.length), width: Number(p.width), thickness: Number(p.thickness), quantity: Number(p.quantity) })) };
    setOrders(prev => [order, ...prev]);
    const nextMaterials = materials.map(item => {
      const allocation = allocations.find(group => group.materialId === item.id);
      return allocation ? { ...item, quantity: Math.round((Number(item.quantity) - allocation.quantity) * 100) / 100 } : item;
    });
    setMaterials(nextMaterials);
    try { window.localStorage.setItem(MATERIALS_KEY, JSON.stringify(nextMaterials)); } catch {}
    try {
      const key = 'kamen-app-movements-v1';
      const log = JSON.parse(window.localStorage.getItem(key) || '[]');
      const entries = allocations.map((group, index) => ({ id: Date.now() + index, material: group.material, kind: 'Rezervacija za radni nalog', quantity: group.quantity, location: materials.find(item => item.id === group.materialId)?.location, orderId: id, date: new Date().toLocaleDateString('hr-HR') }));
      window.localStorage.setItem(key, JSON.stringify([...entries, ...log].slice(0, 100)));
    } catch {}
    setExpanded(id); setShowForm(false); setForm(blankForm); setPieces([blankPiece()]); setError('');
  };
  const changeStatus = (id, status) => {
    const order = orders.find(item => item.id === id);
    if (!order || order.status === 'Otkazan') return;
    if (status === 'Završen') {
      let productionRecords = {};
      try { productionRecords = JSON.parse(window.localStorage.getItem(PRODUCTION_KEY) || '{}'); } catch {}
      if (!isProductionOrderComplete(order, productionRecords)) {
        window.alert('Nalog se ne može završiti dok svaki fizički komad nema završene potrebne faze i potvrđenu kontrolu kvalitete u modulu Proizvodnja.');
        return;
      }
    }
    setOrders(prev => prev.map(item => item.id === id && item.status !== 'Otkazan' ? { ...item, status } : item));
  };
  const cancelOrder = (id) => {
    const order = orders.find(item => item.id === id);
    if (!order || order.status === 'Otkazan') return;
    const reservations = Array.isArray(order.reservedMaterials) ? order.reservedMaterials : (Number(order.reservedMaterialQty || 0) > 0 ? [{ materialId: order.reservedMaterialId, quantity: Number(order.reservedMaterialQty || 0) }] : []);
    const pending = reservations.filter(item => Number(item.quantity || 0) > 0);
    const missing = pending.filter(reservation => !materials.some(item => item.id === reservation.materialId));
    if (missing.length) { window.alert('Jedan ili više rezerviranih materijala nije pronađen u skladištu. Nalog nije otkazan.'); return; }
    const explanation = pending.length ? 'Neiskorištene rezervacije svih materijala bit će vraćene u skladište.' : 'Već utrošeni materijal neće se vraćati.';
    if (!window.confirm('Otkazati nalog ' + order.id + '? ' + explanation)) return;
    if (pending.length) {
      const nextMaterials = materials.map(item => {
        const reserved = pending.filter(entry => entry.materialId === item.id).reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
        return reserved ? { ...item, quantity: Math.round((Number(item.quantity || 0) + reserved) * 100) / 100 } : item;
      });
      setMaterials(nextMaterials);
      try { window.localStorage.setItem(MATERIALS_KEY, JSON.stringify(nextMaterials)); } catch {}
      try {
        const key = 'kamen-app-movements-v1';
        const log = JSON.parse(window.localStorage.getItem(key) || '[]');
        const entries = pending.map((entry, index) => ({ id: Date.now() + index, material: entry.material || materials.find(item => item.id === entry.materialId)?.name || 'Materijal', kind: 'Povrat rezervacije - otkazivanje naloga', quantity: entry.quantity, location: materials.find(item => item.id === entry.materialId)?.location, orderId: order.id, date: new Date().toLocaleDateString('hr-HR') }));
        window.localStorage.setItem(key, JSON.stringify([...entries, ...log].slice(0, 100)));
      } catch {}
    }
    setOrders(prev => prev.map(item => item.id === id
      ? { ...item, status: 'Otkazan', reservedMaterialQty: 0, reservedMaterials: [], cancelledAt: new Date().toISOString() }
      : item));
  };
  const pieceCount = orders.reduce((sum, order) => sum + order.pieces.reduce((n, p) => n + p.quantity, 0), 0);
  return <div className="page-content workorders-page">
    <section className="welcome-row module-welcome">
      <div><div className="eyebrow"><span className="live-dot" /> PROJEKTI I EVIDENCIJA</div><h1>Radni nalozi</h1><p className="subtitle">Evidentiraj narudžbu, kupca i svaki komad koji treba izrezati ili obraditi.</p></div>
      <div className="workorders-actions"><button className="button button-secondary" onClick={onBack}>← Pregled</button><button className="button button-primary" onClick={() => { try { setMaterials(JSON.parse(window.localStorage.getItem(MATERIALS_KEY) || '[]')); } catch { setMaterials([]); } setShowForm(true); setError(''); setRemnantSuggestion(''); }}><Plus size={17}/> Novi radni nalog</button></div>
    </section>
    <section className="workorders-stats">
      <article className="panel workorders-stat"><span className="workorders-stat-icon blue"><ClipboardList size={19}/></span><div><small>Ukupno naloga</small><strong>{orders.length}</strong></div></article>
      <article className="panel workorders-stat"><span className="workorders-stat-icon amber"><Clock3 size={19}/></span><div><small>U tijeku</small><strong>{orders.filter(o => ['Spreman za pilanje','U tijeku','Čeka kontrolu'].includes(o.status)).length}</strong></div></article>
      <article className="panel workorders-stat"><span className="workorders-stat-icon green"><CheckCircle2 size={19}/></span><div><small>Završeni</small><strong>{orders.filter(o => o.status === 'Završen').length}</strong></div></article>
      <article className="panel workorders-stat"><span className="workorders-stat-icon purple"><Ruler size={19}/></span><div><small>Komada po nacrtu</small><strong>{pieceCount}</strong></div></article>
    </section>
    <section className="panel workorders-list-panel">
      <div className="workorders-list-head"><div><h2>Popis radnih naloga</h2><p>Otvori nalog za pregled komada i promjenu statusa.</p></div><div className="workorders-filters"><label className="workorders-search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Traži nalog, kupca ili projekt…"/></label><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option>Svi statusi</option>{statuses.map(s => <option key={s}>{s}</option>)}<option>Otkazani</option></select></div></div>
      <div className="workorders-cards">{filtered.map(order => <article className="workorder-card" key={order.id}>
        <button className="workorder-card-head" onClick={() => setExpanded(expanded === order.id ? '' : order.id)} aria-expanded={expanded === order.id}>
          <span className="workorder-id">{order.id}</span><span className={'workorder-status status-' + order.status.toLowerCase().replaceAll(' ', '-')}>{order.status}</span><span className="workorder-title">{order.project}</span><span className="workorder-customer"><UserRound size={14}/>{order.customer}</span><span className="workorder-material">{order.material}</span><span className="workorder-due"><CalendarDays size={14}/>{order.due || 'Rok nije određen'}</span><ChevronDown size={17} className={expanded === order.id ? 'workorder-chevron open' : 'workorder-chevron'}/>
        </button>
        {expanded === order.id && <div className="workorder-details">
          <div className="workorder-detail-top"><div><strong>Komadi za izradu</strong><p>{order.pieces.length} stavki · naručeno {order.pieces.reduce((n,p) => n + Number(p.quantity || 0),0)} komada · izrađeno {order.pieces.reduce((n,p) => n + Number(p.producedQuantity || 0),0)} · preostalo {order.pieces.reduce((n,p) => n + Math.max(0, Number(p.quantity || 0) - Number(p.producedQuantity || 0)),0)}</p>{order.estimatedMaterialCost != null && <p><strong>Procijenjeni trošak kamena: {money(order.estimatedMaterialCost)}</strong> · {Number(order.materialAreaM2 || 0).toLocaleString('hr-HR', { maximumFractionDigits: 4 })} m² · {Array.isArray(order.materialAllocations) ? order.materialAllocations.map(group => `${group.material}: ${Number(group.areaM2 || 0).toLocaleString('hr-HR')} m²`).join(' · ') : money(order.materialPricePerM2) + ' / m²'}</p>}</div><label>Status naloga<select value={order.status} disabled={order.status === 'Otkazan'} onChange={e => changeStatus(order.id, e.target.value)}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label></div>
          <div className="workorder-pieces-wrap"><table className="workorder-pieces"><thead><tr><th>Opis komada</th><th>Materijal</th><th>Duljina (cm)</th><th>Širina (cm)</th><th>Debljina (cm)</th><th>Naručeno</th><th>Izrađeno</th><th>Preostalo</th></tr></thead><tbody>{order.pieces.map((p,i) => { const produced = Number(p.producedQuantity || 0); const remaining = Math.max(0, Number(p.quantity || 0) - produced); return <tr key={i}><td>{p.name}</td><td>{p.material || materials.find(item => item.id === p.materialId)?.name || order.material || '—'}</td><td>{p.length}</td><td>{p.width}</td><td>{p.thickness}</td><td>{p.quantity}</td><td><strong>{produced}</strong></td><td><span className={remaining === 0 ? "piece-progress-done" : ""}>{remaining}</span></td></tr>; })}</tbody></table></div>
          {order.note && <p className="workorder-note"><strong>Napomena:</strong> {order.note}</p>}
          <div className="workorder-card-footer"><span><Hammer size={15}/> Sljedeći korak: priprema i evidentiranje pilanja</span>{order.status !== 'Otkazan' ? <button className="button button-danger-light" onClick={() => cancelOrder(order.id)}><Trash2 size={15}/> Otkaži nalog</button> : <span className="muted-icon">Nalog je otkazan · rezervacija je vraćena ako nije bila utrošena</span>}</div>
        </div>}
      </article>)}
      {!filtered.length && <div className="workorders-empty"><ClipboardList size={28}/><strong>Nema naloga za odabrani filter</strong><span>Promijeni pretragu ili izradi novi radni nalog.</span></div>}</div>
      <p className="workorders-footnote">Radni nalozi i rezervacije materijala spremaju se lokalno u ovu preglednicu; nisu sinkronizirani s drugim uređajima.</p>
    </section>
    {showForm && <div className="workorders-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false); }}><section className="workorders-modal" role="dialog" aria-modal="true" aria-labelledby="workorders-form-title">
      <div className="workorders-modal-head"><div><span className="eyebrow">NOVI PROJEKT</span><h2 id="workorders-form-title">Izradi radni nalog</h2><p>Unesi osnovne podatke i popis komada za pilanje.</p></div><button className="icon-button" onClick={() => setShowForm(false)} aria-label="Zatvori"><X size={20}/></button></div>
      <form onSubmit={createOrder}>
        <div className="workorders-form-grid"><label>Kupac *<input value={form.customer} onChange={e => updateForm('customer',e.target.value)} placeholder="Naziv kupca ili tvrtke"/></label><label>Naziv projekta *<input value={form.project} onChange={e => updateForm('project',e.target.value)} placeholder="Npr. kuhinjska ploča"/></label><label>Rok izrade<input type="date" value={form.due} onChange={e => updateForm('due',e.target.value)}/></label><div className="modal-note"><Ruler size={16}/><span>Sustav može rasporediti količinu iste stavke preko više ostataka. Komadi koji ne stanu ostaju na izvornoj ploči. Ostatci se rezerviraju kao cijeli fizički komadi; plan pilanja provjerava stvarni raspored. Površina svih komada: {calculatedAreaM2.toLocaleString('hr-HR', { maximumFractionDigits: 4 })} m².</span></div><div className="modal-note"><Wallet size={16}/><span>{materialGroups.length ? `Procijenjeni nabavni trošak materijala: ${money(calculatedMaterialCost)} (bez procjene za stavke bez unesene nabavne cijene).` : 'Odaberi materijal uz svaku stavku kako bi se izračunala rezervacija i trošak.'}</span></div></div>
        <div className="workorders-piece-head"><div><h3>Popis komada</h3><p>Unesi mjere koje je kupac naručio. Svaka stavka može biti od drugog materijala.</p></div><div className="workorders-actions"><button type="button" className="button button-secondary" onClick={applyRemnantSuggestions} disabled={!pieces.some(piece => piece.materialId && Number(piece.length) > 0 && Number(piece.width) > 0)}><Scissors size={15}/> Automatski rasporedi ostatke</button><button type="button" className="button button-secondary" onClick={() => { setPieces(prev => [...prev, blankPiece()]); setRemnantSuggestion(''); }}><Plus size={15}/> Dodaj komad</button></div></div>{remnantSuggestion && <div className="modal-note"><Boxes size={16}/><span>{remnantSuggestion} Plan koristi 1 cm rubnog obrezivanja i 0,4 cm širine reza.</span></div>}
        {pieces.map((p,index) => <div className="workorders-piece-form" key={index}><label className="piece-name">Opis komada<input value={p.name} onChange={e => updatePiece(index,'name',e.target.value)} placeholder="Npr. gazište, klupčica"/></label><label className="piece-material">Materijal<select value={p.materialId} onChange={e => { const stock = plateMaterials.find(item => item.id === e.target.value); setPieces(prev => prev.map((piece,i) => {
      if (i !== index) return piece;
      const next = { ...piece, materialId: e.target.value, thickness: stock?.thickness ? String(stock.thickness) : piece.thickness };
      delete next.remnantBoardKeys;
      return next;
    })); }}><option value="">Odaberi ploču ili ostatak</option>{plateMaterials.map(item => <option key={item.id} value={item.id}>{item.form === 'Ostatak' ? 'OSTATAK · ' : 'PLOČA · '}{item.name} · {item.length} × {item.width} × {item.thickness} cm · {Number(item.quantity).toLocaleString('hr-HR')} {item.unit}{item.pricePerM2 == null ? ' · bez nabavne cijene' : ' · ' + money(Number(item.pricePerM2)) + '/m²'}</option>)}</select></label><label>Duljina<input type="number" min="0.1" step="0.1" value={p.length} onChange={e => updatePiece(index,'length',e.target.value)} placeholder="cm"/></label><label>Širina<input type="number" min="0.1" step="0.1" value={p.width} onChange={e => updatePiece(index,'width',e.target.value)} placeholder="cm"/></label><label>Debljina<input type="number" min="0.1" step="0.1" value={p.thickness} onChange={e => updatePiece(index,'thickness',e.target.value)}/></label><label>Količina<input type="number" min="1" step="1" value={p.quantity} onChange={e => updatePiece(index,'quantity',e.target.value)}/></label>{pieces.length > 1 && <button type="button" className="piece-remove" onClick={() => setPieces(prev => prev.filter((_,i) => i !== index))} aria-label="Ukloni komad"><X size={16}/></button>}</div>)}
        <label className="workorders-note-label">Napomena<textarea value={form.note} onChange={e => updateForm('note',e.target.value)} rows="2" placeholder="Posebne upute, rubovi, završna obrada…"/></label>
        {error && <p className="workorders-error">{error}</p>}
        <div className="workorders-modal-footer"><button type="button" className="button button-secondary" onClick={() => setShowForm(false)}>Odustani</button><button type="submit" className="button button-primary"><Plus size={16}/> Izradi nalog</button></div>
      </form>
    </section></div>}
  </div>;
}
