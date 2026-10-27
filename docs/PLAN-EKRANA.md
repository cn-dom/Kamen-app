# Kamen-app — detaljan plan ekrana

**Verzija:** 1.0  
**Status:** plan prije razvoja  
**Napomena:** ekrani su opisani funkcionalno. Nisu implementirani. Nema povezivanja sa Supabaseom.

## 1. Načela sučelja

- Sučelje mora biti jasno i brzo za korištenje u radionici, skladištu i na terenu.
- Na mobitelu su primarne radnje dostupne bez vodoravnog pomicanja; široke tablice pretvaraju se u kartice ili imaju kontrolirano pomicanje.
- Važni statusi prikazuju se tekstom i oznakom, ne samo bojom.
- Svaki obrazac prikazuje obvezna polja, validaciju i jasnu poruku uspjeha ili pogreške.
- Brisanje, otpis, inventurna korekcija i zatvaranje naloga zahtijevaju potvrdu; osjetljive radnje mogu zahtijevati razlog ili odobrenje.
- Korisnik vidi samo module i podatke za koje ima ovlasti. To se kasnije mora provoditi i na poslužitelju i na razini podataka.
- Cijene i financijski podaci nisu vidljivi radnicima prema zadanim postavkama.
- Valuta je uvijek EUR (€).

## 2. Glavna navigacija

Prikaz stavki ovisi o ulozi i dodijeljenim ovlastima.

1. **Pregled**
2. **Projekti i radni nalozi**
3. **Skladište**
4. **Praćenje kamena**
5. **Proizvodnja**
6. **Terenski rad i montaže**
7. **Alati i oprema**
8. **Kupci i dobavljači**
9. **Troškovi i izvještaji** — samo ovlašteni korisnici
10. **Radnici i raspored**
11. **Dokumenti**
12. **Postavke tvrtke**
13. **Obavijesti**
14. **Povijest promjena** — samo ovlašteni korisnici

Na mobitelu se koristi sažeta navigacija s lako dostupnim pretraživanjem i glavnim radnjama. Vlasnik platforme dobiva zaseban administrativni dio za upravljanje pristupom tvrtki, odvojen od poslovnog sučelja klijenata.

## 3. Prijava i ulazni zasloni

### E-01 — Prijava
**Svrha:** siguran ulaz postojećeg korisnika.

Polja i radnje:
- e-adresa i lozinka;
- prijava;
- zatraži ponovno postavljanje lozinke;
- poruke za pogrešne podatke, blokiran pristup ili problem s mrežom.

Pravila:
- ne otkrivati postoji li određena e-adresa u sustavu;
- nakon prijave otvoriti početni ekran u kontekstu tvrtke kojoj korisnik pripada;
- ne dopuštati pristup poslovnim podacima samo zato što je korisnik prijavljen.

### E-02 — Poziv ili aktivacija korisnika
- prihvat poziva u tvrtku;
- prikaz naziva tvrtke i dodijeljene uloge;
- postavljanje pristupnih podataka prema budućem modelu autentikacije;
- jasna poruka ako je poziv istekao ili je već iskorišten.

### E-03 — Zaboravljena lozinka
- unos e-adrese;
- neutralna potvrda zahtjeva;
- siguran povratak na prijavu.

### E-04 — Odabir tvrtke
Prikazuje se samo korisnicima koji imaju pristup više od jedne tvrtke. Svaki izbor mora promijeniti aktivni kontekst i ponovno provjeriti ovlasti. Podaci prethodne tvrtke ne smiju ostati dostupni u prikazu nakon promjene konteksta.

## 4. Pregled i pretraživanje

### E-10 — Nadzorna ploča vlasnika
Kartice i pregledi:
- aktivni projekti, dovršeni projekti i poslovi kojima istječe rok;
- projekti po trenutačnoj fazi;
- materijal na zalihi, rezerviran i ispod minimalne količine;
- radni nalozi koji čekaju radnju ili su blokirani;
- planirani i stvarni sati;
- planirani i stvarni troškovi te rezultat projekta;
- terenske montaže za danas;
- zaduženi alati i upozorenja;
- nedavne važne promjene.

Svaka kartica vodi na filtrirani popis ili konkretan zapis. Financijske kartice prikazuju se samo korisnicima s odgovarajućom ovlasti.

