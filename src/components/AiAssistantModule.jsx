import React, { useEffect, useMemo, useRef, useState } from 'react';
import { buildKamenAiPrompt } from '../lib/aiKnowledge.js';
import { AlertCircle, Bot, CheckCircle2, ChevronRight, Loader2, Send, ShieldCheck, Sparkles, Trash2, Warehouse } from 'lucide-react';

const SDK_URL = 'https://js.puter.com/v2/';
const readCollection = key => {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

function getOperationalContext(searchText = '') {
  const materials = readCollection('kamen-app-materials-v1').filter(item => !item.archived);
  const orders = readCollection('kamen-app-work-orders-v1');
  const stages = readCollection('kamen-app-production-stages-v1');
  const lowStock = materials.filter(item => Number(item.min || 0) > 0 && Number(item.quantity || 0) <= Number(item.min || 0));
  const activeOrders = orders.filter(order => !['Završen', 'Otkazan'].includes(order.status));
  const searchTerms = String(searchText).toLocaleLowerCase('hr').split(/[^\p{L}\p{N}]+/u).filter(term => term.length >= 3);
  const prioritizedMaterials = [...materials].sort((a, b) => {
    const score = item => searchTerms.reduce((total, term) => total + (String(item.name || '').toLocaleLowerCase('hr').includes(term) ? 10 : 0), 0);
    return score(b) - score(a);
  });
  const materialRows = prioritizedMaterials.slice(0, 100).map(item => ({
    materijal: item.name || 'Bez naziva',
    vrsta: item.type || item.materialType || 'Nije navedeno',
    dimenzije: [item.length, item.width, item.thickness].filter(value => value !== undefined && value !== null && value !== '').join(' × ') || 'Nisu navedene',
    količina: item.quantity ?? 0,
    jedinica: item.unit || 'kom',
    lokacija: item.location || 'Nije navedena',
    oblik: item.form || item.itemType || ''
  }));
  const orderRows = activeOrders.slice(0, 25).map(order => ({
    nalog: order.id || 'Bez oznake',
    projekt: order.title || order.project || 'Bez naziva',
    status: order.status || order.stage || 'Nije naveden',
    rok: order.dueDate || order.due || 'Nije naveden',
    brojStavki: Array.isArray(order.pieces) ? order.pieces.length : undefined
  }));
  return {
    sažetak: {
      ukupnoAktivnihMaterijala: materials.length,
      aktivnihRadnihNaloga: activeOrders.length,
      evidentiranihFazaProizvodnje: stages.length,
      materijalaIspodMinimuma: lowStock.length
    },
    niskeZalihe: lowStock.slice(0, 20).map(item => ({
      materijal: item.name || 'Bez naziva',
      stanje: item.quantity ?? 0,
      minimum: item.min ?? 0,
      jedinica: item.unit || 'kom'
    })),
    skladište: materialRows,
    radniNalozi: orderRows,
    napomena: 'Ovo je ograničeni operativni sažetak. Ne uključuje imena kupaca, kontakte, račune, uplate ni financijske podatke.'
  };
};

function responseToText(response) {
  const content = response?.message?.content ?? response?.text ?? response;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(part => typeof part === 'string' ? part : part?.text || '').filter(Boolean).join('\n');
  try { return JSON.stringify(content, null, 2); } catch { return String(content ?? 'AI nije vratio tekstualni odgovor.'); }
}

export default function AiAssistantModule() {
  const [sdkState, setSdkState] = useState(() => window.puter?.ai ? 'ready' : 'loading');
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: 'Pozdrav! Ja sam AI pomoćnik za Kamen-app. Mogu pomoći s organizacijom radionice, razumijevanjem zaliha, radnih naloga, planiranjem pilanja i poslovnim postupcima. Za konkretne podatke iz aplikacije prvo uključi dopuštenje za slanje ograničenog operativnog sažetka.'
  }]);
  const [input, setInput] = useState('');
  const [includeContext, setIncludeContext] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);
  const contextPreview = useMemo(() => getOperationalContext(), [messages.length]);
  const suggestions = [
    'Kako mogu smanjiti otpad pri rezanju granitnih ploča?',
    'Objasni mi kako najbolje organizirati faze proizvodnje.',
    'Na što trebam paziti kod evidencije ostataka kamena?',
    'Kako izračunati cijenu kamenoklesarskog radnog naloga?'
  ];

  useEffect(() => {
    if (window.puter?.ai) {
      setSdkState('ready');
      return undefined;
    }
    let cancelled = false;
    let script = document.querySelector('script[data-kamen-puter-sdk]');
    const onLoad = () => { if (!cancelled) setSdkState(window.puter?.ai ? 'ready' : 'error'); };
    const onError = () => { if (!cancelled) setSdkState('error'); };
    if (!script) {
      script = document.createElement('script');
      script.src = SDK_URL;
      script.async = true;
      script.dataset.kamenPuterSdk = 'true';
      script.addEventListener('load', onLoad, { once: true });
      script.addEventListener('error', onError, { once: true });
      document.head.appendChild(script);
    } else {
      script.addEventListener('load', onLoad, { once: true });
      script.addEventListener('error', onError, { once: true });
      if (window.puter?.ai) onLoad();
    }
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  const sendMessage = async (event) => {
    event?.preventDefault?.();
    const question = input.trim();
    if (!question || busy) return;
    if (!window.puter?.ai?.chat) {
      setError('Puter se još nije učitao. Provjeri internetsku vezu i pokušaj ponovno.');
      setSdkState('error');
      return;
    }
    setError('');
    setInput('');
    setMessages(current => [...current, { role: 'user', content: question }]);
    setBusy(true);
    try {
      const context = includeContext ? getOperationalContext() : null;
      const prompt = buildKamenAiPrompt(question, context);
      const response = await window.puter.ai.chat(prompt);
      const answer = responseToText(response).trim() || 'AI nije vratio odgovor. Pokušaj ponovno.';
      setMessages(current => [...current, { role: 'assistant', content: answer }]);
    } catch (err) {
      setError(err?.message || 'Povezivanje s Puter AI servisom nije uspjelo. Provjeri prijavu i pokušaj ponovno.');
    } finally {
      setBusy(false);
    }
  };

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: 'Razgovor je očišćen. Što želiš istražiti u svojoj radionici?' }]);
    setError('');
  };

  return <div className="ai-page">
    <section className="ai-hero">
      <div className="ai-hero-icon"><Sparkles size={23}/></div>
      <div className="ai-hero-copy">
        <div className="ai-kicker">PUTER AI · PAMETNA PODRŠKA RADIONICI</div>
        <h1>AI pomoćnik</h1>
        <p>Razgovaraj s AI pomoćnikom o kamenu, proizvodnji, pilanju, skladištu i organizaciji poslovanja.</p>
      </div>
      <div className={'ai-connection '+(sdkState === 'ready' ? 'connected' : sdkState === 'error' ? 'disconnected' : '')}>
        <span/>{sdkState === 'ready' ? 'Puter je spreman' : sdkState === 'error' ? 'Veza nije dostupna' : 'Povezivanje…'}
      </div>
    </section>

    <div className="ai-workspace">
      <section className="ai-chat panel">
        <header className="ai-chat-head">
          <div className="ai-chat-avatar"><Bot size={19}/></div>
          <div><strong>Kamen AI asistent</strong><small>Odgovori se generiraju putem Puter AI-ja</small></div>
          <button className="ai-clear" onClick={clearChat} title="Očisti razgovor"><Trash2 size={16}/> Novi razgovor</button>
        </header>
        <div className="ai-messages" aria-live="polite">
          {messages.map((message, index) => <article className={'ai-message '+message.role} key={index}>
            <div className="ai-message-avatar">{message.role === 'assistant' ? <Sparkles size={15}/> : 'TI'}</div>
            <div className="ai-message-content"><div className="ai-message-label">{message.role === 'assistant' ? 'KAMEN AI' : 'VI'}</div><p>{message.content}</p></div>
          </article>)}
          {busy && <article className="ai-message assistant"><div className="ai-message-avatar"><Sparkles size={15}/></div><div className="ai-message-content"><div className="ai-message-label">KAMEN AI</div><p className="ai-thinking"><Loader2 size={15}/> Razmišljam i pripremam odgovor…</p></div></article>}
          <div ref={endRef}/>
        </div>
        {error && <div className="ai-error"><AlertCircle size={16}/><span>{error}</span></div>}
        <form className="ai-composer" onSubmit={sendMessage}>
          <textarea value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(event); } }} placeholder="Napiši pitanje za AI pomoćnika…" rows={2} disabled={busy}/>
          <button className="button button-primary" type="submit" disabled={busy || !input.trim() || sdkState !== 'ready'}><Send size={16}/> Pošalji</button>
        </form>
        <div className="ai-chat-foot"><span><ShieldCheck size={14}/> AI odgovori su savjetodavni — provjeri ih prije poslovne odluke.</span><span>Enter za slanje · Shift + Enter za novi red</span></div>
      </section>

      <aside className="ai-side">
        <section className="panel ai-context-card">
          <div className="ai-side-title"><Warehouse size={17}/><strong>Podaci Kamen-appa</strong></div>
          <p>Po zadanim postavkama AI ne vidi tvoje poslovne podatke. Ako uključiš opciju, šalje se ograničeni sažetak skladišta i radnih naloga.</p>
          <label className="ai-consent">
            <input type="checkbox" checked={includeContext} onChange={event => setIncludeContext(event.target.checked)}/>
            <span><strong>Dopusti kontekst aplikacije</strong><small>Bez imena kupaca, kontakata, računa i uplata.</small></span>
          </label>
          <div className="ai-context-stats">
            <div><strong>{contextPreview.sažetak.ukupnoAktivnihMaterijala}</strong><small>materijala</small></div>
            <div><strong>{contextPreview.sažetak.aktivnihRadnihNaloga}</strong><small>aktivnih naloga</small></div>
            <div><strong>{contextPreview.sažetak.materijalaIspodMinimuma}</strong><small>niskih zaliha</small></div>
          </div>
          <small className="ai-context-note"><ShieldCheck size={13}/> Sažetak se šalje samo uz pitanje i samo kada je opcija uključena. Ne sprema se u Kamen-app.</small>
        </section>

        <section className="panel ai-suggestions">
          <div className="ai-side-title"><Sparkles size={17}/><strong>Prijedlozi pitanja</strong></div>
          {suggestions.map(suggestion => <button key={suggestion} onClick={() => setInput(suggestion)}>{suggestion}<ChevronRight size={15}/></button>)}
        </section>

        <section className="ai-provider-note">
          <CheckCircle2 size={16}/>
          <p><strong>Povezano putem Puter.js</strong><br/>Za korištenje AI-ja može biti potrebna prijava na Puter račun. Puter primjenjuje svoj model naplate po korisniku; eventualna potrošnja i limiti ovise o Puter računu.</p>
        </section>
      </aside>
    </div>
  </div>;
}
