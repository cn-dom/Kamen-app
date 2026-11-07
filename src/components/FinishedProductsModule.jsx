import React, { useEffect, useMemo, useState } from 'react';
import { PackageCheck, Plus, Search, X, Ruler, Boxes, Hammer, ClipboardList, Image as ImageIcon, CheckCircle2 } from 'lucide-react';

const STORAGE_KEY = 'kamen-app-finished-products-v1';
const ORDERS_KEY = 'kamen-app-work-orders-v1';
const MATERIALS_KEY = 'kamen-app-materials-v1';
const MOVEMENTS_KEY = 'kamen-app-movements-v1';
const categories = ['Spomenik', 'Postolje', 'Vaza', 'Svijećnjak', 'Tanjur', 'Poklopna ploča', 'Obloga', 'Vertikala', 'Kutni element', 'Gazište', 'Čelo stepenice', 'Poklopnica', 'Vanjska klupica', 'Unutarnja klupica', 'Ostalo'];
const processes = ['Rezanje', 'Ravnanje', 'Štokanje', 'Brušenje', 'Poliranje', 'Fazetiranje', 'Profiliranje', 'Bušenje', 'CNC obrada', 'Lijepljenje', 'Impregnacija', 'Ostalo'];
const statuses = ['Na zalihi', 'Rezerviran', 'Čeka ugradnju', 'Ugrađen', 'Prodano'];
const emptyForm = { name: '', category: 'Spomenik', customCategory: '', material: '', length: '', width: '', thickness: '', quantity: '1', unit: 'kom', processes: [], status: 'Na zalihi', orderId: '', customer: '', location: '', price: '', photo: '', note: '' };

