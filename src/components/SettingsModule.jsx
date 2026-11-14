import React, { useEffect, useRef, useState } from 'react';
import { DEFAULT_COMPANY_SETTINGS, normalizeCompanySettings, validateCompanyProfile, validateCompanyWorkRules, calculateNetShiftMinutes } from '../lib/companySettings.js';
import { ArrowLeft, Building2, CheckCircle2, Clock3, MapPin, Plus, Settings2, Upload, X, Scissors, Cloud, RefreshCw, ShieldCheck, UserPlus, UserMinus } from 'lucide-react';
import { getSharedApiBase, getLocalBusinessData, getSharedStorageStatus, getSharedMembers, inviteSharedMember, deactivateSharedMember, bootstrapSharedCompany, importLocalBusinessData, downloadSharedBusinessData, syncRemoteNow } from '../lib/remoteStorageSync.js';

const PROFILE_KEY = 'kamen-app-company-profile-v1';
const SETTINGS_KEY = 'kamen-app-company-settings-v1';
const AUDIT_KEY = 'kamen-app-settings-audit-v1';
const SAW_SETTINGS_KEY = 'kamen-app-saw-settings-v1';
const DEFAULT_SAW_SETTINGS = { 'Pila 1': { kerfMm: 4, trimMm: 10 }, 'Pila 2': { kerfMm: 4, trimMm: 10 } };
const read = (key, fallback) => { try { const value = window.localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch { return fallback; } };
const field = (label, key, value, onChange, props = {}) => <label>{label}<input value={value ?? ''} onChange={event => onChange(key, event.target.value)} {...props}/></label>;

export default function SettingsModule({ onBack }) {
  const [profile, setProfile] = useState(() => ({ name: '', address: '', city: '', oib: '', phone: '', email: '', iban: '', website: '', logoDataUrl: '', ...read(PROFILE_KEY, {}) }));
  const [settings, setSettings] = useState(() => normalizeCompanySettings(read(SETTINGS_KEY, DEFAULT_COMPANY_SETTINGS)));
  const [audit, setAudit] = useState(() => read(AUDIT_KEY, []));
  const [sawSettings, setSawSettings] = useState(() => ({ ...DEFAULT_SAW_SETTINGS, ...read(SAW_SETTINGS_KEY, {}) }));
  const [sharedCompanyName, setSharedCompanyName] = useState('');
  const [sharedStatus, setSharedStatus] = useState(null);
  const [sharedAccessReady, setSharedAccessReady] = useState(false);
  const [sharedBusy, setSharedBusy] = useState(false);
  const [sharedMessage, setSharedMessage] = useState('');
  const [sharedError, setSharedError] = useState('');
  const [sharedSyncStatus, setSharedSyncStatus] = useState('');
  const [sharedMembers, setSharedMembers] = useState([]);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState('worker');
  const [tab, setTab] = useState('company');
  const [newLocation, setNewLocation] = useState('');
  const [newType, setNewType] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const logoRef = useRef(null);
  const tabs = [{ id: 'company', label: 'Profil tvrtke', icon: Building2 }, { id: 'warehouse', label: 'Skladište', icon: MapPin }, { id: 'rules', label: 'Pravila rada', icon: Clock3 }, { id: 'saws', label: 'Postavke pila', icon: Scissors }, { id: 'sync', label: 'Zajednička pohrana', icon: Cloud }];
  const recordChange = (action, details) => ({ id: 'SET-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), action, details, createdAt: new Date().toISOString() });
  const save = (nextProfile = profile, nextSettings = settings, action = 'Spremanje postavki', nextSawSettings = sawSettings) => {
    setMessage(''); setError('');
    const profileIssue = validateCompanyProfile(nextProfile);
    const rulesIssue = validateCompanyWorkRules(nextSettings.workRules);
    const sawIssue = Object.entries(nextSawSettings).some(([name, value]) => !Number.isFinite(Number(value.kerfMm)) || Number(value.kerfMm) < 0 || Number(value.kerfMm) > 20 || !Number.isFinite(Number(value.trimMm)) || Number(value.trimMm) < 0 || Number(value.trimMm) > 50)
      ? 'Za svaku pilu unesi širinu reza 0–20 mm i obrezivanje 0–50 mm po rubu.' : '';
    if (profileIssue || rulesIssue || sawIssue) { setError(profileIssue || rulesIssue || sawIssue); return; }
    const nextAudit = [recordChange(action, nextProfile.name || 'Postavke tvrtke'), ...audit].slice(0, 300);
    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile));
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings));
      window.localStorage.setItem(AUDIT_KEY, JSON.stringify(nextAudit));
      window.localStorage.setItem(SAW_SETTINGS_KEY, JSON.stringify(nextSawSettings));
      setProfile(nextProfile); setSettings(nextSettings); setSawSettings(nextSawSettings); setAudit(nextAudit);
      setMessage('Postavke su spremljene u ovom pregledniku.');
    } catch {
      setError('Spremanje nije uspjelo. Provjeri slobodan prostor preglednika.');
    }
  };
  const updateProfile = (key, value) => setProfile(current => ({ ...current, [key]: value }));
  const updateRule = (key, value) => setSettings(current => ({ ...current, workRules: { ...current.workRules, [key]: value } }));
  const updateSaw = (saw, key, value) => setSawSettings(current => ({ ...current, [saw]: { ...(current[saw] || DEFAULT_SAW_SETTINGS[saw]), [key]: value } }));
  useEffect(() => {
    const onSyncStatus = event => {
      const detail = event.detail || {};
      setSharedSyncStatus(detail.status || '');
      if (detail.status === 'conflict') setSharedError(detail.message || ('Potrebno je uskladiti zapise: ' + (detail.conflicts || []).join(', ')));
      if (detail.status === 'ready' || detail.status === 'synced') setSharedMessage('Sinkronizacija je aktivna. Promjene se šalju u zajedničku pohranu.');
      if (detail.status === 'error') setSharedError(detail.message || 'Sinkronizacija nije uspjela.');
    };
    window.addEventListener('kamen-app-sync-status', onSyncStatus);
    return () => window.removeEventListener('kamen-app-sync-status', onSyncStatus);
  }, []);
  const openSharedLogin = () => {
    const destination = getSharedApiBase() + '/api/me';
    const login = 'https://mute-frog-153f.cloudflareaccess.com/cdn-cgi/access/login/kamen-app-api-staging.patriasoul.workers.dev?redirect_url=' + encodeURIComponent(destination);
    window.open(login, '_blank', 'noopener,noreferrer');
    setSharedMessage('U novoj kartici dovrši prijavu jednokratnim kodom poslanim na dopuštenu e-mail adresu. Zatim se vrati ovamo i provjeri vezu.');
    setSharedError('');
  };
  const checkSharedConnection = async () => {
    setSharedBusy(true); setSharedError(''); setSharedMessage('');
    try {
      const status = await getSharedStorageStatus();
      setSharedStatus(status); setSharedAccessReady(true);
      if (['owner','manager'].includes(status.user.role)) { const result = await getSharedMembers(); setSharedMembers(result.members || []); }
      setSharedMessage('Povezano s tvrtkom „' + status.company.name + '” kao ' + status.user.role + '.');
    } catch (error) {
      if (error.status === 403 && /nije povezan s tvrtkom|nije povezan/i.test(error.message)) {
        setSharedAccessReady(true);
        setSharedMessage('Prijava je valjana. Još treba napraviti početno postavljanje tvrtke.');
      } else {
        setSharedError(error.message || 'Prijava nije potvrđena. Otvori sigurnu prijavu pa pokušaj ponovno.');
      }
    } finally { setSharedBusy(false); }
  };
  const createSharedCompany = async () => {
    if (!sharedCompanyName.trim()) { setSharedError('Unesi naziv tvrtke.'); return; }
    setSharedBusy(true); setSharedError(''); setSharedMessage('');
    try {
      await bootstrapSharedCompany(sharedCompanyName.trim());
      const status = await getSharedStorageStatus();
      setSharedStatus(status); setSharedAccessReady(true);
      const members = await getSharedMembers(); setSharedMembers(members.members || []);
      setSharedMessage('Tvrtka je otvorena u zajedničkoj pohrani. Sljedeći korak je siguran prijenos postojećih podataka.');
    } catch (error) { setSharedError(error.message); }
    finally { setSharedBusy(false); }
  };
  const importLocalToShared = async () => {
    if (!window.confirm('Prenijeti ' + getLocalBusinessData().length + ' lokalnih zapisa u praznu D1 bazu? Postojeći podaci u ovom pregledniku neće se brisati.')) return;
    setSharedBusy(true); setSharedError(''); setSharedMessage('');
    try {
      const result = await importLocalBusinessData();
      const status = await getSharedStorageStatus();
      setSharedStatus(status);
      setSharedMessage('Preneseno ' + result.imported + ' zapisa. Zajednička sinkronizacija je uključena na ovom uređaju.');
    } catch (error) { setSharedError(error.message); }
    finally { setSharedBusy(false); }
  };
  const downloadSharedToDevice = async () => {
    if (!window.confirm('Preuzeti zajedničke podatke i njima zamijeniti lokalne zapise istih ključeva? Prije nastavka preporučujem sigurnosnu kopiju ovog preglednika.')) return;
    setSharedBusy(true); setSharedError(''); setSharedMessage('');
    try {
      const result = await downloadSharedBusinessData();
      setSharedMessage('Preuzeto ' + result.downloaded + ' zapisa. Osvježavam aplikaciju da svi moduli učitaju zajedničke podatke.');
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error) { setSharedError(error.message); }
    finally { setSharedBusy(false); }
  };
  const refreshSharedMembers = async () => {
    try { const result = await getSharedMembers(); setSharedMembers(result.members || []); }
    catch (error) { setSharedError(error.message); }
  };
  const addSharedMember = async () => {
    if (!memberEmail.trim()) { setSharedError('Unesi e-mail adresu novog člana.'); return; }
    setSharedBusy(true); setSharedError(''); setSharedMessage('');
    try {
      await inviteSharedMember({ email: memberEmail.trim(), displayName: memberName.trim(), role: memberRole });
      setMemberEmail(''); setMemberName(''); setMemberRole('worker');
      await refreshSharedMembers();
      setSharedMessage('Član je dodan. Može se prijaviti svojom e-mail adresom i jednokratnim kodom.');
    } catch (error) { setSharedError(error.message); }
    finally { setSharedBusy(false); }
  };
  const removeSharedMember = async email => {
    if (!window.confirm('Deaktivirati pristup za ' + email + '? Povijest njegovih radnji ostaje sačuvana.')) return;
    setSharedBusy(true); setSharedError(''); setSharedMessage('');
    try {
      await deactivateSharedMember(email);
      await refreshSharedMembers();
      setSharedMessage('Članu je deaktiviran pristup zajedničkoj pohrani.');
    } catch (error) { setSharedError(error.message); }
    finally { setSharedBusy(false); }
  };
  const reconcileSharedNow = async () => {
    setSharedBusy(true); setSharedError(''); setSharedMessage('');
    try {
      const result = await syncRemoteNow();
      setSharedMessage(result.conflicts?.length ? 'Pronađeni su zapisi za ručno usklađivanje: ' + result.conflicts.join(', ') : 'Podaci su usklađeni. Preuzeto novih zapisa: ' + (result.downloaded || 0) + '.');
    } catch (error) { setSharedError(error.message); }
    finally { setSharedBusy(false); }
  };

  const updateList = (key, next) => setSettings(current => ({ ...current, [key]: next }));
  const addToList = (key, value, clear) => {
    const clean = value.trim();
    if (!clean) return;
    if (settings[key].some(item => item.toLocaleLowerCase('hr') === clean.toLocaleLowerCase('hr'))) { setError('Ta stavka već postoji.'); return; }
    updateList(key, [...settings[key], clean]); clear(''); setError(''); setMessage('Nova stavka dodana. Pritisni Spremi promjene da je trajno spremiš.');
  };
  const uploadLogo = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Odaberi slikovnu datoteku.'); event.target.value = ''; return; }
    if (file.size > 1024 * 1024) { setError('Logotip mora biti manji od 1 MB.'); event.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => { updateProfile('logoDataUrl', String(reader.result || '')); setMessage('Logotip je učitan. Pritisni Spremi promjene.'); setError(''); };
    reader.onerror = () => setError('Datoteku logotipa nije moguće pročitati.');
    reader.readAsDataURL(file);
    event.target.value = '';
  };
  const profileFields = [
    ['Naziv tvrtke / obrta', 'name'], ['Adresa', 'address'], ['Mjesto i poštanski broj', 'city'],
    ['OIB', 'oib'], ['Telefon', 'phone'], ['E-mail', 'email'], ['IBAN', 'iban'], ['Web-stranica', 'website']
  ];
  const profileIssue = validateCompanyProfile(profile);
  const profileValid = !profileIssue;
  const rules = settings.workRules;
  const workMinutes = calculateNetShiftMinutes(rules) + Number(rules.breakMinutes || 0);
  return <div className="page-content module-page company-settings-page">
    <section className="welcome-row module-welcome"><div><div className="eyebrow"><span className="live-dot"/> ADMINISTRACIJA · POSTAVKE TVRTKE</div><h1>Postavke tvrtke</h1><p className="subtitle">Uredi podatke tvrtke, skladišne šifrarnike i osnovna pravila rada.</p></div><button className="button button-secondary" onClick={onBack}><ArrowLeft size={15}/> Povratak na pregled</button></section>
    <div className="access-warning"><Settings2 size={18}/><div><strong>Lokalne postavke</strong><p>Promjene se trenutačno spremaju u ovaj preglednik. Primjenjuju se na lokalne module na ovom uređaju; sinkronizacija i stvarne korisničke ovlasti dolaze u završnoj backend fazi.</p></div></div>
    <nav className="settings-tabs" aria-label="Postavke tvrtke">{tabs.map(item => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}><item.icon size={16}/>{item.label}</button>)}</nav>
    {tab === 'company' && <section className="panel settings-panel">
      <div className="panel-heading"><div><h2>Podaci tvrtke</h2><p>Ovi podaci koriste se na ponudama i u poslovnim dokumentima.</p></div><Building2 size={20}/></div>
      <div className="settings-logo-row"><div className="settings-logo-preview">{profile.logoDataUrl ? <img src={profile.logoDataUrl} alt="Logotip tvrtke"/> : <Building2 size={25}/>}</div><div><strong>Logotip tvrtke</strong><p>PNG, JPG ili WEBP · najviše 1 MB. Čuva se lokalno u ovom pregledniku.</p><div className="settings-inline-actions"><button type="button" className="button button-secondary" onClick={() => logoRef.current?.click()}><Upload size={14}/> Odaberi logotip</button>{profile.logoDataUrl && <button type="button" className="button button-secondary" onClick={() => updateProfile('logoDataUrl', '')}><X size={14}/> Ukloni</button>}</div><input ref={logoRef} type="file" accept="image/*" hidden onChange={uploadLogo}/></div></div>
      <div className="settings-form-grid">{profileFields.map(([label, key]) => field(label, key, profile[key], updateProfile, key === 'email' ? { type: 'email' } : key === 'oib' ? { inputMode: 'numeric', maxLength: 11, placeholder: '11 znamenki' } : {}))}</div>
      {profileIssue && <p className="settings-error">{profileIssue}</p>}
      <div className="settings-actions"><button className="button button-primary" disabled={!profileValid} onClick={() => save(profile, settings, 'Promjena profila tvrtke')}><CheckCircle2 size={15}/> Spremi podatke tvrtke</button></div>
    </section>}
    {tab === 'warehouse' && <section className="settings-config-grid">
      {[{key:'locations',title:'Skladišne lokacije',desc:'Mjesta na kojima se čuvaju ploče, komadi i ostatci.',value:newLocation,set:setNewLocation,placeholder:'Npr. Stalak D1',icon:MapPin},{key:'materialTypes',title:'Vrste materijala',desc:'Pojmovi za brži unos i ujednačenu evidenciju materijala.',value:newType,set:setNewType,placeholder:'Npr. Kvarcit',icon:Building2},{key:'units',title:'Jedinice mjere',desc:'Jedinice koje se nude pri unosu zaliha.',value:newUnit,set:setNewUnit,placeholder:'Npr. paket',icon:Settings2}].map(group => <article className="panel settings-list-card" key={group.key}><div className="panel-heading"><div><h2>{group.title}</h2><p>{group.desc}</p></div><group.icon size={19}/></div><form className="settings-add-row" onSubmit={event => { event.preventDefault(); addToList(group.key, group.value, group.set); }}><input value={group.value} onChange={event => group.set(event.target.value)} placeholder={group.placeholder} aria-label={group.title}/><button className="button button-secondary" type="submit"><Plus size={14}/> Dodaj</button></form><div className="settings-chip-list">{settings[group.key].map(item => <span className="settings-chip" key={item}>{item}<button type="button" onClick={() => updateList(group.key, settings[group.key].filter(value => value !== item))} aria-label={'Ukloni ' + item}><X size={13}/></button></span>)}</div></article>)}
      <div className="settings-save-strip"><span>Popisi se koriste kao prijedlozi pri unosu skladišnih stavki.</span><button className="button button-primary" onClick={() => save(profile, settings, 'Promjena skladišnih šifrarnika')}><CheckCircle2 size={15}/> Spremi promjene</button></div>
    </section>}
    {tab === 'rules' && <section className="panel settings-panel"><div className="panel-heading"><div><h2>Pravila rada i obračuna</h2><p>Osnovne vrijednosti za planiranje i buduće obračune. Ne stvaraju automatski obračun plaće.</p></div><Clock3 size={20}/></div>
      <div className="settings-form-grid">{field('Početak smjene','workStart',rules.workStart,updateRule,{type:'time'})}{field('Završetak smjene','workEnd',rules.workEnd,updateRule,{type:'time'})}{field('Trajanje pauze (minute)','breakMinutes',rules.breakMinutes,updateRule,{type:'number',min:0,max:240})}{field('Trošak rada po satu (€)','hourlyCostRate',rules.hourlyCostRate,updateRule,{type:'number',min:0,step:'0.01'})}{field('Trošak prijevoza po km (€)','travelCostPerKm',rules.travelCostPerKm,updateRule,{type:'number',min:0,step:'0.01'})}{field('Koeficijent prekovremenog rada','overtimeMultiplier',rules.overtimeMultiplier,updateRule,{type:'number',min:1,max:3,step:'0.1'})}</div>
      <div className="settings-rule-checks"><label><input type="checkbox" checked={Boolean(rules.requireWriteoffReason)} onChange={event => updateRule('requireWriteoffReason', event.target.checked)}/> Obvezan razlog za otpis materijala</label><label><input type="checkbox" checked={Boolean(rules.requireStocktakeApproval)} onChange={event => updateRule('requireStocktakeApproval', event.target.checked)}/> Zahtijevaj odobrenje inventurne korekcije</label></div>
      <div className="settings-rule-summary"><strong>Informativni pregled smjene</strong><span>{workMinutes > 0 ? calculateNetShiftMinutes(rules) : '—'} minuta rada nakon pauze</span></div>
      <div className="settings-actions"><button className="button button-primary" onClick={() => save(profile, settings, 'Promjena pravila rada')}><CheckCircle2 size={15}/> Spremi pravila</button></div>
    </section>}
    {tab === 'saws' && <section className="settings-config-grid">
      <div className="panel settings-panel">
        <div className="panel-heading"><div><h2>Stvarni parametri pila</h2><p>Postavi vrijednosti prema izmjerenoj širini lista i načinu obrezivanja u radionici.</p></div><Scissors size={20}/></div>
        <div className="settings-form-grid">
          {['Pila 1','Pila 2'].map(saw => <div className="panel settings-list-card" key={saw}>
            <div className="panel-heading"><div><h3>{saw}</h3><p>Zaseban profil stroja za automatski plan.</p></div><Scissors size={18}/></div>
            <label>Stvarna širina reza (mm)<input type="number" min="0" max="20" step="0.1" value={sawSettings[saw]?.kerfMm ?? 4} onChange={event => updateSaw(saw,'kerfMm',event.target.value)}/></label>
            <label>Rubno obrezivanje po strani (mm)<input type="number" min="0" max="50" step="0.5" value={sawSettings[saw]?.trimMm ?? 10} onChange={event => updateSaw(saw,'trimMm',event.target.value)}/></label>
          </div>)}
        </div>
        <p className="backup-footnote">Početne vrijednosti 4 mm i 10 mm služe samo kao zadane postavke. Izmjeri stvarni rez na svakoj pili i unesi točne vrijednosti prije korištenja plana u proizvodnji.</p>
        <div className="settings-actions"><button className="button button-primary" onClick={() => save(profile, settings, 'Promjena postavki pila', sawSettings)}><CheckCircle2 size={15}/> Spremi postavke pila</button></div>
      </div>
    </section>}
    {tab === 'sync' && <section className="panel settings-panel shared-storage-panel">
      <div className="panel-heading"><div><h2>Zajednička pohrana Kamen-app</h2><p>Sigurno spremanje poslovnih podataka na Cloudflare D1 za rad s računala i mobitela.</p></div><Cloud size={21}/></div>
      <div className="shared-storage-status">
        <span className={sharedStatus ? 'shared-status-dot connected' : 'shared-status-dot'} />
        <div><strong>{sharedStatus ? 'Povezano s D1 bazom' : 'Veza još nije potvrđena'}</strong><small>API: kamen-app-api-staging · D1: kamen-app-staging · odvojeno od produkcijske aplikacije</small></div>
      </div>
      <div className="shared-storage-actions">
        <button type="button" className="button button-secondary" onClick={openSharedLogin}><ShieldCheck size={15}/> Sigurna prijava</button>
        <button type="button" className="button button-secondary" onClick={checkSharedConnection} disabled={sharedBusy}><RefreshCw size={15}/> Provjeri vezu</button>
      </div>
      {sharedAccessReady && !sharedStatus && <div className="shared-company-bootstrap">
        <strong>Početno postavljanje tvrtke</strong>
        <p>Prijavljeni vlasnik može otvoriti prvu tvrtku. Naziv upiši točno kako želiš da se prikazuje u aplikaciji.</p>
        <label>Naziv tvrtke<input value={sharedCompanyName} onChange={event => setSharedCompanyName(event.target.value)} placeholder="Naziv kamenoklesarske tvrtke / obrta"/></label>
        <button type="button" className="button button-primary" onClick={createSharedCompany} disabled={sharedBusy || !sharedCompanyName.trim()}>Otvori tvrtku u D1</button>
      </div>}
      {sharedStatus && <>
        <div className="shared-storage-metrics">
          <div><small>Tvrtka</small><strong>{sharedStatus.company.name}</strong></div>
          <div><small>Uloga</small><strong>{sharedStatus.user.role}</strong></div>
          <div><small>Zapisi u D1</small><strong>{sharedStatus.count}</strong></div>
          <div><small>Lokalni zapisi</small><strong>{getLocalBusinessData().length}</strong></div>
        </div>
        {sharedStatus.count === 0 ? <div className="shared-storage-choice">
          <p>Zajednička baza je prazna. Postojeći podaci iz ovog preglednika mogu se prenijeti kao početna kopija. Ništa se ne briše iz preglednika.</p>
          <button type="button" className="button button-primary" onClick={importLocalToShared} disabled={sharedBusy || !getLocalBusinessData().length}><Cloud size={15}/> Prenesi lokalne podatke u D1</button>
        </div> : <div className="shared-storage-choice">
          <p>Zajednička baza sadrži {sharedStatus.count} zapisa. Možeš preuzeti zajedničko stanje na ovaj uređaj ili provjeriti promjene od zadnje sinkronizacije.</p>
          <div className="shared-storage-actions">
            <button type="button" className="button button-primary" onClick={downloadSharedToDevice} disabled={sharedBusy}><Cloud size={15}/> Preuzmi podatke iz D1</button>
            <button type="button" className="button button-secondary" onClick={reconcileSharedNow} disabled={sharedBusy}><RefreshCw size={15}/> Uskladi promjene</button>
          </div>
        </div>}
      </>}
      {sharedStatus && ['owner','manager'].includes(sharedStatus.user.role) && <div className="shared-members-panel">
        <div><strong>Članovi tvrtke i pristup</strong><p>Svaki pozvani član prijavljuje se svojom e-mail adresom. API provjerava članstvo i ulogu; radnici ne dobivaju pristup cijenama i troškovima.</p></div>
        <div className="shared-member-invite">
          <label>E-mail člana<input type="email" value={memberEmail} onChange={event => setMemberEmail(event.target.value)} placeholder="radnik@tvrtka.hr"/></label>
          <label>Ime i prezime<input value={memberName} onChange={event => setMemberName(event.target.value)} placeholder="Ime radnika"/></label>
          <label>Uloga<select value={memberRole} onChange={event => setMemberRole(event.target.value)} disabled={sharedStatus.user.role === 'manager'}><option value="worker">Radnik</option>{sharedStatus.user.role === 'owner' && <option value="manager">Voditelj</option>}</select></label>
          <button type="button" className="button button-primary" onClick={addSharedMember} disabled={sharedBusy || !memberEmail.trim()}><UserPlus size={15}/> Dodaj člana</button>
        </div>
        <div className="shared-members-list">
          {sharedMembers.map(item => <div className="shared-member-row" key={item.email}>
            <div><strong>{item.display_name || item.email}</strong><small>{item.email} · {item.role === 'owner' ? 'Vlasnik' : item.role === 'manager' ? 'Voditelj' : 'Radnik'}</small></div>
            <span className={item.active ? 'shared-member-active' : 'shared-member-inactive'}>{item.active ? 'Aktivan' : 'Deaktiviran'}</span>
            {item.active && item.email.toLowerCase() !== sharedStatus.user.email.toLowerCase() && <button type="button" className="button button-secondary" onClick={() => removeSharedMember(item.email)} disabled={sharedBusy}><UserMinus size={14}/> Ukloni</button>}
          </div>)}
          {!sharedMembers.length && <small>Još nema dodanih članova.</small>}
        </div>
      </div>}
      {sharedSyncStatus && <p className="shared-sync-state">Status sinkronizacije: {sharedSyncStatus}</p>}
      {sharedMessage && <div className="module-notice backup-message"><CheckCircle2 size={16}/>{sharedMessage}</div>}
      {sharedError && <div className="module-notice backup-error">{sharedError}</div>}
      <div className="backup-footnote"><ShieldCheck size={15}/> Zaštićeno Cloudflare Access prijavom i provjerom članstva tvrtke. Ako se zapisi promijene na dva uređaja istodobno, sustav označava sukob umjesto da tiho prepiše podatke.</div>
    </section>}
    {message && <div className="module-notice backup-message"><CheckCircle2 size={16}/>{message}</div>}
    {error && <div className="module-notice backup-error">{error}</div>}
    <section className="panel settings-history"><div className="panel-heading"><div><h2>Povijest promjena postavki</h2><p>Lokalni zapis promjena, najnovije na vrhu.</p></div><span className="count-pill">{audit.length}</span></div>{audit.length ? audit.slice(0,20).map(item => <div className="settings-history-row" key={item.id}><span><strong>{item.action}</strong><small>{item.details}</small></span><time>{new Date(item.createdAt).toLocaleString('hr-HR')}</time></div>) : <div className="empty-state">Još nema evidentiranih promjena.</div>}</section>
    <div className="backup-footnote"><Settings2 size={15}/> Postavke su lokalne i nisu sigurnosna granica. U završnoj fazi povezat će se s tvrtkom i njezinim korisničkim računima.</div>
  </div>;
}
