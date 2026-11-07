import React, { useMemo, useState } from 'react';
import { ClipboardCheck, Plus, Check, AlertTriangle, RefreshCw, Printer } from 'lucide-react';

const KEY = 'kamen-app-stocktakes-v1';
const FINISHED_KEY = 'kamen-app-finished-products-v1';
const MOVEMENTS_KEY = 'kamen-app-movements-v1';
function readSessions() {
  try { return JSON.parse(window.localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}
const qty = value => Number(String(value ?? '').trim().replace(',', '.'));
const fmt = value => Number(value || 0).toLocaleString('hr-HR', { maximumFractionDigits: 2 });

export default function StocktakeModule({ materials, onApply }) {
  const [sessions, setSessions] = useState(readSessions);
  const [activeId, setActiveId] = useState(() => readSessions()[0]?.id || '');
  const [toast, setToast] = useState('');
  const active = sessions.find(session => session.id === activeId) || null;
  const pending = active?.rows || [];
  const totals = useMemo(() => pending.reduce((acc, row) => {
    const entered = row.countedQuantity !== '' && Number.isFinite(qty(row.countedQuantity));
    const diff = entered ? qty(row.countedQuantity) - Number(row.expectedQuantity || 0) : 0;
    return { counted: acc.counted + (entered ? 1 : 0), differences: acc.differences + (entered && diff !== 0 ? 1 : 0), plus: acc.plus + Math.max(0, diff), minus: acc.minus + Math.max(0, -diff) };
  }, { counted: 0, differences: 0, plus: 0, minus: 0 }), [pending]);
  const persist = next => { setSessions(next); try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { setToast('Nije moguće spremiti inventuru u preglednik.'); } };
  const flash = message => { setToast(message); window.setTimeout(() => setToast(''), 3000); };

  function createSession() {
    const finished = (() => { try { return JSON.parse(window.localStorage.getItem(FINISHED_KEY) || '[]'); } catch { return []; } })();
    if (!materials.length && !finished.length) { flash('Skladište je prazno. Najprije unesi materijal ili gotov proizvod.'); return; }
    const now = new Date();
    const id = 'INV-' + now.getTime();
    const materialRows = materials.map(item => ({ rowId: 'm:' + item.id, kind: 'material', materialId: item.id, name: item.name, form: item.form, unit: item.unit || 'kom', location: item.location || '', expectedQuantity: Number(item.quantity || 0), countedQuantity: '', reason: '' }));
    const finishedRows = finished.map(item => ({ rowId: 'f:' + item.id, kind: 'finished', materialId: item.id, name: item.name, form: item.category || 'Gotov proizvod', unit: item.unit || 'kom', location: item.location || '', expectedQuantity: Number(item.stockQuantity ?? ((item.status === 'Ugrađen' || item.status === 'Prodano') ? 0 : item.quantity || 0)), countedQuantity: '', reason: '', status: item.status || '' }));
    const session = {
      id, createdAt: now.toISOString(), status: 'U tijeku',
      rows: [...materialRows, ...finishedRows]
    };
    persist([session, ...sessions]);
    setActiveId(id);
    flash('Inventura je otvorena. Knjižno stanje je spremljeno kao početna usporedba.');
  }

  function updateRow(materialId, field, value) {
    if (!active || active.status !== 'U tijeku') return;
    persist(sessions.map(session => session.id !== active.id ? session : {
      ...session, rows: session.rows.map(row => (row.rowId || row.materialId) !== materialId ? row : { ...row, [field]: value })
    }));
  }

  function applySession() {
    if (!active || active.status !== 'U tijeku') return;
    const incomplete = pending.some(row => { const value = qty(row.countedQuantity); const wholeUnit = ['kom', 'par', 'set'].includes(row.unit); return row.countedQuantity === '' || !Number.isFinite(value) || value < 0 || Math.round(value * 100) !== value * 100 || (wholeUnit && !Number.isInteger(value)); });
    if (incomplete) { flash('Unesi fizičku količinu za svaku stavku. Količina mora biti nula ili veća; za kom/par/set cijeli broj, za ostalo najviše dvije decimale.'); return; }
    const differences = pending.map(row => ({ ...row, difference: Number((qty(row.countedQuantity) - Number(row.expectedQuantity || 0)).toFixed(2)) })).filter(row => row.difference !== 0);
    if (differences.some(row => !row.reason.trim())) { flash('Za svaki višak ili manjak obavezno upiši razlog.'); return; }
    const finishedNow = (() => { try { return JSON.parse(window.localStorage.getItem(FINISHED_KEY) || '[]'); } catch { return []; } })();
    const stale = pending.find(row => {
      if (row.kind === 'finished') {
        const current = finishedNow.find(item => item.id === row.materialId);
        const currentQty = current ? Number(current.stockQuantity ?? ((current.status === 'Ugrađen' || current.status === 'Prodano') ? 0 : current.quantity || 0)) : NaN;
        return !current || Math.abs(currentQty - Number(row.expectedQuantity || 0)) > 0.000001;
      }
      const current = materials.find(item => item.id === row.materialId);
      return !current || Math.abs(Number(current.quantity || 0) - Number(row.expectedQuantity || 0)) > 0.000001;
    });
    if (stale) { flash('Zaliha stavke „' + stale.name + '” promijenila se nakon otvaranja inventure. Neću primijeniti stare brojke. Otvori novu inventuru i ponovno prebroji.'); return; }
    const materialDifferences = differences.filter(row => row.kind !== 'finished');
    const finishedDifferences = differences.filter(row => row.kind === 'finished');
    onApply(materialDifferences);
    if (finishedDifferences.length) {
      const timestamp = new Date().toISOString();
      const byId = new Map(finishedDifferences.map(row => [row.materialId, row]));
      const updated = finishedNow.map(item => {
        const change = byId.get(item.id);
        if (!change) return item;
        const counted = Number(change.countedQuantity);
        const wasClosed = ['Ugrađen', 'Prodano'].includes(item.status);
        const transaction = { id: item.id + '-INV-' + Date.now(), kind: change.difference > 0 ? 'Inventurna korekcija (+)' : 'Inventurna korekcija (−)', quantity: change.difference, reason: change.reason.trim(), date: timestamp };
        return { ...item, stockQuantity: counted, status: wasClosed && counted > 0 ? 'Na zalihi' : item.status, transactions: [...(item.transactions || []), transaction], updatedAt: timestamp };
      });
      window.localStorage.setItem(FINISHED_KEY, JSON.stringify(updated));
      const oldMovements = (() => { try { return JSON.parse(window.localStorage.getItem(MOVEMENTS_KEY) || '[]'); } catch { return []; } })();
      const newMovements = finishedDifferences.map((row, index) => ({
        id: 'INV-' + timestamp + '-' + index, material: row.name,
        kind: row.difference > 0 ? 'Inventurna korekcija (+)' : 'Inventurna korekcija (−)',
        quantity: row.difference, reason: row.reason.trim(), location: row.location,
        date: new Date(timestamp).toLocaleDateString('hr-HR'), productId: row.materialId
      }));
      window.localStorage.setItem(MOVEMENTS_KEY, JSON.stringify([...newMovements, ...oldMovements].slice(0, 100)));
      window.dispatchEvent(new CustomEvent('kamen:finished-products-updated', { detail: updated }));
    }
    const completed = { ...active, status: 'Provedena', completedAt: new Date().toISOString(), differenceCount: differences.length };
    persist(sessions.map(session => session.id === active.id ? completed : session));
    flash(differences.length ? 'Inventura provedena. ' + differences.length + ' skladišnih korekcija evidentirano.' : 'Inventura provedena. Nisu pronađene razlike.');
  }

  const materialCount = pending.filter(row => row.kind !== 'finished').length;
  const finishedCount = pending.filter(row => row.kind === 'finished').length;
  return <div className="stocktake-page">
    <section className="welcome-row module-welcome stocktake-welcome">
      <div><div className="eyebrow"><span className="live-dot"/> KONTROLA STANJA</div><h1>Skladišna inventura</h1><p className="subtitle">Usporedi stvarno prebrojane količine s evidencijom. Zaliha se mijenja tek nakon potvrde inventure.</p></div>
      <div className="welcome-actions">{active && <button className="button button-secondary" onClick={() => window.print()}><Printer size={16}/> Ispiši zapisnik</button>}<button className="button button-primary" onClick={createSession}><Plus size={16}/> Nova inventura</button></div>
    </section>
    <div className="stocktake-layout">
      <section className="panel stocktake-history">
        <div className="panel-heading"><div><h2>Inventure</h2><p>Pregled otvorenih i provedenih inventura.</p></div><ClipboardCheck size={19}/></div>
        {sessions.length ? sessions.map(session => <button key={session.id} className={'stocktake-session ' + (session.id === activeId ? 'active' : '')} onClick={() => setActiveId(session.id)}><span><strong>{new Date(session.createdAt).toLocaleDateString('hr-HR')}</strong><small>{session.rows.length} stavki · {session.id}</small></span><b className={session.status === 'Provedena' ? 'done' : 'open'}>{session.status}</b></button>) : <div className="warehouse-empty"><ClipboardCheck size={24}/><strong>Još nema inventura</strong><span>Pokreni prvu inventuru kako bi usporedio stanje skladišta.</span></div>}
      </section>
      <section className="panel stocktake-detail">
        {active ? <>
          <div className="panel-heading"><div><div className="panel-title-line"><h2>Popis za inventuru</h2><span className="count-pill">{pending.length} stavki</span></div><p>{new Date(active.createdAt).toLocaleString('hr-HR')} · {active.status} · Materijali: {materialCount} · Gotovi proizvodi: {finishedCount}</p></div><span className={'stocktake-status ' + (active.status === 'Provedena' ? 'done' : 'open')}>{active.status}</span></div>
          <div className="stocktake-summary"><div><strong>{totals.counted}/{pending.length}</strong><span>Prebrojano</span></div><div><strong>{totals.differences}</strong><span>Razlika</span></div><div><strong>+{fmt(totals.plus)}</strong><span>Višak</span></div><div><strong>−{fmt(totals.minus)}</strong><span>Manjak</span></div></div>
          <div className="orders-table-wrap"><table className="orders-table stocktake-table"><thead><tr><th>VRSTA / STAVKA / LOKACIJA</th><th>KNJIŽNO</th><th>FIZIČKI BROJ</th><th>RAZLIKA</th><th>RAZLOG RAZLIKE</th></tr></thead><tbody>
            {pending.map(row => { const entered = row.countedQuantity !== '' && Number.isFinite(qty(row.countedQuantity)); const diff = entered ? Number((qty(row.countedQuantity) - Number(row.expectedQuantity || 0)).toFixed(2)) : null; return <tr key={row.rowId || row.materialId}><td><div className="order-name"><span className="order-symbol blue"><ClipboardCheck size={15}/></span><div><strong>{row.name}</strong><small>{row.kind === 'finished' ? 'Gotovi proizvod' : 'Materijal'} · {row.form} · {row.location || 'Lokacija nije navedena'}</small></div></div></td><td><strong>{fmt(row.expectedQuantity)}</strong> <small>{row.unit}</small></td><td><input className="stocktake-count-input" type="text" inputMode="decimal" placeholder="Prebroji" disabled={active.status !== 'U tijeku'} value={row.countedQuantity} onChange={e => updateRow(row.rowId || row.materialId, 'countedQuantity', e.target.value)}/></td><td><span className={'stocktake-difference ' + (diff > 0 ? 'positive' : diff < 0 ? 'negative' : '')}>{diff === null ? '—' : diff > 0 ? '+' + fmt(diff) : fmt(diff)}</span></td><td><input className="stocktake-reason-input" type="text" placeholder={diff ? 'Obvezno upiši razlog' : 'Nije potrebno'} disabled={active.status !== 'U tijeku' || !diff} value={row.reason} onChange={e => updateRow(row.rowId || row.materialId, 'reason', e.target.value)}/></td></tr>; })}
          </tbody></table></div>
          {active.status === 'U tijeku' ? <div className="stocktake-footer"><span><AlertTriangle size={16}/> Inventura uključuje materijale i gotove proizvode. Promjena zalihe neće se dogoditi dok ne potvrdiš inventuru. Ako se zaliha u međuvremenu promijeni, potvrda će biti blokirana.</span><button className="button button-primary" onClick={applySession}><Check size={16}/> Potvrdi i uskladi zalihu</button></div> : <div className="module-notice"><Check size={16}/><span>Inventura je zaključena. Korekcije su provedene i više se ne mogu mijenjati.</span></div>}
        </> : <div className="warehouse-empty stocktake-empty"><ClipboardCheck size={28}/><strong>Odaberi ili pokreni inventuru</strong><span>Svaka inventura čuva početno knjižno stanje i unesene fizičke količine.</span><button className="button button-primary" onClick={createSession}><Plus size={16}/> Nova inventura</button></div>}
      </section>
    </div>
    {toast && <div className="toast"><RefreshCw size={16}/>{toast}<button onClick={() => setToast('')} aria-label="Zatvori poruku">×</button></div>}
  </div>;
}