function readJson(key, fallback) {
  try { const value = window.localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
  catch { return fallback; }
}

export default function FinishedProductsModule({ onBack }) {
  const [items, setItems] = useState(() => readJson(STORAGE_KEY, []));
  const [orders, setOrders] = useState(() => readJson(ORDERS_KEY, []));
  const [materials, setMaterials] = useState(() => readJson(MATERIALS_KEY, []));
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Sve');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [stockAction, setStockAction] = useState(null);
  const [actionQuantity, setActionQuantity] = useState('1');
  const [actionError, setActionError] = useState('');
  const [actionReason, setActionReason] = useState('');

  useEffect(() => { try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* Storage unavailable. */ } }, [items]);
  useEffect(() => {
    const syncStocktake = event => { if (Array.isArray(event.detail)) setItems(event.detail); };
    window.addEventListener('kamen:finished-products-updated', syncStocktake);
    return () => window.removeEventListener('kamen:finished-products-updated', syncStocktake);
  }, []);
  useEffect(() => {
    const refresh = () => { setOrders(readJson(ORDERS_KEY, [])); setMaterials(readJson(MATERIALS_KEY, [])); };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  const visible = useMemo(() => items.filter(item => {
    const haystack = [item.id, item.name, item.category, item.material, item.customer, item.orderId, item.location, ...(item.processes || [])].join(' ').toLocaleLowerCase('hr');
    return (!query || haystack.includes(query.toLocaleLowerCase('hr'))) && (filter === 'Sve' || item.status === filter);
  }), [items, query, filter]);

  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const toggleProcess = process => setForm(current => ({ ...current, processes: current.processes.includes(process) ? current.processes.filter(p => p !== process) : [...current.processes, process] }));

  function saveItem(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.material || !form.location.trim() || Number(form.quantity) <= 0) {
      setError('Unesi naziv, materijal, pozitivnu količinu i lokaciju proizvoda.');
      return;
    }
    const order = orders.find(row => row.id === form.orderId);
    const category = form.category === 'Ostalo' ? (form.customCategory.trim() || 'Ostalo') : form.category;
    const item = {
      ...form,
      id: 'GP-' + Date.now().toString().slice(-8),
      stockQuantity: form.status === 'Ugrađen' || form.status === 'Prodano' ? 0 : Number(form.quantity),
      name: form.name.trim(),
      category,
      quantity: Number(form.quantity),
      length: form.length === '' ? null : Number(form.length),
      width: form.width === '' ? null : Number(form.width),
      thickness: form.thickness === '' ? null : Number(form.thickness),
      price: form.price === '' ? null : Number(form.price),
      customer: form.customer.trim() || order?.customer || '',
      orderId: form.orderId,
      createdAt: new Date().toISOString()
    };
    setItems(current => [item, ...current]);
    setForm(emptyForm);
    setError('');
    setShowForm(false);
  }

  const updateStatus = (id, status) => {
    const item = items.find(row => row.id === id);
    if (!item || item.status === status || ['Ugrađen', 'Prodano'].includes(item.status) || ['Ugrađen', 'Prodano'].includes(status)) return;
    setItems(current => current.map(row => row.id === id ? { ...row, status, updatedAt: new Date().toISOString() } : row));
  };

  const openStockAction = (item, kind, direction = null) => {
    setStockAction({ id: item.id, kind, direction });
    setActionQuantity('1');
    setActionReason('');
    setActionError('');
  };

  const confirmStockAction = event => {
    event.preventDefault();
    const item = items.find(row => row.id === stockAction?.id);
    const quantity = Number(actionQuantity);
    const available = item ? Number(item.stockQuantity ?? item.quantity) : 0;
    const isAdjustment = ['Povrat', 'Korekcija'].includes(stockAction?.kind);
    const isDecrease = isAdjustment && stockAction.direction === 'minus';
    const isInstall = stockAction?.kind === 'Ugradnja';
    const isSale = stockAction?.kind === 'Prodaja';
    const wholeUnit = item && ['kom', 'par', 'set'].includes(item.unit);
    const exceedsStock = (isSale || isInstall || isDecrease) && quantity > available;
    if (!item || !Number.isFinite(quantity) || quantity <= 0 || exceedsStock || (wholeUnit && !Number.isInteger(quantity))) {
      setActionError(wholeUnit ? 'Unesi cijeli broj koji nije veći od raspoložive količine.' : 'Unesi valjanu količinu; kod izdavanja ili umanjenja ne može biti veća od raspoložive zalihe.');
      return;
    }
    if (isAdjustment && !actionReason.trim()) {
      setActionError('Za povrat ili korekciju obavezno upiši razlog.');
      return;
    }
    const delta = isAdjustment ? (isDecrease ? -quantity : quantity) : -quantity;
    const remaining = Math.max(0, Number((available + delta).toFixed(4)));
    const timestamp = new Date().toISOString();
    const kind = isAdjustment
      ? (stockAction.kind === 'Povrat' ? 'Povrat gotovog proizvoda' : (isDecrease ? 'Korekcija zalihe (-)' : 'Korekcija zalihe (+)'))
      : stockAction.kind;
    const transaction = { id: item.id + '-' + timestamp, kind, quantity: isAdjustment ? delta : quantity, reason: actionReason.trim(), date: timestamp };
    const wasClosed = ['Ugrađen', 'Prodano'].includes(item.status);
    setItems(current => current.map(row => row.id !== item.id ? row : {
      ...row,
      stockQuantity: remaining,
      status: remaining === 0 && (isSale || isInstall)
        ? (isInstall ? 'Ugrađen' : 'Prodano')
        : (wasClosed && isAdjustment && remaining > 0 ? 'Na zalihi' : row.status),
      installedQuantity: Number(row.installedQuantity || 0) + (isInstall ? quantity : 0),
      soldQuantity: Number(row.soldQuantity || 0) + (isSale ? quantity : 0),
      transactions: [...(row.transactions || []), transaction],
      updatedAt: timestamp
    }));
    try {
      const movements = readJson(MOVEMENTS_KEY, []);
      window.localStorage.setItem(MOVEMENTS_KEY, JSON.stringify([{
        id: transaction.id, material: item.name, kind, quantity: transaction.quantity,
        reason: actionReason.trim(), location: item.location || '', date: new Date(timestamp).toLocaleDateString('hr-HR'),
        productId: item.id, orderId: item.orderId || ''
      }, ...movements].slice(0, 100)));
    } catch { /* The product balance is saved independently; local movement history may be unavailable. */ }
    setStockAction(null);
    setActionError('');
    setActionReason('');
  };
  const availableQuantity = item => Number(item.stockQuantity ?? ((item.status === 'Ugrađen' || item.status === 'Prodano') ? 0 : item.quantity));
  const count = status => items.filter(item => item.status === status).reduce((sum, item) => sum + availableQuantity(item), 0);
  const total = items.reduce((sum, item) => sum + availableQuantity(item), 0);

  return <div className="page-content module-page finished-products-page">
    <section className="welcome-row module-welcome">
      <div><div className="eyebrow"><span className="live-dot"/> ZALIHA GOTOVIH ELEMENATA</div><h1>Gotovi proizvodi</h1><p className="subtitle">Evidencija izrađenih kamenih elemenata koji čekaju kupca, prodaju ili ugradnju.</p></div>
      <div className="welcome-actions"><button className="button button-secondary" onClick={onBack}>← Povratak na pregled</button><button className="button button-primary" onClick={() => { setOrders(readJson(ORDERS_KEY, [])); setMaterials(readJson(MATERIALS_KEY, [])); setError(''); setShowForm(true); }}><Plus size={16}/> Ručni unos proizvoda</button></div>
    </section>

    <section className="stats-grid warehouse-stats finished-stats">
      <article className="stat-card"><div className="stat-top"><span>Ukupno elemenata</span><span className="stat-icon blue-icon"><Boxes size={18}/></span></div><div className="stat-value">{total}<span className="stat-unit">komada</span></div><div className="stat-foot">U evidenciji gotovih proizvoda</div></article>
      <article className="stat-card"><div className="stat-top"><span>Na zalihi</span><span className="stat-icon green-icon"><PackageCheck size={18}/></span></div><div className="stat-value">{count('Na zalihi')}<span className="stat-unit">komada</span></div><div className="stat-foot">Slobodno za prodaju ili rezervaciju</div></article>
      <article className="stat-card"><div className="stat-top"><span>Čeka ugradnju</span><span className="stat-icon amber-icon"><Hammer size={18}/></span></div><div className="stat-value">{count('Čeka ugradnju')}<span className="stat-unit">komada</span></div><div className="stat-foot">Pripremljeno za teren</div></article>
      <article className="stat-card"><div className="stat-top"><span>Rezervirano</span><span className="stat-icon violet-icon"><ClipboardList size={18}/></span></div><div className="stat-value">{count('Rezerviran')}<span className="stat-unit">komada</span></div><div className="stat-foot">Dodijeljeno kupcu ili projektu</div></article>
    </section>

    <section className="panel warehouse-panel">
      <div className="panel-heading"><div><h2>Popis gotovih elemenata</h2><p>Svaki element vodi se zasebno, s vlastitim dimenzijama, obradama, količinom i statusom.</p></div><span className="demo-label"><span/> LOKALNA EVIDENCIJA</span></div>
      <div className="warehouse-toolbar">
        <label className="warehouse-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Traži naziv, vrstu, kupca, nalog ili lokaciju..."/></label>
        <label className="warehouse-filter"><span>Status</span><select value={filter} onChange={e => setFilter(e.target.value)}><option>Sve</option>{statuses.map(status => <option key={status}>{status}</option>)}</select></label>
      </div>
      <div className="finished-product-grid">
        {visible.map(item => <article className="finished-product-card" key={item.id}>
          {item.photo ? <img className="finished-product-photo" src={item.photo} alt={item.name}/> : <div className="finished-product-placeholder"><ImageIcon size={24}/><span>Fotografija nije dodana</span></div>}
          <div className="finished-product-content">
            <div className="finished-product-top"><span className="workorder-id">{item.id}</span><span className={'finished-status finished-status-' + item.status.toLowerCase().replaceAll(' ', '-')}>{item.status}</span></div>
            <h3>{item.name}</h3><p className="finished-product-category">{item.category} · {item.material}</p>
            <div className="finished-product-specs"><span><Ruler size={14}/>{[item.length, item.width, item.thickness].some(v => v) ? [item.length, item.width, item.thickness].map(v => v || '—').join(' × ') + ' cm' : 'Dimenzije nisu unesene'}</span><strong>{availableQuantity(item)} {item.unit} na zalihi</strong></div>
            {item.processes?.length > 0 && <div className="finished-process-list">{item.processes.map(p => <span key={p}>{p}</span>)}</div>}
            <div className="finished-product-meta">{item.orderId && <span>Nalog: {item.orderId}</span>}{item.customer && <span>Kupac: {item.customer}</span>}<span>Lokacija: {item.location}</span></div>
            {item.note && <p className="finished-product-note">{item.note}</p>}
            <div className="finished-stock-actions">
              {['Ugrađen', 'Prodano'].includes(item.status) ? <span className="finished-status-control">Stavka je zatvorena · preostalo 0</span> : <label className="finished-status-control">Status<select value={item.status} onChange={e => updateStatus(item.id, e.target.value)}>{statuses.filter(status => !['Ugrađen', 'Prodano'].includes(status)).map(status => <option key={status}>{status}</option>)}</select></label>}
              <div className="finished-stock-action-buttons">
                <button type="button" className="button button-secondary" disabled={availableQuantity(item) <= 0} onClick={() => openStockAction(item, 'Prodaja')}>Evidentiraj prodaju</button>
                <button type="button" className="button button-primary" disabled={availableQuantity(item) <= 0} onClick={() => openStockAction(item, 'Ugradnja')}>Evidentiraj ugradnju</button>
                <button type="button" className="button button-secondary" onClick={() => openStockAction(item, 'Povrat')}>Povrat u zalihu</button>
                <button type="button" className="button button-secondary" onClick={() => openStockAction(item, 'Korekcija', 'plus')}>Korekcija +</button>
                <button type="button" className="button button-secondary" disabled={availableQuantity(item) <= 0} onClick={() => openStockAction(item, 'Korekcija', 'minus')}>Korekcija −</button>
              </div>
              {(Number(item.soldQuantity || 0) > 0 || Number(item.installedQuantity || 0) > 0) && <small className="finished-product-note">Prodano: {Number(item.soldQuantity || 0)} · Ugrađeno: {Number(item.installedQuantity || 0)}</small>}
            </div>
          </div>
        </article>)}
        {!visible.length && <div className="workorders-empty finished-empty"><PackageCheck size={28}/><strong>{items.length ? 'Nema proizvoda za odabrani prikaz' : 'Još nema evidentiranih gotovih proizvoda'}</strong><span>{items.length ? 'Promijeni pretragu ili status.' : 'Ovdje ručno unesi već izrađene spomenike, vaze, stepenice, klupice i svaki drugi gotovi kameni element.'}</span><button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={15}/> Dodaj prvi proizvod</button></div>}
      </div>
      <div className="panel-foot"><span>Prikazano {visible.length} od {items.length} stavki</span><span>Podaci se spremaju lokalno u ovaj preglednik.</span></div>
    </section>
    <div className="module-notice"><PackageCheck size={17}/><span>Ručni unos služi za popis postojeće gotove robe. Materijal se upisuje prema stvarnoj zalihi. Prodaja i ugradnja evidentiraju se zasebno, uz unos stvarno potrošene količine; preostala količina ostaje na zalihi. Podaci su lokalni u ovom pregledniku.</span></div>

    {showForm && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false); }}><section className="modal finished-product-modal" role="dialog" aria-modal="true" aria-labelledby="finished-form-title">
      <div className="modal-head"><div><span className="modal-kicker">GOTOVI PROIZVODI · RUČNI UNOS</span><h2 id="finished-form-title">Dodaj gotovi element</h2><p>Unesi jedan element ili komad. Za različite dijelove koristi zasebne stavke.</p></div><button className="icon-button" onClick={() => setShowForm(false)} aria-label="Zatvori"><X size={19}/></button></div>
      <form onSubmit={saveItem}>
        <label>Naziv elementa *<input autoFocus value={form.name} onChange={e => update('name', e.target.value)} placeholder="Npr. Spomenik obitelji Horvat, gazište 1..." required/></label>
        <div className="form-row"><label>Vrsta elementa<select value={form.category} onChange={e => update('category', e.target.value)}>{categories.map(category => <option key={category}>{category}</option>)}</select></label>{form.category === 'Ostalo' && <label>Vlastita vrsta<input value={form.customCategory} onChange={e => update('customCategory', e.target.value)} placeholder="Upiši novu vrstu"/></label>}</div>
        <div className="form-row"><label>Materijal *<input list="warehouse-material-options" value={form.material} onChange={e => update('material', e.target.value)} placeholder="Upiši materijal" required/><datalist id="warehouse-material-options">{materials.map(material => <option key={material.id} value={material.name}/>)}</datalist></label><label>Količina *<input type="number" min="1" step="1" value={form.quantity} onChange={e => update('quantity', e.target.value)} required/></label></div>
        <div className="form-row"><label>Duljina (cm)<input type="number" min="0" step="0.1" value={form.length} onChange={e => update('length', e.target.value)} placeholder="Nije obavezno"/></label><label>Širina (cm)<input type="number" min="0" step="0.1" value={form.width} onChange={e => update('width', e.target.value)} placeholder="Nije obavezno"/></label><label>Debljina (cm)<input type="number" min="0" step="0.1" value={form.thickness} onChange={e => update('thickness', e.target.value)} placeholder="Nije obavezno"/></label></div>
        <div className="form-row"><label>Jedinica<select value={form.unit} onChange={e => update('unit', e.target.value)}><option>kom</option><option>par</option><option>set</option><option>m²</option><option>m</option></select></label><label>Prodajna cijena (€)<input type="number" min="0" step="0.01" value={form.price} onChange={e => update('price', e.target.value)} placeholder="Opcionalno"/></label></div>
        <fieldset className="finished-process-fieldset"><legend>Obrade na ovom elementu (može više)</legend><div className="finished-process-options">{processes.map(process => <label key={process}><input type="checkbox" checked={form.processes.includes(process)} onChange={() => toggleProcess(process)}/><span>{process}</span></label>)}</div></fieldset>
        <div className="form-row"><label>Status<select value={form.status} onChange={e => update('status', e.target.value)}>{statuses.map(status => <option key={status}>{status}</option>)}</select></label><label>Lokacija u skladištu *<input value={form.location} onChange={e => update('location', e.target.value)} placeholder="Npr. hala A, stalak 2" required/></label></div>
        <label>Povezani radni nalog (nije obavezno)<select value={form.orderId} onChange={e => { const order = orders.find(row => row.id === e.target.value); setForm(current => ({ ...current, orderId: e.target.value, customer: order?.customer || current.customer })); }}><option value="">Bez povezanog naloga</option>{orders.map(order => <option key={order.id} value={order.id}>{order.id} — {order.project} · {order.customer}</option>)}</select></label>
        <label>Kupac / naručitelj<input value={form.customer} onChange={e => update('customer', e.target.value)} placeholder="Opcionalno ako nije povezan nalog"/></label>
        <label>Fotografija (URL)<input type="url" value={form.photo} onChange={e => update('photo', e.target.value)} placeholder="https://..."/></label>
        <label>Napomena<textarea rows="2" value={form.note} onChange={e => update('note', e.target.value)} placeholder="Boja, profil, posebna obrada, stanje..."/></label>
        {error && <p className="workorders-error">{error}</p>}
        <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setShowForm(false)}>Odustani</button><button type="submit" className="button button-primary"><Plus size={16}/> Spremi proizvod</button></div>
      </form>
    </section></div>}
    {stockAction && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setStockAction(null); }}>
      <section className="modal finished-product-modal stock-action-modal" role="dialog" aria-modal="true" aria-labelledby="stock-action-title">
        <div className="modal-head"><div><span className="modal-kicker">PROMJENA ZALIHE · KONTROLIRANA EVIDENCIJA</span><h2 id="stock-action-title">{stockAction.kind === 'Ugradnja' ? 'Evidentiraj ugradnju' : stockAction.kind === 'Prodaja' ? 'Evidentiraj prodaju' : stockAction.kind === 'Povrat' ? 'Povrat u zalihu' : 'Korekcija zalihe'}</h2><p>{items.find(item => item.id === stockAction.id)?.name} · raspoloživo {availableQuantity(items.find(item => item.id === stockAction.id) || {})}</p></div><button className="icon-button" type="button" onClick={() => setStockAction(null)} aria-label="Zatvori"><X size={19}/></button></div>
        <form onSubmit={confirmStockAction}>
          <label>{stockAction.kind === 'Korekcija' ? (stockAction.direction === 'minus' ? 'Umanji zalihu za' : 'Povećaj zalihu za') : stockAction.kind === 'Povrat' ? 'Vrati na zalihu' : 'Količina'} {items.find(item => item.id === stockAction.id)?.unit || ''} *
            <input autoFocus type="number" min="0.01" step={['kom', 'par', 'set'].includes(items.find(item => item.id === stockAction.id)?.unit) ? '1' : '0.01'} max={['Prodaja', 'Ugradnja'].includes(stockAction.kind) || (stockAction.kind === 'Korekcija' && stockAction.direction === 'minus') ? availableQuantity(items.find(item => item.id === stockAction.id) || {}) : undefined} value={actionQuantity} onChange={e => setActionQuantity(e.target.value)} required/>
          </label>
          {['Povrat', 'Korekcija'].includes(stockAction.kind) && <label>Razlog promjene *<textarea rows="3" value={actionReason} onChange={e => setActionReason(e.target.value)} placeholder={stockAction.kind === 'Povrat' ? 'Npr. kupac vratio nepreuzeti element...' : 'Npr. inventurna razlika, pogrešno evidentirana količina...'} required/></label>}
          <p className="field-hint">{stockAction.kind === 'Povrat' ? 'Povrat povećava zalihu. Ako je proizvod bio zatvoren, ponovno se otvara kao Na zalihi.' : stockAction.kind === 'Korekcija' ? 'Korekcija mijenja zalihu za unesenu količinu. Razlog se obvezno sprema u povijest.' : 'Skida se samo unesena količina. Ostatak ostaje na zalihi; status se zatvara tek kada raspoloživa količina dosegne nulu.'}</p>
          {actionError && <p className="workorders-error">{actionError}</p>}
          <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setStockAction(null)}>Odustani</button><button type="submit" className="button button-primary">Potvrdi promjenu</button></div>
        </form>
      </section>
    </div>}
  </div>;
}
