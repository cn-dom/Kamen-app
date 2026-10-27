# Kamen-app — predložena struktura projekta

**Status:** prijedlog za potvrdu prije implementacije  
**Opseg:** dokumentacijska priprema; bez baze, prijave i integracije Supabasea.

## 1. Pravila organizacije

- Odvojiti prikaz, poslovna pravila, pristup podacima i testove.
- Složene module držati samostalnima, ali koristiti zajedničke komponente za obrasce, tablice, obavijesti i potvrde.
- Ovlasti provjeravati na poslužiteljskoj strani i na sloju podataka; prikaz u sučelju samo je dodatna zaštita.
- Svaki zapis koji pripada tvrtki mora imati jasno utvrđen kontekst tvrtke.
- Dokumenti i fotografije privatni su po zadanim postavkama.
- U repozitorij ne spremati tajne, pristupne ključeve, lozinke ni stvarne podatke klijenata.
- Ne stvarati datoteke za migracije baze ili konfiguraciju Supabasea u ovoj fazi.

## 2. Predloženi direktoriji

Ovo je ciljna organizacija, a ne tvrdnja da aplikacijski kod već postoji.

```text
Kamen-app/
├── README.md
├── SPECIFIKACIJA-PROGRAMA.md
├── docs/
│   ├── STRUKTURA-PROJEKTA.md
│   ├── PLAN-EKRANA.md
│   ├── MODEL-PODATAKA-POJMOVNI.md
│   ├── ULOGE-I-OVLASTI.md
│   ├── SIGURNOST-I-PRIVATNOST.md
│   ├── TESTNI-SCENARIJI.md
│   └── ODLUKE-I-OTVORENA-PITANJA.md
├── public/
│   ├── images/
│   └── icons/
├── src/
│   ├── app/
│   │   ├── routes/
│   │   ├── layouts/
│   │   └── navigation/
│   ├── components/
│   │   ├── common/
│   │   ├── forms/
│   │   ├── tables/
│   │   └── feedback/
│   ├── modules/
│   │   ├── dashboard/
│   │   ├── customers/
│   │   ├── projects/
│   │   ├── work-orders/
│   │   ├── production/
│   │   ├── inventory/
│   │   ├── stone-tracking/
│   │   ├── field-work/
│   │   ├── tools-equipment/
│   │   ├── costs-reports/
│   │   └── company-settings/
│   ├── services/
│   ├── validation/
│   ├── permissions/
│   ├── utils/
│   └── styles/
└── tests/
    ├── unit/
    ├── integration/
    └── acceptance/
```

Tehnologija i točna struktura datoteka odabiru se prije izrade aplikacijskog kostura. Ne treba unaprijed stvarati prazne direktorije ako odabrani alat ne prati prazne mape u Git-u.

## 3. Odgovornosti slojeva

### `app/`
Rute, rasporedi stranica i navigacija. Ovdje se ne smiju nalaziti ključna pravila obračuna materijala ili sigurnosne provjere kao jedina zaštita.

### `components/`
Ponovno iskoristivi vizualni elementi: polja obrazaca, dijalozi potvrde, tablice, statusne oznake, pretraživanje, učitavanje, poruke pogrešaka i prazna stanja.

### `modules/`
Poslovne cjeline s vlastitim ekranima, validacijom i logikom tijeka rada. Primjerice, praćenje kamene ploče povezano je sa skladištem i radnim nalogom, ali ne smije zaobići njihove provjere ovlasti.

### `services/`
Kontrolirani pristup vanjskim servisima i podatkovnim izvorima. U početku bez aktivne integracije baze.

### `permissions/`
Zajednička definicija dopuštenih radnji po ulozi, uz obaveznu poslužiteljsku provjeru kada se implementiraju API i baza.

### `validation/`
Provjere unosa, dimenzija, količina, vremena, obveznih polja i poslovnih pravila.

### `tests/`
Testovi izolacije tvrtki, ovlasti, skladišnih događaja, praćenja ploče i ostataka, radnih faza, terenskih sati i izvještaja.

## 4. Redoslijed pripreme

1. Potvrditi plan ekrana i glavnu navigaciju.
2. Dogovoriti pojmovni model podataka bez vezivanja uz konkretnu bazu.
3. Razraditi tablicu uloga i ovlasti.
4. Dogovoriti jedinice mjere, obračun sati i pravila zatvaranja naloga.
5. Odabrati tehnologije i dogovoriti način lokalnog pokretanja i testiranja.
6. Tek nakon potvrde pripremiti minimalni aplikacijski kostur.
7. Supabase povezati isključivo nakon izričitog odobrenja vlasnika projekta.

## 5. Kriterij spremnosti za početak kodiranja

- Glavna navigacija i ekrani su dogovoreni.
- Jasno je što vlasnik, voditelj, skladištar, administracija i radnik smiju vidjeti i mijenjati.
- Utvrđeno je kako se evidentiraju promjene materijala i kako se čuva povijest.
- Otvorena obračunska pitanja imaju odluku ili su jasno označena kao izvan prve verzije.
- Postoji plan testiranja izolacije tvrtki i financijskih ovlasti.