### E-11 — Pregled radnika
Prikazuje samo dodijeljene poslove:
- poslovi za danas i nadolazeći rokovi;
- prioritet, lokacija, trenutačna faza;
- upute, nacrti, dimenzije i fotografije;
- radnja za početak, pauzu ili završetak posla ako je odobrena;
- unos utroška, napomene i fotografija.

Ne prikazuje nabavne cijene, prodajne cijene, maržu ni izvještaje tvrtke bez izričite ovlasti.

### E-12 — Globalno pretraživanje
Pretražuje zapise dostupne trenutačnom korisniku:
- broj projekta ili radnog naloga;
- kupac;
- oznaka ploče, komada ili ostatka;
- artikl i skladišna lokacija;
- alat/oprema;
- dokument.

Rezultati prikazuju vrstu zapisa, naziv/oznaku, status i relevantnu lokaciju. Pretraživanje ne smije otkriti ni naziv zapisa kojem korisnik nema pristup.

## 5. Kupci i dobavljači

### E-20 — Popis kupaca
- pretraživanje i filtriranje;
- naziv, kontakt, mjesto i broj povezanih projekata;
- dodavanje i otvaranje kupca.

### E-21 — Dosje kupca
Kartice:
- osnovni podaci i kontakti;
- adrese i lokacije radova;
- povezani projekti i radni nalozi;
- ponude i dokumenti;
- napomene i povijest promjena.

Financijski detalji dostupni su samo ovlaštenim ulogama.

### E-22 — Novi/uredi kupca
- naziv ili ime;
- kontaktni podaci;
- adrese;
- OIB ako je potreban poslovnom procesu;
- napomena;
- provjera obveznih polja i upozorenje na mogući duplikat.

### E-23 — Dobavljači
- popis, pretraživanje i dosje dobavljača;
- kontakti i dokumenti;
- materijali koje dobavljač isporučuje;
- povijest zaprimanja i cijene samo za ovlaštene korisnike.

## 6. Projekti i radni nalozi

### E-30 — Popis projekata
Filtri:
- aktivni, dovršeni, blokirani i zakašnjeli;
- rok, odgovorna osoba, faza;
- kupac i vrsta radova.

Red/kartica prikazuje oznaku projekta, kupca, rok, status, sljedeću radnju i odgovornu osobu. Cijena i marža nisu vidljive neovlaštenim korisnicima.

### E-31 — Novi projekt / radni nalog
Koraci obrasca:
1. Kupac i kontakt.
2. Lokacija i opis radova.
3. Rok i prioritet.
4. Stavke, dimenzije i količine.
5. Nacrti, fotografije i privici.
6. Planirani materijal.
7. Proizvodne faze i odgovorna osoba.
8. Terenska montaža ako je potrebna.
9. Pregled i spremanje.

Sustav dodjeljuje jedinstvenu oznaku, primjerice `PR-2026-0001`. Pravila generiranja oznake moraju spriječiti duplikate.

### E-32 — Dosje projekta
Zaglavlje:
- oznaka, kupac, rok, status i voditelj;
- upozorenja i sljedeća potrebna radnja.

Kartice:
- sažetak i upute;
- stavke/komadi i dimenzije;
- materijal i povijest potrošnje;
- proizvodne faze;
- radnici i sati;
- terenski rad i montaža;
- dokumenti i fotografije;
- troškovi i rezultat — ovlaštenim korisnicima;
- povijest promjena.

### E-33 — Uređivanje stavki projekta
Za svaku stavku:
- naziv i opis;
- dimenzije i jedinica;
- količina;
- nacrt ili fotografija;
- napomena i posebna obrada;
- prioritet i rok.

Promjene nakon početka proizvodnje moraju ostaviti trag i po potrebi zahtijevati potvrdu voditelja.

### E-34 — Ponuda i ispis
- stavke i količine;
- cijene samo za ovlaštene korisnike;
- bilješke i uvjeti;
- pregled prije izvoza;
- izvoz dokumenta s logotipom tvrtke.

Pravila PDV-a i formalni status ponude moraju se dogovoriti prije implementacije; ovaj ekran sam po sebi ne znači da sustav izdaje fiskalizirane račune.

### E-35 — Zatvaranje projekta
Kontrolni popis prije zatvaranja:
- završna kontrola obavljena;
- sve stavke imaju konačni status;
- materijal je potrošen, vraćen ili otpisan uz razlog;
- alati i oprema su vraćeni ili je evidentirana iznimka;
- montaža/isporuka je evidentirana;
- fotografije i dokumenti su priloženi ako su obvezni;
- stvarni sati i troškovi su uneseni prema pravilima;
- neriješene blokade su razriješene ili dokumentirane.

