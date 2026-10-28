import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Boxes, Check, ChevronDown, ClipboardCheck, Layers3, Plus, Search, Scissors, X } from 'lucide-react';

const seedMaterials = [
  { id: 'MAT-001', name: 'Brački kamen', type: 'Kamen', form: 'Ploča', thickness: 3, length: 280, width: 160, quantity: 8, unit: 'ploča', location: 'Stalak A1', min: 3, note: 'Svijetli brački kamen' },
  { id: 'MAT-002', name: 'Impala granit', type: 'Granit', form: 'Ploča', thickness: 2, length: 300, width: 180, quantity: 2, unit: 'ploča', location: 'Stalak B2', min: 3, note: 'Tamnosivi granit' },
  { id: 'MAT-003', name: 'Carrara mramor', type: 'Mramor', form: 'Ploča', thickness: 2, length: 250, width: 140, quantity: 5, unit: 'ploča', location: 'Stalak A3', min: 2, note: '' },
  { id: 'MAT-004', name: 'Brački kamen — ostatak', type: 'Kamen', form: 'Ostatak', thickness: 3, length: 95, width: 48, quantity: 4, unit: 'kom', location: 'Polica O1', min: 1, note: 'Upotrebljivi ostaci' },
  { id: 'MAT-005', name: 'Travertin — otpad', type: 'Otpad', form: 'Otpad', thickness: 2, length: 0, width: 0, quantity: 6, unit: 'kom', location: 'Kontejner', min: 0, note: 'Za zbrinjavanje' }
];

const MATERIALS_KEY = 'kamen-app-materials-v1';
const MOVEMENTS_KEY = 'kamen-app-movements-v1';
const WORK_ORDERS_KEY = 'kamen-app-work-orders-v1';
function readStored(key, fallback) {
  try { const saved = window.localStorage.getItem(key); return saved ? JSON.parse(saved) : fallback; }
  catch { return fallback; }
}

const emptyForm = { name: '', type: 'Kamen', form: 'Ploča', thickness: '3', length: '', width: '', quantity: '1', unit: 'ploča', location: '', min: '1', note: '' };

