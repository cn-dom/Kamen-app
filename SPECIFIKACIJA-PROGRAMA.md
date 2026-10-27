# Kamen-app — specifikacija programa
**Verzija:** 1.1  
**Status:** Početna funkcionalna specifikacija — prije razvoja  
**Repozitorij:** https://github.com/cn-dom/Kamen-app

## 1. Svrha i temeljna pravila

Kamen-app je planirani program za kamenoklesarske tvrtke. Objedinjuje skladište, kameni materijal, radne naloge, proizvodne faze, radnike, montažu na terenu, alate, kupce, troškove i izvještaje.

Temeljna pravila:
- Vlasnik programa zadržava prava na vlastiti izvorni kod, naziv i identitet u mjeri u kojoj su ta prava osigurana; komponente trećih strana koriste se prema njihovim licencama.
- Svaka tvrtka ima odvojen račun, profil, korisnike i poslovne podatke.
- Vlasnik tvrtke ima potpun pregled podataka svoje tvrtke, uključujući sve cijene i troškove.
- Radnici vide samo podatke potrebne za dodijeljene poslove. Financijski podaci nisu dostupni radnicima prema zadanim postavkama.
- Valuta je euro (EUR, €).
- Program je namijenjen radu na računalu i mobitelu. Planira se responzivna web-aplikacija, uz mogućnost PWA instalacije.
- Supabase se neće konfigurirati niti koristiti dok vlasnik projekta to izričito ne zatraži. U ovoj fazi radimo dokumentaciju i pripremu u GitHub repozitoriju.

## 2. Tvrtke i profili

Svaka tvrtka može imati:
- naziv, adresu, OIB i podatke za kontakt;
- vlastiti logotip, fotografije i osnovni vizualni identitet;
- korisnike i njihove uloge;
- vlastite kupce, dobavljače, materijale, skladišne lokacije, projekte i dokumente;
- prilagodljive proizvodne faze, kategorije, predloške i radne procese.

Podaci različitih tvrtki moraju biti strogo izolirani. Tvrtka A ne smije pristupiti podacima tvrtke B, uključujući izravne zahtjeve prema API-ju ili pokušaje pristupa datotekama.

## 3. Uloge i ovlasti

### Vlasnik tvrtke
Ima potpun pristup svim podacima svoje tvrtke:
- projektima, nalozima, rokovima i fazama;
- radnicima, zaduženjima i evidenciji radnih sati;
- svim zalihama, nabavnim cijenama, potrošnji, povratima i otpisima;
- prodajnim cijenama, ponudama, troškovima, marži i izvještajima;
- terenskim radovima, prijevozu, opremi, fotografijama i povijesti promjena;
- postavkama tvrtke, korisnicima i ovlastima.

### Voditelj proizvodnje
Može upravljati dodijeljenim projektima, rasporedom, fazama i radnicima prema ovlastima koje dodijeli vlasnik. Financijske ovlasti ne dodjeljuju se automatski.

### Skladištar
Može evidentirati zaprimanje, lokacije, izdavanje, povrat, prijenos i inventuru prema dodijeljenim ovlastima. Nabavne cijene i financijski izvještaji nisu dostupni prema zadanim postavkama.

### Radnik u proizvodnji
Vidi svoje dodijeljene naloge, nacrte, dimenzije, fotografije, upute, potrebne količine, fazu rada i rok. Može ažurirati status i unositi podatke o izvršenom radu, utrošku, napomenama i fotografijama.

### Terenski radnik
Vidi dodijeljene terenske poslove, lokaciju, upute, potrebni materijal i alat. Može evidentirati vrijeme, izvršene radove, potrošnju, povrat, oštećenja i fotografije.

### Administracija
Može obrađivati kupce, ponude i dokumente samo u opsegu koji joj vlasnik odobri.

### Vlasnik softvera / administrator platforme
Upravlja samim proizvodom, pristupom tvrtki i tehničkim postavkama. Administrativni pristup poslovnim podacima treba biti ograničen, opravdan i evidentiran. Vlasništvo nad softverom ne znači neograničen automatski pristup svim poslovnim detaljima klijenata.

**Sigurnosni zahtjev:** cijene i povjerljivi podaci ne smiju se samo sakriti u sučelju. Moraju biti zaštićeni i na razini baze podataka i API-ja.

## 4. Upravljačka ploča vlasnika