## 7. Skladište

### E-40 — Skladišni pregled
- količine i raspoloživost;
- rezervirano nasuprot slobodnom;
- lokacija;
- upozorenja na minimum;
- zadnji skladišni događaji;
- brze radnje za zaprimanje, premještaj, izdavanje i inventuru.

### E-41 — Popis materijala
Filtri po vrsti, boji/uzorku, debljini, lokaciji, statusu i dobavljaču. Prikaz količine mora uključivati odgovarajuću jedinicu mjere. Vrijednost zalihe i nabavna cijena vidljive su samo ovlaštenima.

### E-42 — Dosje materijala / ploče
- jedinstvena oznaka i QR/barcode;
- fotografija i svojstva;
- dimenzije i preostala količina;
- dobavljač i datum zaprimanja;
- skladišna lokacija;
- rezervacije i povezan projekt;
- povijest svih događaja;
- potomci: nastali komadi, ostatci i otpad.

### E-43 — Zaprimanje materijala
- dobavljač i datum;
- tip materijala;
- količina, dimenzije i jedinica;
- lokacija;
- fotografija/dokument;
- nabavna cijena ako je korisnik ovlašten;
- potvrda i generiranje oznake.

### E-44 — Premještaj materijala
- skeniranje/odabir materijala;
- izvorna i odredišna lokacija;
- količina;
- razlog;
- potvrda premještaja i zapis u povijesti.

### E-45 — Izdavanje i povrat
- povezani projekt/nalog;
- materijal i količina;
- osoba koja izdaje i osoba kojoj se izdaje;
- datum/vrijeme;
- vraćena količina i stanje;
- razlika ili oštećenje s objašnjenjem.

### E-46 — Inventura i korekcija
- usporedba evidentirane i prebrojene količine;
- iznos razlike;
- obvezan razlog;
- predlagatelj i, kada pravila to zahtijevaju, odobravatelj;
- korektivni događaj bez brisanja prethodne evidencije.

## 8. Praćenje kamena, komada i ostataka

### E-50 — Radni ekran rezanja
- odabir izvorne ploče i radnog naloga;
- planirani rezovi i komadi;
- dimenzije i količine;
- stvarno nastali komadi;
- upotrebljivi ostatci;
- otpad/lom i razlog;
- potvrda rezultata.

Prije spremanja prikazuje se sažetak količina i dimenzija radi provjere. Točna pravila tolerancije i obračuna dimenzija moraju biti definirana.

### E-51 — Dosje pojedinačnog komada
- jedinstvena oznaka i QR/barcode;
- veza na izvornu ploču i projekt;
- dimenzije i svojstva;
- trenutačna lokacija i status;
- trenutačna proizvodna faza;
- povijest obrade i potrošnje;
- fotografije i napomene;
- isporuka ili montaža.

### E-52 — Evidencija ostatka
- izvorna ploča i projekt iz kojeg je ostatak nastao;
- dimenzije, količina i fotografija;
- lokacija;
- stanje i uporabljivost;
- rezervacija za novi projekt;
- kasnija potrošnja ili otpis.

Ostatak se ne smije prikazati kao slobodan ako je rezerviran ili već potrošen.

## 9. Proizvodnja

### E-60 — Proizvodni raspored
- poslovi po fazi, roku i odgovornoj osobi;
- oznake za čekanje, blokadu i kašnjenje;
- filtriranje po radniku, ekipi i vrsti obrade;
- prikaz komada koji su spremni za sljedeću fazu.

### E-61 — Radna stanica / faza
Prikazuje dodijeljene komade, upute, nacrte, dimenzije, fotografije i rok. Radnik može otvoriti komad i evidentirati početak, napredak, završetak, količinu, napomenu i fotografiju.

### E-62 — Detalj proizvodne faze
- status: Nije započeto / U tijeku / Gotovo;
- odgovorna osoba ili ekipa;
- planirano i stvarno vrijeme;
- obrađena i preostala količina;
- čekanje/blokada i razlog;
- napomene i fotografije;
- povijest promjena.

### E-63 — Postavke proizvodnih faza
Za ovlaštenog vlasnika:
- naziv i redoslijed faze;
- aktivna/neaktivna;
- pravila prelaska;
- obvezna polja ili kontrola;
- uloge koje mogu ažurirati fazu.