export default function WarehouseModule({ onBack, mode = 'warehouse' }) {
  const productionMode = mode === 'production';
  const [materials, setMaterials] = useState(() => readStored(MATERIALS_KEY, seedMaterials));
  const [movements, setMovements] = useState(() => readStored(MOVEMENTS_KEY, []));
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Sve');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [movement, setMovement] = useState(null);
  const [showCut, setShowCut] = useState(false);
  const sourceThicknessForCut = (items, id) => items.find(item => item.id === id)?.thickness ?? 0;
const newOutput = () => ({ id: 'OUT-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), name: '', type: 'Gotov komad', orderPieceIndex: '', length: '', width: '', thickness: '', quantity: '1', location: 'Polica O1', note: '' });
  const initialCutForm = () => ({ sourceId: 'MAT-001', orderId: '', usedQty: '1', note: '', outputs: [newOutput()] });
  const [cutForm, setCutForm] = useState(initialCutForm);
  const availableOrders = readStored(WORK_ORDERS_KEY, []).filter(order => order.status !== 'Završen');
  const [movementQty, setMovementQty] = useState('1');
  const [toast, setToast] = useState('');

  useEffect(() => { try { window.localStorage.setItem(MATERIALS_KEY, JSON.stringify(materials)); } catch { /* Browser storage may be disabled or full. */ } }, [materials]);
  useEffect(() => { try { window.localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(movements)); } catch { /* Browser storage may be disabled or full. */ } }, [movements]);

  const filtered = useMemo(() => materials.filter(item => {
    const matchesQuery = [item.id, item.name, item.location, item.type].join(' ').toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (category === 'Sve' || item.form === category);
  }), [materials, query, category]);

  const totalPieces = materials.reduce((sum, item) => sum + item.quantity, 0);
  const lowStock = materials.filter(item => item.form !== 'Otpad' && item.quantity <= item.min).length;
  const remnants = materials.filter(item => item.form === 'Ostatak').length;
  const updateForm = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const updateCutOutput = (id, key, value) => setCutForm(current => ({ ...current, outputs: current.outputs.map(output => output.id === id ? { ...output, [key]: value } : output) }));
  const addCutOutput = () => setCutForm(current => ({ ...current, outputs: [...current.outputs, { ...newOutput(), location: current.outputs[0]?.location || 'Polica O1' }] }));
  const removeCutOutput = id => setCutForm(current => ({ ...current, outputs: current.outputs.length > 1 ? current.outputs.filter(output => output.id !== id) : current.outputs }));
  const flash = message => { setToast(message); window.setTimeout(() => setToast(''), 2800); };

  function addMaterial(event) {
    event.preventDefault();
    const quantity = Number(form.quantity);
    if (!form.name.trim() || !form.location.trim() || !Number.isFinite(quantity) || quantity < 0) {
      flash('Provjeri naziv, lokaciju i količinu.');
      return;
    }
    const next = { ...form, id: 'MAT-' + String(Date.now()).slice(-6), thickness: Number(form.thickness) || 0, length: Number(form.length) || 0, width: Number(form.width) || 0, quantity, min: Number(form.min) || 0 };
    setMaterials(current => [next, ...current]);
    setShowForm(false);
    setForm(emptyForm);
    flash('Materijal je dodan u skladišnu evidenciju.');
  }

  function saveCut(event) {
    event.preventDefault();
    const source = materials.find(item => item.id === cutForm.sourceId);
    const usedQty = Number(cutForm.usedQty);
    if (!source || !Number.isInteger(usedQty) || usedQty < 1 || usedQty > source.quantity) {
      flash('Provjeri ulazni materijal i količinu za pilanje.');
      return;
    }
    const linkedOrder = cutForm.orderId ? readStored(WORK_ORDERS_KEY, []).find(order => order.id === cutForm.orderId && order.status !== 'Završen') : null;
    if (cutForm.orderId && !linkedOrder) { flash('Odabrani radni nalog više nije dostupan. Osvježi prikaz i pokušaj ponovno.'); return; }
    if (!cutForm.outputs.length || cutForm.outputs.some(output =>
      !output.name.trim() || !Number.isInteger(Number(output.quantity)) || Number(output.quantity) < 1 ||
      Number(output.length) < 0 || Number(output.width) < 0 || Number(output.thickness || source.thickness) <= 0 ||
      !output.location.trim() || output.length === '' || output.width === '' ||
      (linkedOrder && output.type === 'Gotov komad' && output.orderPieceIndex === '')
    )) {
      flash(linkedOrder ? 'Za gotove komade poveži izlaznu stavku s komadom iz radnog naloga te provjeri količinu i dimenzije.' : 'Za svaki izlazni komad unesi naziv, cijelu količinu, dimenzije i lokaciju.');
      return;
    }
    if (linkedOrder) {
      const planned = {};
      for (const output of cutForm.outputs.filter(item => item.type === 'Gotov komad')) {
        const pieceIndex = Number(output.orderPieceIndex);
        planned[pieceIndex] = (planned[pieceIndex] || 0) + Number(output.quantity);
      }
      const exceedsPlan = Object.entries(planned).some(([index, qty]) => qty > Math.max(0, Number(linkedOrder.pieces[Number(index)]?.quantity || 0) - Number(linkedOrder.pieces[Number(index)]?.producedQuantity || 0)));
      if (exceedsPlan) { flash('Količina gotovih komada prelazi preostalu naručenu količinu. Provjeri povezane komade.'); return; }
    }
    const timestamp = Date.now();
    const date = new Date().toLocaleDateString('hr-HR');
    const outputMaterials = cutForm.outputs.map((output, index) => {
      const kind = output.type;
      const formType = kind === 'Ostatak' ? 'Ostatak' : kind === 'Otpad' ? 'Otpad' : 'Komad';
      const materialType = kind === 'Otpad' ? 'Otpad' : source.type;
      return {
        id: 'MAT-' + String(timestamp + index).slice(-6),
        name: output.name.trim(),
        type: materialType,
        form: formType,
        thickness: Number(output.thickness || source.thickness),
        length: Number(output.length),
        width: Number(output.width),
        quantity: Number(output.quantity),
        unit: 'kom',
        location: output.location.trim(),
        min: 0,
        orderId: linkedOrder?.id || '',
        orderPieceIndex: linkedOrder && output.type === 'Gotov komad' ? Number(output.orderPieceIndex) : null,
        orderPieceName: linkedOrder && output.type === 'Gotov komad' ? linkedOrder.pieces[Number(output.orderPieceIndex)]?.name || '' : '',
        note: [cutForm.note.trim(), output.note.trim(), linkedOrder ? 'Radni nalog ' + linkedOrder.id : '', linkedOrder && output.type === 'Gotov komad' ? 'Komad: ' + (linkedOrder.pieces[Number(output.orderPieceIndex)]?.name || '') : '', 'Nastalo pilanjem materijala ' + source.id].filter(Boolean).join(' · ')
      };
    });
    setMaterials(current => [...current.map(item => item.id === source.id ? { ...item, quantity: item.quantity - usedQty } : item), ...outputMaterials]);
    const outputMovements = outputMaterials.map((item, index) => ({
      id: timestamp + index + 2,
      material: item.name,
      kind: item.form === 'Otpad' ? 'Nastali otpad' : item.form === 'Ostatak' ? 'Nastali ostatak' : 'Gotov komad',
      quantity: item.quantity,
      location: item.location,
      orderId: linkedOrder?.id || '',
      date
    }));
    setMovements(current => [
      { id: timestamp + 1, material: source.name, kind: 'Utrošak za pilanje', quantity: usedQty, location: source.location, orderId: linkedOrder?.id || '', date },
      ...outputMovements,
      ...current
    ].slice(0, 30));
    if (linkedOrder) {
      try {
        const currentOrders = JSON.parse(window.localStorage.getItem(WORK_ORDERS_KEY) || '[]');
        window.localStorage.setItem(WORK_ORDERS_KEY, JSON.stringify(currentOrders.map(order => {
          if (order.id !== linkedOrder.id) return order;
          const updatedPieces = (order.pieces || []).map((piece, index) => {
            const added = outputMaterials.filter(item => item.form === 'Komad' && item.orderPieceIndex === index).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
            return added ? { ...piece, producedQuantity: Number(piece.producedQuantity || 0) + added } : piece;
          });
          const allProduced = updatedPieces.every(piece => Number(piece.producedQuantity || 0) >= Number(piece.quantity || 0));
          return { ...order, pieces: updatedPieces, status: allProduced ? 'Čeka kontrolu' : 'U tijeku' };
        })));
      } catch { /* The cutting record remains saved locally even if order status cannot be updated. */ }
    }
    setShowCut(false);
    setCutForm(initialCutForm());
    flash('Pilanje evidentirano: ' + outputMaterials.length + ' izlaznih stavki dodano je u skladište.');
  }

  function saveMovement(event) {
    event.preventDefault();
    const qty = Number(movementQty);
    if (!movement || !Number.isInteger(qty) || qty < 1) { flash('Količina mora biti cijeli broj veći od nule.'); return; }
    const item = materials.find(row => row.id === movement.id);
    if (!item) return;
    if (movement.kind === 'Izdavanje' && qty > item.quantity) { flash('Nema dovoljno zalihe za izdavanje.'); return; }
    setMaterials(current => current.map(row => row.id === movement.id ? { ...row, quantity: row.quantity + (movement.kind === 'Zaprimanje' ? qty : -qty) } : row));
    setMovements(current => [{ id: Date.now(), material: item.name, kind: movement.kind, quantity: qty, location: item.location, date: new Date().toLocaleDateString('hr-HR') }, ...current].slice(0, 8));
    setMovement(null);
    setMovementQty('1');
    flash(movement.kind + ' je evidentirano u oglednom prikazu.');
  }

  return (
    <div className="page-content module-page warehouse-page">
      <section className="welcome-row module-welcome">
        <div><div className="eyebrow"><span className="live-dot" /> {productionMode ? 'RADIONICA I OBRADA' : 'MATERIJAL I ZALIHE'}</div><h1>{productionMode ? 'Proizvodnja i pilanje' : 'Skladište'}</h1><p className="subtitle">{productionMode ? 'Poveži pilanje s radnim nalogom, evidentiraj gotove komade, ostatke i otpad te automatski ažuriraj stanje materijala.' : 'Evidencija kamenih ploča, komada, ostataka i otpada na jednome mjestu.'}</p></div>
        <div className="welcome-actions"><button className="button button-secondary" onClick={onBack}>← Povratak na pregled</button><button className="button button-secondary" onClick={() => setShowCut(true)}><Scissors size={16}/> {productionMode ? 'Novi nalog za pilanje' : 'Evidentiraj pilanje'}</button><button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={16}/> Novi materijal</button></div>
      </section>

      <section className="stats-grid warehouse-stats">
        <article className="stat-card"><div className="stat-top"><span>Stavke u evidenciji</span><span className="stat-icon blue-icon"><Boxes size={18}/></span></div><div className="stat-value">{materials.length}<span className="stat-unit">stavki</span></div><div className="stat-foot">Materijali, ostaci i otpad</div></article>
        <article className="stat-card"><div className="stat-top"><span>Ukupna količina</span><span className="stat-icon green-icon"><Layers3 size={18}/></span></div><div className="stat-value">{totalPieces}<span className="stat-unit">kom / ploča</span></div><div className="stat-foot">Zbroj evidentiranih jedinica</div></article>
        <article className="stat-card"><div className="stat-top"><span>Niska zaliha</span><span className="stat-icon red-icon"><ArrowDownToLine size={18}/></span></div><div className="stat-value">{lowStock}<span className="stat-unit">stavki</span></div><div className="stat-foot">Na ili ispod minimalne količine</div></article>
        <article className="stat-card"><div className="stat-top"><span>Upotrebljivi ostaci</span><span className="stat-icon violet-icon"><ClipboardCheck size={18}/></span></div><div className="stat-value">{remnants}<span className="stat-unit">stavki</span></div><div className="stat-foot">Odvojeno od punih ploča</div></article>
      </section>

      <section className="panel warehouse-panel">
        <div className="panel-heading"><div><div className="panel-title-line"><h2>Stanje materijala</h2><span className="count-pill">{filtered.length}</span></div><p>Pretraži zalihu i pregledaj lokacije ili evidentiraj kretanje.</p></div><span className="demo-label"><span/> OGLEDNI PODACI</span></div>
        <div className="warehouse-toolbar">
          <label className="warehouse-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Traži materijal, šifru ili lokaciju..."/></label>
          <label className="warehouse-filter"><span>Vrsta stavke</span><select value={category} onChange={e => setCategory(e.target.value)}><option>Sve</option><option>Ploča</option><option>Ostatak</option><option>Otpad</option></select><ChevronDown size={14}/></label>
        </div>
        <div className="orders-table-wrap"><table className="orders-table warehouse-table"><thead><tr><th>MATERIJAL</th><th>DIMENZIJE (D × Š × D)</th><th>KOLIČINA</th><th>LOKACIJA</th><th>STANJE</th><th>RADNJE</th></tr></thead><tbody>
          {filtered.length ? filtered.map(item => <tr key={item.id}><td><div className="order-name"><span className="order-symbol blue"><Layers3 size={16}/></span><div><strong>{item.name}</strong><small>{item.id} · {item.type} · {item.form}</small></div></div></td><td>{item.length && item.width ? <span>{item.length} × {item.width} × {item.thickness} cm</span> : <span className="muted-icon">Nije navedeno</span>}</td><td><strong>{item.quantity}</strong> <span className="muted-icon">{item.unit}</span></td><td>{item.location}</td><td><span className={'stock-status ' + (item.form === 'Otpad' ? 'warn' : item.quantity <= item.min ? 'low' : 'good')}><i/>{item.form === 'Otpad' ? 'Otpad' : item.quantity <= item.min ? 'Niska zaliha' : 'Dostupno'}</span></td><td><div className="warehouse-row-actions"><button className="row-action" title="Zaprimanje" aria-label={'Zaprimanje ' + item.name} onClick={() => { setMovement({ id: item.id, kind: 'Zaprimanje' }); setMovementQty('1'); }}><ArrowDownToLine size={15}/></button><button className="row-action" title="Izdavanje" aria-label={'Izdavanje ' + item.name} disabled={item.quantity < 1 || item.form === 'Otpad'} onClick={() => { setMovement({ id: item.id, kind: 'Izdavanje' }); setMovementQty('1'); }}><ArrowUpFromLine size={15}/></button></div></td></tr>) : <tr><td colSpan="6"><div className="empty-state"><Search size={22}/><strong>Nema pronađenih stavki</strong><span>Promijeni pojam ili vrstu stavke.</span></div></td></tr>}
        </tbody></table></div>
        <div className="panel-foot"><span>Prikazano {filtered.length} od {materials.length} stavki</span><span>Podaci se spremaju lokalno u ovaj preglednik.</span></div>
      </section>

      <section className="panel warehouse-movements"><div className="panel-heading"><div><h2>{productionMode ? 'Proizvodni dnevnik' : 'Zadnja kretanja'}</h2><p>{productionMode ? 'Utrošak ploča, gotovi komadi, ostatci i otpad iz postupaka pilanja.' : 'Ogledni dnevnik zaprimanja i izdavanja.'}</p></div><ClipboardCheck size={19} className="muted-icon"/></div>
        {movements.length ? <div className="warehouse-movement-list">{movements.map(row => <div className="warehouse-movement" key={row.id}><span className={'movement-icon ' + (row.kind === 'Zaprimanje' ? 'movement-in' : 'movement-out')}>{row.kind === 'Zaprimanje' ? <ArrowDownToLine size={16}/> : <ArrowUpFromLine size={16}/>}</span><div><strong>{row.kind}: {row.material}</strong><small>{row.date} · {row.location}</small></div><b>{row.kind === 'Zaprimanje' ? '+' : '−'}{row.quantity}</b></div>)}</div> : <div className="warehouse-empty"><ClipboardCheck size={24}/><strong>Nema evidentiranih kretanja</strong><span>Odaberi zaprimanje ili izdavanje u tablici materijala.</span></div>}
      </section>

      <div className="module-notice"><Boxes size={17}/><span>Ovo je funkcionalni prototip s oglednim podacima. Podaci se spremaju u ovaj preglednik; nisu sinkronizirani s drugim uređajima niti povezani s bazom.</span></div>

      {showForm && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="warehouse-modal-title"><div className="modal-head"><div><span className="modal-kicker">SKLADIŠTE</span><h2 id="warehouse-modal-title">Novi materijal</h2><p>Unesi osnovne podatke o zalihi.</p></div><button className="icon-button" onClick={() => setShowForm(false)} aria-label="Zatvori"><X size={19}/></button></div><form onSubmit={addMaterial}><label>Naziv materijala<input autoFocus value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="Npr. Jadranski kamen" required/></label><div className="form-row"><label>Vrsta<select value={form.type} onChange={e => updateForm('type', e.target.value)}><option>Kamen</option><option>Granit</option><option>Mramor</option><option>Ostalo</option><option>Otpad</option></select></label><label>Oblik stavke<select value={form.form} onChange={e => updateForm('form', e.target.value)}><option>Ploča</option><option>Komad</option><option>Ostatak</option><option>Otpad</option></select></label></div><div className="form-row"><label>Debljina (cm)<input type="number" min="0" step="0.1" value={form.thickness} onChange={e => updateForm('thickness', e.target.value)}/></label><label>Količina<input type="number" min="0" step="1" value={form.quantity} onChange={e => updateForm('quantity', e.target.value)} required/></label></div><div className="form-row"><label>Dužina (cm)<input type="number" min="0" value={form.length} onChange={e => updateForm('length', e.target.value)}/></label><label>Širina (cm)<input type="number" min="0" value={form.width} onChange={e => updateForm('width', e.target.value)}/></label></div><div className="form-row"><label>Jedinica<select value={form.unit} onChange={e => updateForm('unit', e.target.value)}><option>ploča</option><option>kom</option><option>m²</option><option>m³</option></select></label><label>Minimalna zaliha<input type="number" min="0" value={form.min} onChange={e => updateForm('min', e.target.value)}/></label></div><label>Lokacija u skladištu<input value={form.location} onChange={e => updateForm('location', e.target.value)} placeholder="Npr. Stalak C1" required/></label><label>Napomena<input value={form.note} onChange={e => updateForm('note', e.target.value)} placeholder="Opcionalno"/></label><div className="modal-note"><ClipboardCheck size={16}/><span>Unos je privremen i služi za provjeru sučelja. Ne sprema se u bazu.</span></div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setShowForm(false)}>Odustani</button><button type="submit" className="button button-primary"><Plus size={16}/> Dodaj materijal</button></div></form></section></div>}


      {showCut && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowCut(false); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="cut-modal-title"><div className="modal-head"><div><span className="modal-kicker">PROIZVODNJA · SKLADIŠTE</span><h2 id="cut-modal-title">Evidentiraj pilanje</h2><p>Utroši ulazni materijal i evidentiraj nastali ostatak ili otpad.</p></div><button className="icon-button" onClick={() => setShowCut(false)} aria-label="Zatvori"><X size={19}/></button></div><form onSubmit={saveCut}><label>Radni nalog (nije obavezno)<select value={cutForm.orderId} onChange={e => setCutForm(current => ({ ...current, orderId: e.target.value }))}><option value="">Bez povezivanja s nalogom</option>{availableOrders.map(order => <option key={order.id} value={order.id}>{order.id} — {order.project} · {order.customer}</option>)}</select></label>{cutForm.orderId && availableOrders.find(order => order.id === cutForm.orderId) && <div className="modal-note"><ClipboardCheck size={16}/><span>{availableOrders.find(order => order.id === cutForm.orderId).material} · {availableOrders.find(order => order.id === cutForm.orderId).pieces.reduce((sum, piece) => sum + Number(piece.quantity || 0), 0)} komada po nacrtu. Nakon evidentiranja pilanja nalog prelazi na „Čeka kontrolu”.</span></div>}<label>Ulazni materijal<select value={cutForm.sourceId} onChange={e => setCutForm(current => ({ ...current, sourceId: e.target.value }))}>{materials.filter(item => item.form === 'Ploča' && item.quantity > 0).map(item => <option key={item.id} value={item.id}>{item.name} — {item.quantity} {item.unit} dostupno</option>)}</select></label><div className="form-row"><label>Utrošeno ploča<input type="number" min="1" step="1" value={cutForm.usedQty} onChange={e => setCutForm(current => ({ ...current, usedQty: e.target.value }))} required/></label><label>Napomena za postupak<input value={cutForm.note} onChange={e => setCutForm(current => ({ ...current, note: e.target.value }))} placeholder="Opcionalno"/></label></div><div className="cut-outputs-heading"><div><strong>Izlazne stavke</strong><p>Dodaj svaki gotov komad, upotrebljivi ostatak ili otpad.</p></div><button type="button" className="button button-secondary" onClick={addCutOutput}><Plus size={15}/> Dodaj stavku</button></div>{cutForm.outputs.map((output, index) => <section className="cut-output-card" key={output.id}><div className="cut-output-card-head"><strong>Izlazna stavka {index + 1}</strong>{cutForm.outputs.length > 1 && <button type="button" className="icon-button" onClick={() => removeCutOutput(output.id)} aria-label={'Ukloni izlaznu stavku ' + (index + 1)}><X size={16}/></button>}</div><label>Naziv komada / ostatka / otpada<input value={output.name} onChange={e => updateCutOutput(output.id, 'name', e.target.value)} placeholder="Npr. Gazište 1 ili ostatak Bračkog kamena" required/></label><div className="form-row"><label>Vrsta stavke<select value={output.type} onChange={e => updateCutOutput(output.id, 'type', e.target.value)}><option>Gotov komad</option><option>Ostatak</option><option>Otpad</option></select></label><label>Količina (kom)<input type="number" min="1" step="1" value={output.quantity} onChange={e => updateCutOutput(output.id, 'quantity', e.target.value)} required/></label></div>{cutForm.orderId && output.type === 'Gotov komad' && <label>Poveži s naručenim komadom *<select value={output.orderPieceIndex} onChange={e => updateCutOutput(output.id, 'orderPieceIndex', e.target.value)} required><option value="">Odaberi komad iz naloga</option>{(availableOrders.find(order => order.id === cutForm.orderId)?.pieces || []).map((piece, pieceIndex) => { const remaining = Math.max(0, Number(piece.quantity || 0) - Number(piece.producedQuantity || 0)); return <option key={pieceIndex} value={pieceIndex} disabled={remaining === 0}>{piece.name} — preostalo {remaining} od {piece.quantity}</option>; })}</select></label>}<div className="form-row"><label>Dužina (cm)<input type="number" min="0" step="0.1" value={output.length} onChange={e => updateCutOutput(output.id, 'length', e.target.value)} required/></label><label>Širina (cm)<input type="number" min="0" step="0.1" value={output.width} onChange={e => updateCutOutput(output.id, 'width', e.target.value)} required/></label></div><div className="form-row"><label>Debljina (cm)<input type="number" min="0" step="0.1" value={output.thickness || sourceThicknessForCut(materials, cutForm.sourceId)} onChange={e => updateCutOutput(output.id, 'thickness', e.target.value)} required/></label><label>Lokacija<input value={output.location} onChange={e => updateCutOutput(output.id, 'location', e.target.value)} required/></label></div><label>Napomena<input value={output.note} onChange={e => updateCutOutput(output.id, 'note', e.target.value)} placeholder="Opcionalno"/></label></section>)}<div className="modal-note"><Scissors size={16}/><span>Možeš evidentirati više izlaznih stavki u jednom postupku. Količina ulaznih ploča smanjuje se jednom, a svaka izlazna stavka zasebno se dodaje u skladište.</span></div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setShowCut(false)}>Odustani</button><button type="submit" className="button button-primary"><Check size={16}/> Evidentiraj pilanje</button></div></form></section></div>}
      {movement && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setMovement(null); }}><section className="modal movement-modal" role="dialog" aria-modal="true" aria-labelledby="movement-title"><div className="modal-head"><div><span className="modal-kicker">SKLADIŠNO KRETANJE</span><h2 id="movement-title">{movement.kind}</h2><p>{materials.find(row => row.id === movement.id)?.name}</p></div><button className="icon-button" onClick={() => setMovement(null)} aria-label="Zatvori"><X size={19}/></button></div><form onSubmit={saveMovement}><label>Količina<input type="number" min="1" step="1" value={movementQty} onChange={e => setMovementQty(e.target.value)} required/></label><div className="modal-note"><ClipboardCheck size={16}/><span>Trenutna količina: {materials.find(row => row.id === movement.id)?.quantity}. Podaci se spremaju u ovu preglednicu.</span></div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setMovement(null)}>Odustani</button><button type="submit" className="button button-primary"><Check size={16}/> Potvrdi</button></div></form></section></div>}
      {toast && <div className="toast"><Check size={17}/>{toast}<button onClick={() => setToast('')} aria-label="Zatvori poruku"><X size={15}/></button></div>}
    </div>
  );
}