Vlasnik mora imati pregled:
- aktivnih, dovršenih i zakašnjelih projekata;
- trenutačne faze svakog projekta i svakog komada;
- odgovorne osobe, rasporeda i zadnjih promjena;
- stanja materijala, rezervacija, potrošnje, povrata, ostataka i otpisa;
- razlika između planirane i stvarne potrošnje;
- zaduženih alata i opreme;
- radnih sati, terenskih sati i dodatnih putovanja;
- planiranih i stvarnih troškova, ugovorene cijene i marže;
- upozorenja koja traže provjeru, uz poveznicu na izvorni zapis.

Upozorenje o manjku ili neuobičajenoj potrošnji predstavlja signal za provjeru, a ne automatski dokaz krađe ili odgovornosti određene osobe.

## 5. Skladište i materijali

Za svaku stavku treba podržati odgovarajuće podatke:
- jedinstveni ID i QR/barcode oznaku;
- vrstu materijala, naziv, boju/uzorak i debljinu;
- dimenzije i mjernu jedinicu;
- količinu i jedinicu obračuna;
- dobavljača, datum zaprimanja i nabavnu cijenu;
- lokaciju u skladištu;
- fotografije i dokumente;
- status: raspoloživo, rezervirano, izdano, u obradi, potrošeno, vraćeno, otpisano ili drugo konfigurirano stanje.

Obavezne vrste skladišnih događaja:
- zaprimanje;
- premještaj između lokacija;
- rezervacija za projekt;
- izdavanje na projekt ili radniku;
- povrat;
- inventurna korekcija s razlogom;
- otpis, lom ili otpad;
- pretvorba ploče u izrezane komade i ostatke.

Svaki događaj bilježi tko ga je izvršio, kada, količinu, povezani projekt i razlog kada je potreban.

## 6. Praćenje kamene ploče, komada i ostataka

Program mora pratiti materijal kroz cijeli životni ciklus:
1. Zaprimanje i identifikacija ploče.
2. Smještaj na skladišnu lokaciju.
3. Rezervacija i izdavanje za radni nalog.
4. Rezanje i nastanak pojedinačnih komada.
5. Evidencija ostataka koji su i dalje upotrebljivi.
6. Evidencija otpada, loma i razloga.
7. Obrada, završna kontrola, pakiranje i isporuka ili montaža.

Izvorna ploča, svi nastali komadi, upotrebljivi ostatci i otpad moraju biti međusobno povezani. Količine i dimenzije treba provjeravati prema odgovarajućoj jedinici mjere; ne smije se pretpostaviti da se svi materijali obračunavaju samo u komadima ili samo u kvadratnim metrima.

Primjer: iz jedne ploče nastane pet klupica i jedan upotrebljiv ostatak. Program evidentira svaki komad, dimenzije, utrošak, lokaciju ostatka i otpad, povezano s izvornom pločom i nalogom.

## 7. Kupci, projekti i radni nalozi

Svaki projekt dobiva jedinstvenu oznaku, primjerice `PR-2026-0001`, i vlastiti digitalni dosje koji uključuje:
- kupca i kontakt;
- lokaciju, opis radova i rok;
- ponudu, dogovorenu cijenu i dokumente;
- nacrte, dimenzije, količine, fotografije i posebne upute;
- planirani materijal i rezervacije;
- stvarna izdavanja, potrošnju, povrate, ostatke i otpis;
- pojedinačne komade i njihove faze;
- odgovorne radnike i radne sate;
- terenski rad, prijevoz i montažu;
- planirane i stvarne troškove;
- završnu kontrolu, isporuku i potvrdu dovršetka.

Dovršetak proizvodne faze sam po sebi ne zatvara projekt. Zatvaranje mora uključiti potrebnu završnu kontrolu i evidentiranje isporuke/montaže te završnog stanja materijala.

## 8. Proizvodne faze i praćenje pojedinačnih komada

Svaka tvrtka može konfigurirati svoje faze, primjerice:
1. Pilanje.
2. Kanterica / obrada rubova.
3. Poliranje klupica.
4. Tučana obrada.
5. Druga posebna obrada.
6. Završna kontrola.
7. Pakiranje i spremanje za isporuku.