Promjena predloška ne smije tiho mijenjati povijest već započetih naloga.

## 10. Terenski rad i montaža

### E-70 — Popis terenskih poslova
- planirani datum i lokacija;
- povezani projekt;
- ekipa i odgovorna osoba;
- status i upozorenja;
- planirani materijal i oprema.

### E-71 — Terenski nalog
- lokacija/groblje i kontakt;
- opseg radova i posebne upute;
- članovi ekipe;
- vozilo i oprema;
- materijal i alat za izdavanje;
- planirani termin;
- fotografije i dokumenti.

### E-72 — Evidencija vremena na terenu
Radnje i zapisi:
- polazak iz tvrtke;
- dolazak na lokaciju;
- početak i završetak montaže;
- pauza ili čekanje s razlogom;
- dodatno putovanje;
- povratak u tvrtku.

Vrijeme se bilježi s korisnikom i vremenskom oznakom. Ispravci moraju biti evidentirani. Obračun radnih sati, pauza i putovanja slijedi pravila koja se dogovore prije razvoja.

### E-73 — Materijal i alat na terenu
- izdano;
- ugrađeno/potrošeno;
- vraćeno;
- oštećeno ili izgubljeno;
- alat i oprema vraćeni/ne vraćeni;
- razlog odstupanja i fotografije.

### E-74 — Završetak montaže
- završna provjera;
- fotografije prije i poslije;
- napomena o odstupanjima;
- potvrda izvršenog rada;
- sati ekipe;
- povrat materijala i alata;
- povezivanje s projektom i kontrolni popis za zatvaranje.

## 11. Alati i oprema

### E-80 — Popis alata
- naziv, inventarna oznaka i fotografija;
- stanje i lokacija;
- zadužena osoba;
- servis ili kvar;
- datum sljedećeg pregleda ako je potreban.

### E-81 — Zaduživanje i povrat
- alat/oprema;
- osoba i povezani posao;
- vrijeme izdavanja i očekivani povrat;
- vrijeme stvarnog povrata;
- stanje pri izdavanju i povratu;
- oštećenje ili kvar s opisom.

## 12. Radnici i raspored

### E-90 — Popis korisnika tvrtke
- ime i kontakt;
- aktivan/neaktivan;
- uloga i dodijeljene ovlasti;
- poslovi u tijeku;
- poziv novog korisnika.

### E-91 — Profil i ovlasti korisnika
- osnovni podaci;
- uloga;
- dodatne dopuštene radnje;
- pristup modulima;
- povijest promjena ovlasti.

### E-92 — Raspored rada
- projekti i faze po danu/tjednu;
- dodijeljeni radnici i ekipe;
- rokovi, preklapanja i nedostupnost;
- upozorenje na preopterećenje ili nedodijeljene poslove.

## 13. Troškovi i izvještaji

### E-100 — Troškovni pregled projekta
Dostupan samo ovlaštenim korisnicima:
- planirani i stvarni materijal;
- radni sati i konfigurirane stope;
- prijevoz i terenski troškovi;
- dodatni troškovi;
- ugovorena cijena;
- procijenjeni i stvarni rezultat;
- objašnjenje odstupanja.

### E-101 — Izvještaji
Odabir vrste, razdoblja, projekta, materijala, radnika ili lokacije. Primjeri:
- stanje i vrijednost zaliha;
- potrošnja po projektu;
- ostatci, otpad i otpisi;
- sati po radniku/fazi/projektu;
- zakašnjenja;
- terenski rad i prijevoz;
- troškovi po projektu.

### E-102 — Pregled i izvoz izvještaja
- pregled podataka prije izvoza;
- primijenjeni filtri i razdoblje;
- izvoz PDF/Excel kada se implementira;
- logotip i podaci tvrtke;
- provjera ovlasti prije generiranja i preuzimanja.

## 14. Dokumenti i obavijesti

### E-110 — Dokumenti
- dokumenti povezani s projektom, kupcem ili nalogom;
- vrsta dokumenta, datum i autor;
- pregled/preuzimanje prema ovlastima;
- privatna pohrana i kontrolirani pristup.

### E-111 — Obavijesti
- rokovi i zakašnjenja;
- blokirani poslovi;
- materijal ispod minimuma;
- čekanje odobrenja;
- zakašnjeli povrat alata;
- završena faza koja čeka preuzimanje.

Obavijest mora voditi do zapisa koji korisnik smije otvoriti. Upozorenja o potrošnji služe provjeri, ne automatskom pripisivanju krivnje.

