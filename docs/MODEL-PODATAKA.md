# Kamen-app — konceptualni model podataka

**Verzija:** 1.0  
**Status:** Prijedlog za pregled — nije implementirana baza

Ovaj dokument opisuje koje informacije aplikacija treba povezivati. Nije SQL shema i ne stvara tablice. Ne povezuje se s bazom podataka.

## Temeljna pravila

1. Svaki poslovni zapis pripada jednoj tvrtki (company).
2. Zapis koji pripada tvrtki mora nositi jasnu vezu s tom tvrtkom; pristup se provjerava na poslužitelju.
3. Povezani zapisi moraju pripadati istoj tvrtki. Radni nalog tvrtke A ne smije koristiti kupca ili skladišnu stavku tvrtke B.
4. Važne promjene zalihe i troškova bilježe se kao događaji, a ne samo prepisivanjem trenutačnog stanja.
5. Novčani iznosi vode se u eurima (EUR).
6. Brisanje poslovnih zapisa treba ograničiti; za važne zapise prednost imaju arhiviranje i evidentirana ispravka.
7. Fotografije, nacrti i dokumenti imaju metapodatke, vlasnika zapisa i pravila privatnosti. Datoteke nisu javne po zadanim postavkama.

## Glavne cjeline i veze

### Tvrtke i pristup

- **Tvrtka** — naziv, logo, kontaktni i poslovni podaci, status računa i postavke.
- **Korisnički račun** — identitet osobe koja se prijavljuje.
- **Članstvo u tvrtki** — povezuje račun i tvrtku, s ulogom, statusom i dopuštenjima. Jedna osoba može imati pristup više tvrtki samo ako joj je to izričito dodijeljeno.
- **Uloga i dopuštenje** — definiraju koje radnje korisnik smije izvršiti.
- **Zapis revizije** — tko je, kada i zašto promijenio podatke; po potrebi čuva prethodnu i novu vrijednost.

### Kupci, dobavljači i projekti

- **Kupac** — kontaktni podaci i povijest suradnje.
- **Dobavljač** — kontaktni podaci i podaci o nabavi.
- **Projekt / radni nalog** — jedinstvena oznaka, kupac, lokacija, rok, opis, status, ponuda i poveznice na fotografije/nacrte.
- **Stavka radnog naloga** — konkretan proizvod ili dio koji se izrađuje; omogućuje da različiti komadi istog projekta budu u različitim fazama.
- **Ponuda i troškovna stavka** — planirane količine, cijene i troškovi; izdavanje računa/fiskalizacija nije uključeno dok se zasebno ne dogovori.

### Materijali i sljedivost kamena

- **Materijal** — naziv, vrsta, jedinica mjere i relevantne dimenzije.
- **Skladišna lokacija** — skladište, zona, regal ili mjesto odlaganja.
- **Serija / kamena ploča** — identifikacijska oznaka, dobavljač, nabavna cijena, dimenzije, fotografije, datum primitka i lokacija.
- **Skladišni događaj** — primitak, premještaj, rezervacija, izdavanje, povrat, korekcija ili otpis; količina, vrijeme, odgovorna osoba i razlog.
- **Komad / ostatak** — nastaje obradom ploče ili drugog komada; čuva vezu s izvornikom, dimenzije, stanje, lokaciju i mogućnost ponovne uporabe.
- **Veza porijekla** — prati iz koje ploče ili komada potječe svaki izlazni komad i ostatak.
- **Inventura** — očekivano i prebrojeno stanje, razlika, odobrenje i obrazloženje.

### Proizvodnja

- **Predložak faza** — redoslijed i vrste faza koje tvrtka može prilagoditi.
- **Faza radnog naloga / komada** — status, odgovorni radnik ili tim, planirani i stvarni početak/završetak, utrošak, bilješke i fotografije.
- **Evidencija rada** — osoba, projekt ili komad, vrsta rada, početak, završetak, pauze i odobrenje.
- **Zastoj / blokada** — razlog, vrijeme početka i završetka, odgovorna osoba i utjecaj na rok.

### Terenski rad i oprema

- **Terenski nalog** — lokacija, datum, tim, vozilo, plan i stvarno trajanje te veza s projektom.
- **Događaj terenskog rada** — polazak, dolazak, početak montaže, završetak, povratak, čekanje, pauza ili dodatni odlazak.
- **Izdani materijal i alat** — planirana, izdana, ugrađena, vraćena, oštećena ili otpisana količina, uz odgovorne osobe.
- **Terenski trošak** — prijevoz, potrošni materijal, dodatni rad ili drugi odobreni trošak.
- **Fotografija prije/poslije** — povezana s terenskim nalogom i vremenom nastanka.

### Izvještavanje

- **Troškovna stavka** — vrsta troška, iznos EUR, datum, projekt, izvor i status odobrenja.
- **Prodajna stavka** — dogovorena cijena ili vrijednost ponude; vidljiva samo ovlaštenim ulogama.
- **Izvoz izvještaja** — tko je izradio izvještaj, kada, za koju tvrtku i koji opseg podataka.

## Pravila obračuna i sljedivosti

- Trenutačno stanje zalihe mora se moći objasniti zbrojem relevantnih skladišnih događaja.
- Izdavanje materijala radnom nalogu ne smije se automatski tretirati kao konačna potrošnja ako je moguć povrat.
- Ostatak mora imati vlastitu oznaku i vezu s izvornom pločom/komadom.
- Otpis, korekcija inventure i promjena troška trebaju razlog i, prema pravilima tvrtke, odobrenje.
- Izvještaji moraju razlikovati planirane i stvarne vrijednosti.
- Vrijeme rada, pauze, putovanja i čekanja trebaju imati zasebna pravila obračuna prije implementacije.
- Jedinice mjere i pretvorbe (kom, m, m², m³, kg i druge) moraju biti izričito definirane; pretvorba se ne smije nagađati.

## Otvoreno prije implementacije

1. Koje su jedinice mjere dopuštene za svaki tip materijala i kako se računaju dimenzije?
2. Kada izdani kamen postaje potrošnja: pri izdavanju, završetku faze ili potvrdi utroška?
3. Tko odobrava otpis, inventurne razlike i promjene nabavne cijene?
4. Kako se rezerviraju ostaci za buduće projekte i koliko dugo rezervacija vrijedi?
5. Obračunavaju li se put, pauza i čekanje kao radni sati, zasebni trošak ili oboje?
6. Koji podaci moraju biti uneseni prije zatvaranja radnog naloga?
7. Treba li aplikacija zamijeniti računovodstveni/fiskalizacijski sustav ili samo pripremati podatke za njega?
8. Treba li unos raditi bez interneta i kako se sigurno usklađuju kasnije promjene?

## Izvan opsega ovog dokumenta

Ovaj dokument ne definira SQL, migracije, konkretnog pružatelja baze, prijavu, API ključeve niti postavke produkcije. Ništa od toga ne treba izrađivati prije odobrenja sljedeće faze.
