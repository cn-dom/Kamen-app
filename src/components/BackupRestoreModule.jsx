import React, { useRef, useState } from 'react';
import { Archive, Download, Upload, ShieldCheck, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

const BACKUP_KEYS = [
  'kamen-app-materials-v1',
  'kamen-app-work-orders-v1',
  'kamen-app-movements-v1',
  'kamen-app-finished-products-v1',
  'kamen-app-field-work-v1',
  'kamen-app-customers-v1',
  'kamen-app-cost-records-v1',
  'kamen-app-production-stages-v1',
  'kamen-app-stocktakes-v1',
  'kamen-app-schedule-v1',
  'kamen-app-schedule-equipment-v1',
  'kamen-app-suppliers-v1',
  'kamen-app-purchase-orders-v1',
  'kamen-app-quotes-v1',
  'kamen-app-company-profile-v1'
];
const OPTIONAL_BACKUP_KEYS = ['kamen-app-schedule-v1', 'kamen-app-schedule-equipment-v1', 'kamen-app-suppliers-v1', 'kamen-app-purchase-orders-v1', 'kamen-app-quotes-v1', 'kamen-app-company-profile-v1'];
const OBJECT_BACKUP_KEYS = ['kamen-app-company-profile-v1'];
const APP_ID = 'kamen-app-local-data';
const VERSION = 1;

function readData() {
  return Object.fromEntries(BACKUP_KEYS.map(key => {
    try {
      const value = window.localStorage.getItem(key);
      return [key, value === null ? (OBJECT_BACKUP_KEYS.includes(key) ? {} : []) : JSON.parse(value)];
    } catch {
      throw new Error('Podatak "' + key + '" nije moguće pročitati. Izrada kopije je prekinuta.');
    }
  }));
}

function downloadBackup(data = readData()) {
  const backup = {
    app: APP_ID,
    schemaVersion: VERSION,
    exportedAt: new Date().toISOString(),
    data
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  link.href = url;
  link.download = 'kamen-app-sigurnosna-kopija-' + stamp + '.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function validateBackup(value) {
  if (!value || value.app !== APP_ID || value.schemaVersion !== VERSION || !value.data || typeof value.data !== 'object' || Array.isArray(value.data)) {
    throw new Error('Datoteka nije valjana sigurnosna kopija Kamen-appa ili nije podržana verzija.');
  }
  const missing = BACKUP_KEYS.filter(key => !Object.prototype.hasOwnProperty.call(value.data, key) && !OPTIONAL_BACKUP_KEYS.includes(key));
  if (missing.length) throw new Error('Sigurnosna kopija je nepotpuna. Nedostaju podaci: ' + missing.join(', '));
  for (const key of OPTIONAL_BACKUP_KEYS) if (!Object.prototype.hasOwnProperty.call(value.data, key)) value.data[key] = OBJECT_BACKUP_KEYS.includes(key) ? {} : [];
  for (const key of BACKUP_KEYS) {
    const valid = OBJECT_BACKUP_KEYS.includes(key)
      ? value.data[key] && typeof value.data[key] === 'object' && !Array.isArray(value.data[key])
      : Array.isArray(value.data[key]);
    if (!valid) throw new Error('Podatak "' + key + '" nema očekivani format.');
  }
  return value.data;
}

export default function BackupRestoreModule({ onBack }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function createBackup() {
    setMessage('');
    setError('');
    try {
      downloadBackup();
      setMessage('Sigurnosna kopija je izrađena. Spremi preuzetu JSON datoteku na sigurno mjesto izvan ovog računala.');
    } catch (err) {
      setError(err?.message || 'Nije moguće izraditi sigurnosnu kopiju.');
    }
  }

  async function restoreBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const parsed = JSON.parse(await file.text());
      const restored = validateBackup(parsed);
      const date = parsed.exportedAt ? new Date(parsed.exportedAt).toLocaleString('hr-HR') : 'nepoznat datum';
      if (!window.confirm('PAŽNJA: Vraćanje kopije zamijenit će trenutačne podatke u ovom pregledniku podacima iz odabrane datoteke (' + date + ').\n\nPrije nastavka izradi sigurnosnu kopiju trenutačnog stanja. Želiš li nastaviti?')) {
        setBusy(false);
        event.target.value = '';
        return;
      }
      const previous = Object.fromEntries(BACKUP_KEYS.map(key => [key, window.localStorage.getItem(key)]));
      try {
        for (const key of BACKUP_KEYS) window.localStorage.setItem(key, JSON.stringify(restored[key]));
      } catch (writeError) {
        for (const key of BACKUP_KEYS) {
          if (previous[key] === null) window.localStorage.removeItem(key);
          else window.localStorage.setItem(key, previous[key]);
        }
        throw new Error('Vraćanje nije uspjelo. Prethodni podaci su vraćeni. Provjeri slobodan prostor preglednika.');
      }
      setMessage('Podaci su vraćeni. Aplikacija će se ponovno učitati.');
      window.setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      setError(err instanceof SyntaxError ? 'Datoteka nije ispravan JSON.' : (err?.message || 'Nije moguće vratiti sigurnosnu kopiju.'));
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }

  return <div className="page-content module-page backup-page">
    <section className="welcome-row module-welcome">
      <div><div className="eyebrow"><span className="live-dot" /> ZAŠTITA POSLOVNIH PODATAKA</div><h1>Sigurnosna kopija</h1><p className="subtitle">Izradi kopiju podataka ili vrati ranije spremljeno stanje Kamen-appa.</p></div>
      <button className="button button-secondary" onClick={onBack}>← Povratak na pregled</button>
    </section>
    <section className="backup-grid">
      <article className="panel backup-card">
        <div className="backup-icon"><Download size={22}/></div>
        <span className="module-status">IZVOZ PODATAKA</span>
        <h2>Izradi sigurnosnu kopiju</h2>
        <p>Preuzmi JSON datoteku sa zalihama, radnim nalozima, gotovim proizvodima, kupcima, terenskim radom, troškovima, proizvodnim fazama, inventurama i skladišnim kretanjima.</p>
        <button className="button button-primary" onClick={createBackup}><Archive size={16}/> Preuzmi sigurnosnu kopiju</button>
      </article>
      <article className="panel backup-card">
        <div className="backup-icon restore"><Upload size={22}/></div>
        <span className="module-status">UVOZ PODATAKA</span>
        <h2>Vrati sigurnosnu kopiju</h2>
        <p>Odaberi ranije preuzetu Kamen-app JSON datoteku. Prije zamjene podataka aplikacija će tražiti potvrdu.</p>
        <input ref={inputRef} className="backup-file-input" type="file" accept=".json,application/json" onChange={restoreBackup} disabled={busy}/>
        <button className="button button-secondary" onClick={() => inputRef.current?.click()} disabled={busy}><Upload size={16}/> {busy ? 'Obrada datoteke…' : 'Odaberi sigurnosnu kopiju'}</button>
      </article>
    </section>
    <section className="panel backup-info">
      <div className="backup-info-icon"><ShieldCheck size={20}/></div>
      <div><h3>Važne informacije</h3><ul>
        <li>Kopija obuhvaća poslovne podatke koje Kamen-app trenutačno sprema u ovom pregledniku.</li>
        <li>Datoteka se sprema na tvoje računalo; aplikacija je ne šalje na poslužitelj.</li>
        <li>Vraćanje zamjenjuje podatke u trenutačnom pregledniku. Ne spaja podatke iz dvije kopije.</li>
        <li>Zaštiti JSON datoteku jer može sadržavati poslovne i osobne podatke kupaca.</li>
        <li>Sigurnosna kopija nije automatska sinkronizacija između računala i mobitela.</li>
      </ul></div>
    </section>
    {message && <div className="module-notice backup-message"><CheckCircle2 size={17}/><span>{message}</span></div>}
    {error && <div className="module-notice backup-error"><AlertTriangle size={17}/><span>{error}</span></div>}
    <div className="backup-footnote"><RefreshCw size={15}/> Preporuka: izradi novu kopiju nakon važnih promjena i spremi je na drugo sigurno mjesto.</div>
  </div>;
}