## 15. Postavke tvrtke

### E-120 — Profil tvrtke
- naziv, adresa i kontakt;
- OIB ako je potreban;
- logo i dokumentacijski podaci;
- radno vrijeme i osnovne postavke.

### E-121 — Skladišne lokacije i kategorije
- popis lokacija;
- kategorije materijala;
- jedinice mjere;
- minimalne količine i pravila upozorenja.

### E-122 — Pravila rada i obračuna
Pristup samo ovlaštenima. Konfiguracija radnih sati, pauza, putovanja, troškovnih stopa i odobravanja korekcija. Ne koristiti financijske izračune u produkciji dok pravila nisu potvrđena i testirana.

## 16. Povijest promjena i administracija platforme

### E-130 — Revizijski trag tvrtke
- tko je što promijenio i kada;
- zapis i modul na koji se promjena odnosi;
- prethodna i nova vrijednost kada je relevantno;
- razlog korekcije;
- filtri i izvoz samo za ovlaštene korisnike.

### E-140 — Administracija platforme
Zaseban ekran vlasnika softvera za upravljanje statusom tvrtki, pristupom i tehničkim stanjem usluge. Pristup poslovnim podacima klijenata nije automatski omogućen. Svaki opravdani administrativni pristup mora biti ograničen i evidentiran.

## 17. Prazna, učitavajuća i pogrešna stanja

Svaki ekran s podacima mora definirati:
- **Učitavanje:** jasno da se podaci dohvaćaju, bez lažnih rezultata.
- **Prazno stanje:** objašnjenje što nedostaje i radnja koju korisnik smije napraviti.
- **Pogreška:** razumljiva poruka, bez otkrivanja tajni ili internih detalja.
- **Nema ovlasti:** pristojna poruka bez prikaza zaštićenih podataka.
- **Nema mreže:** očuvanje nepredanog unosa kad je to sigurno; stvarni offline način nije uključen dok se posebno ne specificira.
- **Nema rezultata pretrage:** prikaz aktivnih filtara i mogućnost promjene upita.

## 18. Ključni korisnički tokovi

### Tok A — Zaprimanje kamene ploče
Skladište → Zaprimanje → unos svojstava i količine → lokacija → potvrda → jedinstvena oznaka → dosje ploče.

### Tok B — Obrada ploče u komade
Projekt → odabir radnog naloga → izvorna ploča → unos planiranih i stvarnih komada → evidentiranje ostataka i otpada → potvrda → pojedinačni komadi povezani s izvornom pločom.

### Tok C — Proizvodnja
Proizvodni raspored → dodijeljeni komad → početak faze → evidencija rada → završetak ili blokada → sljedeća faza → završna kontrola.

### Tok D — Montaža grobnice
Projekt → terenski nalog → ekipa, vozilo, materijal i alat → polazak → dolazak → montaža i vrijeme → ugrađeni/vraćeni materijal → fotografije → povratak → potvrda završetka.

### Tok E — Inventurna razlika
Skladište → inventura → evidentirana i stvarna količina → razlog → odobrenje ako je potrebno → korektivni događaj → audit trag.

### Tok F — Pregled troškova
Projekt → provjera ovlasti → planirani/stvarni materijal, sati i ostali troškovi → pregled odstupanja → izvještaj. Neovlašteni korisnik ne smije dobiti financijske podatke ni kroz izvoz ili pretraživanje.

## 19. Kriteriji provjere plana ekrana

Prije početka implementacije provjeriti da:
1. Svaki modul iz specifikacije ima predviđen ekran ili je jasno označen izvan prve verzije.
2. Svaka važna radnja ima potvrdu, validaciju i zapis povijesti gdje je potrebno.
3. Vlasnik vidi sve podatke svoje tvrtke, a ne tuđe tvrtke.
4. Radnik može obaviti dodijeljeni posao bez pristupa nepotrebnim financijskim podacima.
5. Ploča, komadi, ostatci i otpad ostaju povezani.
6. Statusi naloga i pojedinačnih komada mogu se razlikovati.
7. Terenski rad i evidencija vremena povezani su s projektom.
8. Mobilni prikaz podržava rad u skladištu i na terenu.
9. Prazna stanja, greške i nedostatak ovlasti imaju jasan prikaz.
10. Nijedan ekran u ovoj fazi ne zahtijeva Supabase ili stvarne poslovne podatke.