Svaka faza podržava:
- status: **Nije započeto / U tijeku / Gotovo**;
- odgovornog radnika ili ekipu;
- planirani i stvarni početak i završetak;
- količinu koja je obrađena ili preostala;
- napomene i fotografije;
- razlog čekanja ili blokade;
- povijest promjena i trajanje faze.

Praćenje mora postojati na razini cijelog naloga i, kada je potrebno, pojedinačnog komada. Time se omogućuje da neke klupice budu na poliranju dok druge iz istog naloga još čekaju obradu rubova. Ukupni status naloga izvodi se iz stanja njegovih stavki, uz mogućnost evidentiranja iznimki i blokada.

## 9. Montaža grobnica i terenski rad

Terenski nalog povezan je s izvornim projektom i uključuje:
- kupca, groblje/lokaciju i opseg radova;
- članove ekipe, odgovornu osobu, vozilo i opremu;
- planirani datum i termin;
- vrijeme polaska iz tvrtke;
- vrijeme dolaska na lokaciju;
- početak i završetak montaže;
- vrijeme povratka u tvrtku;
- pauze, čekanje, dodatne vožnje i objašnjenja prema potrebi;
- planirani, izdani, ugrađeni, vraćeni i oštećeni materijal;
- vraćeni alat i opremu;
- fotografije prije, tijekom i nakon rada;
- napomene, probleme i potvrdu završetka.

Program izračunava trajanje putovanja, trajanje montaže, ukupno trajanje terenskog posla i sate po radniku prema pravilima obračuna koja ćemo utvrditi prije implementacije. Pauze i čekanja trebaju biti zasebno evidentirani kako bi se moglo jasno razlikovati ukupno vrijeme od obračunatog radnog vremena.

## 10. Alati i oprema

- Evidencija alata, strojeva i opreme s jedinstvenim oznakama.
- Zaduživanje i povrat s osobom, vremenom i povezanim poslom.
- Lokacija i trenutačno stanje opreme.
- Evidencija kvara, oštećenja, servisa i potrošnog materijala.
- Upozorenje na zakašnjeli povrat ili nedostajuću opremu.

## 11. Troškovi i financijska kontrola

Valuta cijelog sustava je **euro (EUR, €)**.

Za svaki projekt treba omogućiti praćenje:
- nabavne vrijednosti materijala;
- utrošenog materijala i otpisa;
- rada prema evidentiranim satima i konfiguriranim troškovnim stopama;
- prijevoza, vozila i terenskih troškova;
- dodatnih troškova;
- ugovorene ili prodajne cijene;
- planiranih i stvarnih troškova;
- procijenjene i stvarne razlike/marže.

Financijski izračuni i način uključivanja PDV-a, rada, otpisa i drugih stavki moraju biti konfigurirani i dokumentirani prije korištenja za stvarne poslovne odluke. Program u prvoj fazi nije zamjena za certificirani računovodstveni ili fiskalizacijski sustav, osim ako se to naknadno zasebno ne specificira.

Financijski podaci dostupni su vlasniku tvrtke i drugim korisnicima kojima je vlasnik izričito dodijelio odgovarajuće ovlasti.

## 12. Izvještaji i dokumenti

Predviđeni izvještaji:
- trenutačne zalihe i vrijednost zaliha;
- ulaz/izlaz materijala po razdoblju;
- potrošnja i odstupanja po projektu;
- ostatci, otpad, lom i otpisi;
- radni sati po radniku, fazi i projektu;
- zakašnjeli poslovi i trajanje faza;
- terenski rad i prijevoz;
- troškovi i rezultat po projektu;
- popis alata i zaduženja.

Izvještaji se planiraju za izvoz u PDF i Excel te, gdje je primjereno, uključuju logotip i podatke tvrtke. Pristup izvještaju mora poštovati prava korisnika.

## 13. Evidencija promjena i revizijski trag

Važni poslovni događaji moraju ostaviti revizijski trag:
- korisnik i vrijeme događaja;
- vrsta radnje i povezani zapis;
- prethodna i nova vrijednost kada je relevantno;
- razlog korekcije, otpisa ili poništenja;
- povezani projekt i materijal.

Povijest se ne smije neprimjetno brisati ili prepisivati. Pogreške se ispravljaju novim korektivnim događajem ili evidentiranim poništenjem. Potrebno je ograničiti tko smije raditi korekcije i odobravati ih.

## 14. Sigurnost, sigurnosne kopije i privatnost

