import React from 'react';
import WarehouseModule from './WarehouseModule.jsx';
import WorkOrdersModule from './WorkOrdersModule.jsx';
import { Boxes, ClipboardList, Factory, Truck, Users, Wallet, Settings2, ArrowRight, Construction } from 'lucide-react';

const modules = {
  'Radni nalozi': {
    icon: ClipboardList,
    eyebrow: 'PROJEKTI I EVIDENCIJA',
    title: 'Radni nalozi',
    description: 'Središnje mjesto za naloge, kupce, rokove, dokumente i napredak svakog projekta.',
    steps: ['Popis i pretraživanje naloga', 'Dosje naloga s dimenzijama i fotografijama', 'Rokovi, odgovorne osobe i statusi']
  },
  'Proizvodnja': {
    icon: Factory,
    eyebrow: 'RADIONICA I OBRADA',
    title: 'Proizvodnja',
    description: 'Praćenje svakog komada kamena kroz pilanje, obradu rubova, poliranje i završnu kontrolu.',
    steps: ['Proizvodne faze i raspored', 'Evidencija po pojedinačnom komadu', 'Utrošak materijala, zastoji i kontrola kvalitete']
  },
  'Skladište': {
    icon: Boxes,
    eyebrow: 'MATERIJAL I ZALIHE',
    title: 'Skladište',
    description: 'Evidencija ploča, komada, upotrebljivih ostataka, otpada, lokacija i kretanja materijala.',
    steps: ['Materijali, dimenzije i lokacije', 'Zaprimanje, izdavanje, povrat i inventura', 'Ostatci i otpis s razlogom i odobrenjem']
  },
  'Terenski rad': {
    icon: Truck,
    eyebrow: 'PRIJEVOZ I MONTAŽA',
    title: 'Terenski rad',
    description: 'Planiranje montaže i terenskih poslova povezanih s izvornim radnim nalogom.',
    steps: ['Termin, lokacija, ekipa i vozilo', 'Vrijeme puta, rada i povratka', 'Ugrađeni i vraćeni materijal te fotografije']
  },
  'Kupci': {
    icon: Users,
    eyebrow: 'KONTAKTI I NARUDŽBE',
    title: 'Kupci',
    description: 'Jedinstvena evidencija kupaca i njihovih projekata, kontakata i dogovora.',
    steps: ['Podaci i kontakt kupca', 'Povezani radni nalozi', 'Napomene i povijest suradnje']
  },
  'Troškovi i izvještaji': {
    icon: Wallet,
    eyebrow: 'KONTROLA POSLOVANJA',
    title: 'Troškovi i izvještaji',
    description: 'Pregled planiranih i stvarnih troškova, utroška materijala, radnih sati i rezultata projekta.',
    steps: ['Troškovi po projektu', 'Planirano nasuprot stvarnom', 'Izvještaji i izvoz nakon izrade evidencija']
  },
  'Postavke': {
    icon: Settings2,
    eyebrow: 'TVRTKA I PRAVILA RADA',
    title: 'Postavke',
    description: 'Mjesto za profil tvrtke, logotip, korisnike, uloge i prilagodbu proizvodnih procesa.',
    steps: ['Podaci i vizualni identitet tvrtke', 'Korisnici i ovlasti', 'Prilagodljive faze i jedinice mjere']
  }
};

export default function ModulePlaceholder({ name, onBack }) {
  if (name === 'Skladište') return <WarehouseModule onBack={onBack} />;
  if (name === 'Radni nalozi') return <WorkOrdersModule onBack={onBack} />;
  const module = modules[name] || {
    icon: Construction,
    eyebrow: 'SLJEDEĆI RAZVOJNI KORAK',
    title: name,
    description: 'Ovaj modul je predviđen u specifikaciji programa i čeka implementaciju.',
    steps: ['Definirati polja i pravila', 'Izraditi obrazac i popis', 'Dodati provjere i testne scenarije']
  };
  const Icon = module.icon;

  return (
    <div className="page-content module-page">
      <section className="welcome-row module-welcome">
        <div>
          <div className="eyebrow"><span className="live-dot" /> {module.eyebrow}</div>
          <h1>{module.title}</h1>
          <p className="subtitle">{module.description}</p>
        </div>
        <button className="button button-secondary" onClick={onBack}>← Povratak na pregled</button>
      </section>
      <section className="module-intro panel">
        <div className="module-icon"><Icon size={25} /></div>
        <div>
          <span className="module-status">STRUKTURA MODULA</span>
          <h2>Što će ovaj modul obuhvaćati</h2>
          <p>Ovo je početna struktura sučelja. Podaci su još ogledni; nema povezivanja s bazom ni spremanja poslovnih promjena.</p>
        </div>
      </section>
      <section className="module-plan-grid">
        {module.steps.map((step, index) => (
          <article className="panel module-plan-card" key={step}>
            <span className="module-step">0{index + 1}</span>
            <h3>{step}</h3>
            <p>Ovaj dio bit će izrađen i testiran kao zaseban korak, bez preskakanja kontrole podataka i ovlasti.</p>
          </article>
        ))}
      </section>
      <div className="module-notice"><Construction size={17} /><span>Modul je u pripremi. Još nije povezan sa stvarnim podacima.</span><ArrowRight size={16} /></div>
    </div>
  );
}