- Sigurna prijava i kontrola sesija.
- Ovlasti provjerene na poslužiteljskoj strani i na razini baze podataka.
- Izolacija podataka po tvrtki.
- Privatna pohrana fotografija i dokumenata s kontroliranim pristupom.
- Zaštita cijena i drugih financijskih podataka.
- Audit log za važne administrativne i poslovne radnje.
- Sigurnosne kopije i dokumentiran postupak oporavka.
- Testiranje oporavka, autorizacije i pokušaja pristupa tuđim podacima.
- Minimalno potrebne ovlasti za svaki tip korisnika.

## 15. Tehnička orijentacija

Predviđena je responzivna web-aplikacija, potencijalno instalabilna kao PWA. PostgreSQL je predložena baza podataka. Tehnologije za autentikaciju, pohranu datoteka i hosting odabrat ćemo prije implementacije.

**Važno za trenutnu fazu:** ne povezivati Supabase, ne stvarati Supabase tablice, politike, ključeve ni migracije dok vlasnik projekta izričito ne odobri taj korak. Trenutačni zadatak je dokumentacija i priprema u repozitoriju GitHub.

## 16. Faze razvoja

### Faza 1 — Temelj
- potvrda specifikacije i arhitekture;
- struktura repozitorija, upute i dokumentacija;
- plan korisničkih uloga i izolacije podataka;
- plan modela podataka i testnih scenarija.

### Faza 2 — Skladište
- artikli, ploče, QR oznake, lokacije;
- zaprimanje, rezervacije, izdavanje i povrat;
- ostatci, otpad, inventura i revizijski trag.

### Faza 3 — Projekti i proizvodnja
- kupci, radni nalozi, komadi i faze;
- radnici, rokovi, fotografije i potrošnja;
- planirani nasuprot stvarnom materijalu.

### Faza 4 — Terenski rad
- montaža, vremenska evidencija, ekipa, vozilo;
- ugrađeni materijal, povrat i troškovi.

### Faza 5 — Troškovi i izvještaji
- obračun rada i troškova;
- izvještaji, PDF/Excel i nadzorna ploča.

### Faza 6 — Više tvrtki i komercijalizacija
- aktivacija tvrtki, paketi i pretplate;
- uvjeti licenciranja, podrška i operativno održavanje.

Svaka faza mora biti testirana prije nego što se smatra završenom. Ovaj redoslijed je plan, a ne tvrdnja da su funkcije već implementirane.

## 17. Kriteriji prihvaćanja

Program se neće smatrati spremnim dok testovi ne potvrde da:
1. Tvrtka A ne može dohvatiti podatke tvrtke B.
2. Radnik ne može pristupiti cijenama ili financijskim podacima bez odobrenih ovlasti.
3. Svaki skladišni događaj pravilno mijenja stanje i ostavlja povijesni trag.
4. Izvorna ploča ostaje povezana s nastalim komadima, ostatcima i otpadom.
5. Komadi istog naloga mogu biti u različitim proizvodnim fazama.
6. Terenski sati, materijal i troškovi povezani su s odgovarajućim projektom.
7. Korekcije ne brišu neprimjetno stare podatke.
8. Izvještaji odgovaraju izvornim evidencijama.
9. Sigurnosna kopija može se vratiti u testnom okruženju.
10. Sučelje je uporabljivo na mobitelu i računalu.

## 18. Otvorena pitanja prije implementacije

Prije izrade baze i koda treba odlučiti:
- obračun dimenzija i jedinice za svaki tip materijala;
- način obračuna rada, pauza, čekanja i putovanja;
- odobravanje otpisa i inventurnih korekcija;
- pravila rezervacije materijala i raspodjele ostataka;
- obvezna polja za zatvaranje projekta;
- treba li i kada omogućiti rad bez interneta;
- treba li program obrađivati račune, PDV i fiskalizaciju ili samo troškove i izvještaje;
- konačan tehnološki stack i troškovni okvir.

## 19. Pravilo promjene specifikacije

Nove odluke dodaju se u ovu specifikaciju ili povezane dokumente s jasnim brojem verzije i datumom. Prije promjene postojećih pravila provjerava se utjecaj na podatke, ovlasti, obračune i ranije module. Ne uvoditi Supabase niti mijenjati produkcijske postavke bez izričitog odobrenja vlasnika projekta.
