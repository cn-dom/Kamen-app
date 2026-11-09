# Kamen-app — testni scenariji

**Verzija:** 1.1  
**Status:** Kriteriji prihvaćanja i plan testiranja. CI Build #261 prošao je s 129 testova (129 uspješnih, 0 neuspješnih) i uspješnim Vite buildom na commitu `3e390004de4c31a1e50f68170106b0aed7d318e9` u PR-u #85. Automatizacija ne zamjenjuje ručno testiranje sučelja na telefonu i računalu. Za poznate rizike pogledati [reviziju](AUDIT-POSTOJECEG-STANJA.md).

Svi scenariji su kriteriji koje će aplikacija morati zadovoljiti. Njihovo navođenje ne znači da je funkcionalnost već izrađena ili provjerena.

## A. Izolacija tvrtki i pristup

### TEN-001 — odvajanje dviju tvrtki
**Koraci:** Stvoriti testnu tvrtku A i testnu tvrtku B s različitim projektima, kupcima i zalihom. Prijaviti se kao korisnik tvrtke A i pokušati otvoriti zapis tvrtke B izravnim URL-om i API zahtjevom.  
**Očekivano:** Nema pristupa podacima B. Ne otkrivaju se ni detalji zapisa kroz poruku pogreške.

### TEN-002 — pretraživanje i izvoz
**Koraci:** Pretražiti po nazivu kupca ili oznaci projekta koji postoji samo u tvrtki B; pokušati izvesti popis.  
**Očekivano:** Rezultati i izvoz sadrže isključivo podatke za koje korisnik ima ovlast.

### TEN-003 — uklanjanje člana
**Koraci:** Ukloniti testnog člana iz tvrtke i pokušati ponovno koristiti njegovu prethodnu sesiju.  
**Očekivano:** Pristup je ukinut; povijesni zapisi člana ostaju sačuvani.

## B. Uloge i financijska privatnost

### ACL-001 — radnik ne vidi cijene
**Koraci:** Prijaviti se kao radnik i otvoriti projekt, skladište, izvještaj, izvoz i API odgovore.  
**Očekivano:** Nema nabavnih/prodajnih cijena, marži ni financijskih izvještaja bez izričitog dopuštenja.

### ACL-002 — izravni zahtjev bez ovlasti
**Koraci:** Pozvati radnju za odobravanje otpisa kao radnik ili skladištar bez ovlasti.  
**Očekivano:** Poslužitelj odbija zahtjev, čak i ako se zahtjev pošalje izvan sučelja.

### ACL-003 — trag promjene uloge
**Koraci:** Promijeniti ulogu člana i pokušati nastaviti koristiti ranije dopuštene radnje.  
**Očekivano:** Nova ovlaštenja primjenjuju se bez oslanjanja samo na zastarjelo stanje sučelja; promjena je zabilježena.

## C. Skladište i sljedivost

### INV-001 — primitak ploče
**Koraci:** Unijeti novu ploču s oznakom, dobavljačem, dimenzijama, cijenom, datumom i lokacijom.  
**Očekivano:** Ploča dobiva jedinstvenu oznaku i povećava stanje na odgovarajućoj lokaciji.

### INV-002 — premještaj
**Koraci:** Premjestiti ploču iz jedne lokacije u drugu.  
**Očekivano:** Količina se umanjuje na izvornoj i povećava na odredišnoj lokaciji; postoji događaj premještaja.

### INV-003 — ploča u komade i ostatke
**Koraci:** Evidentirati obradu ploče u više komada, upotrebljiv ostatak i otpad.  
**Očekivano:** Svaki izlazni komad/ostatak povezan je s izvornom pločom; dimenzije i količine evidentirane su, a nerazjašnjene razlike označene.

### INV-004 — izdavanje i povrat
**Koraci:** Izdati materijal radnom nalogu, zatim vratiti neiskorišteni dio.  
**Očekivano:** Izdano, potrošeno i vraćeno stanje razlikuju se; povrat ne briše prethodni događaj.

### INV-005 — otpis i inventurna razlika
**Koraci:** Pokušati otpis bez potrebne ovlasti, zatim provesti odobreni otpis s razlogom.  
**Očekivano:** Neodobreni pokušaj se odbija; odobreni događaj ima odgovornu osobu, vrijeme, razlog i revizijski trag.

## D. Projekti i proizvodnja

### PRJ-001 — stvaranje radnog naloga
**Koraci:** Izraditi projekt za kupca, unijeti rok, lokaciju, stavke, dimenzije, nacrte i fotografije.  
**Očekivano:** Projekt dobiva jedinstvenu oznaku, a dokumenti su dostupni samo ovlaštenim članovima iste tvrtke.

### PRD-001 — različite faze pojedinih komada
**Koraci:** U istom nalogu postaviti prvi komad na poliranje, drugi na rezanje, a treći na kontrolu kvalitete.  
**Očekivano:** Statusi se prate zasebno po komadu i ne prepisuju jedni druge.

### PRD-002 — evidentiranje rada
**Koraci:** Radnik evidentira početak, pauzu, nastavak i završetak zadatka.  
**Očekivano:** Trajanje se računa prema potvrđenim pravilima, a naknadna korekcija ostavlja povijest.

### PRD-003 — zastoj i kašnjenje
**Koraci:** Označiti fazu blokiranom i unijeti razlog.  
**Očekivano:** Blokada i trajanje vidljivi su ovlaštenim osobama; rok se ne mijenja neprimjetno.

## E. Montaža i terenski rad

### FLD-001 — cjelovita evidencija terena
**Koraci:** Za projekt evidentirati polazak, dolazak, početak i završetak montaže, čekanje, povratak i eventualni dodatni odlazak.  
**Očekivano:** Događaji su vremenski povezani s terenskim nalogom i projektom.

### FLD-002 — materijal i alat na terenu
**Koraci:** Izdati materijal i alat, evidentirati ugrađeno, vraćeno, oštećeno i izgubljeno.  
**Očekivano:** Stanje skladišta i odgovornost za alat ažuriraju se kroz evidentirane događaje; razlike nisu tiho uklonjene.

### FLD-003 — fotografije prije i poslije
**Koraci:** Dodati fotografije prije i nakon montaže. Pokušati ih otvoriti iz druge tvrtke.  
**Očekivano:** Fotografije su povezane s pravim projektom i nisu javno dostupne niti dostupne drugoj tvrtki.

### FLD-004 — završetak terenskog naloga ne mijenja automatski zalihu
**Koraci:** Povezati terenski nalog s radnim nalogom koji ima više gotovih proizvoda. Označiti terenski nalog kao završen bez evidentiranja stvarno ugrađenih količina.
**Očekivano:** Status terenskog naloga se mijenja, ali se količine gotovih proizvoda ne mijenjaju. Ugradnja se evidentira zasebno po proizvodu i količini.

### INV-006 — djelomična prodaja gotovog proizvoda
**Koraci:** Na zalihu unijeti 10 komada. Evidentirati prodaju 3 komada, zatim još 2 komada.
**Očekivano:** Nakon prve radnje ostaje 7, nakon druge 5 komada. Svaka radnja stvara zaseban zapis kretanja; status proizvoda ostaje otvoren dok ima zalihe.

### INV-007 — djelomična ugradnja i zaštita od prekomjerne količine
**Koraci:** Na zalihu unijeti 4 komada. Evidentirati ugradnju 1 komada, zatim pokušati ugraditi 4 komada.
**Očekivano:** Nakon prve radnje ostaju 3 komada. Druga radnja se odbija jer tražena količina prelazi raspoloživu zalihu. Kada se ugradi posljednji komad, status postaje Ugrađen.

### INV-008 — zatvorena stavka ne vraća se promjenom statusa
**Koraci:** Potrošiti cijelu količinu proizvoda prodajom ili ugradnjom, zatim pokušati promijeniti status natrag na Na zalihi.
**Očekivano:** Zatvorena stavka ne vraća automatski početnu količinu. Povrat ili korekcija mora biti zasebna kontrolirana skladišna operacija.


### INV-009 — povrat zatvorenog gotovog proizvoda
**Koraci:** Prodati cijelu količinu proizvoda, zatim evidentirati povrat dijela količine uz obvezan razlog.
**Očekivano:** Vraćena količina ponovno je na zalihi, stavka se otvara kao Na zalihi, a povrat ostaje zaseban događaj s razlogom i vremenom.

### INV-011 — inventura i usklađenje zalihe
**Koraci:** Otvoriti inventuru s više skladišnih stavki, unijeti fizički prebrojene količine, ostaviti jednu stavku bez brojanja i pokušati potvrditi. Zatim unijeti sve količine, ostaviti razlog praznim za stavku s razlikom i pokušati potvrditi. Na kraju unijeti razloge i potvrditi inventuru.
**Očekivano:** Nepotpuna inventura i razlika bez razloga ne mogu se potvrditi. Prije potvrde stanje zalihe ostaje nepromijenjeno. Nakon potvrde svaka stavka usklađuje se na prebrojenu količinu, a svaka razlika dobiva zasebno kretanje s predznakom i razlogom. Provedena inventura zaključana je i ne može se ponovno primijeniti.

### INV-012 — zaštita od zastarjele inventure
**Koraci:** Otvoriti inventuru, zatim promijeniti količinu jedne obuhvaćene stavke kroz zaprimanje, izdavanje ili drugu skladišnu radnju. Pokušati potvrditi staru inventuru.
**Očekivano:** Potvrda se blokira za cijelu inventuru; sustav ne prepisuje novije skladišno stanje starim snimkom. Korisnik otvara novu inventuru i ponovno prebrojava.

### INV-013 — inventura gotovih proizvoda
**Koraci:** U skladištu evidentirati više gotovih proizvoda s različitim jedinicama (kom, par, m²), zatim otvoriti novu inventuru. Prebrojati količine, unijeti razliku za barem jedan proizvod i obvezan razlog. Provesti inventuru pa otvoriti Gotovi proizvodi.
**Očekivano:** Inventura uključuje sve gotove proizvode i koristi raspoloživu količinu (ne početnu proizvedenu količinu). Za kom/par/set prihvaćaju se samo cijeli brojevi. Nakon potvrde raspoloživa količina usklađena je s fizičkim brojem, zatvoreni proizvod s pozitivnim stanjem ponovno dobiva status Na zalihi, a korekcija se bilježi u povijesti proizvoda i skladišnim kretanjima.

### INV-014 — ispis inventurnog zapisnika
**Koraci:** Otvoriti inventuru s unesenim količinama i razlikama, odabrati Ispiši zapisnik te pregledati ispis ili spremiti u PDF.
**Očekivano:** Ispis prikazuje identifikaciju inventure, datum, status, sažetak, sve stavke, knjižne i fizičke količine, razlike i razloge. Navigacija, bočni izbornik i akcijske tipke ne pojavljuju se u ispisu.

### INV-010 — korekcija zalihe s razlogom
**Koraci:** Povećati pa umanjiti zalihu gotovog proizvoda korekcijom. Pokušati potvrditi korekciju bez razloga i umanjiti zalihu ispod nule.
**Očekivano:** Korekcija bez razloga i umanjenje veće od raspoložive količine odbijaju se. Potvrđena korekcija mijenja samo unesenu količinu i bilježi predznak, razlog, proizvod i vrijeme.

## F. Troškovi i izvještaji

### FIN-001 — planirano nasuprot stvarnom
**Koraci:** Unijeti planirani materijal i sate, zatim evidentirati stvarne količine i rad.  
**Očekivano:** Izvještaj prikazuje razliku planirano/stvarno i koristi potvrđena pravila obračuna.

### FIN-002 — ograničeni financijski prikaz
**Koraci:** Usporediti vlasnički i radnički prikaz istog projekta.  
**Očekivano:** Vlasnik vidi dopuštene troškove i maržu; radnik vidi samo informacije potrebne za posao.

### RPT-001 — izvoz s logom tvrtke
**Koraci:** Izraditi PDF/Excel izvještaj kao ovlašteni korisnik.  
**Očekivano:** Izvoz sadrži odabrani opseg, ispravne EUR iznose, logo tvrtke i ne uključuje podatke drugih tvrtki.

## G. Pouzdanost i uporabljivost

### SYS-001 — sigurnosna kopija i vraćanje
**Koraci:** U testnom okruženju napraviti kopiju podataka i vratiti je u izolirano okruženje.  
**Očekivano:** Podaci i veze ostaju dosljedni; rezultat i trajanje vraćanja dokumentirani su.

### SYS-002 — povijest promjena
**Koraci:** Izmijeniti kritičan zapis i pregledati revizijski trag.  
**Očekivano:** Zabilježeni su korisnik, vrijeme, radnja i relevantna prethodna/nova vrijednost ili poveznica na kontroliranu ispravku.

### UX-001 — mobitel i računalo
**Koraci:** Otvoriti glavne tokove na uskom mobilnom zaslonu i širokom zaslonu računala.  
**Očekivano:** Nema odsječenih osnovnih kontrola; skeniranje/unos i potvrde izvedivi su na dodir.

### SYS-003 — rad bez interneta (ako bude odobren)
**Koraci:** Prekinuti vezu tijekom unosa i potom vratiti vezu.  
**Očekivano:** Ako je izvanmrežni način dio opsega, korisnik vidi što je spremljeno lokalno, a sinkronizacija ne udvostručuje skladišne događaje.

## H. Cjelina 4 — poslovni tijek projekta

### BIZ-001 — jedinstveno povezivanje ponude i radnog naloga
**Koraci:** Prihvatiti poslanu ponudu i povezati je s radnim nalogom. Pokušati isti nalog povezati s drugom ponudom ili promijeniti već postojeću vezu.
**Očekivano:** Jedan radni nalog može biti povezan samo s jednom ponudom; već spremljena veza ostaje zaključana kroz uobičajeno sučelje.

### BIZ-002 — kontrolirani statusi ponude
**Koraci:** Pokušati promijeniti nacrt izravno u prihvaćenu ponudu ili odbiti već prihvaćenu ponudu.
**Očekivano:** Dopušten je slijed Nacrt → Poslana → Prihvaćena/Odbijena. Svaka promjena statusa bilježi prethodni status i vrijeme, a prihvaćanje sprema datum.

### BIZ-003 — djelomične i potpune isporuke
**Koraci:** Izdati otpremnicu za dio stavki, zatim za preostale količine. Pokušati isporučiti više od ugovorene količine.
**Očekivano:** Sustav prikazuje preostalu količinu po svakoj stavci, dopušta više djelomičnih otpremnica, ali odbija prekoračenje. Povezani gotovi proizvodi skidaju se samo jednom sa zalihe.

### BIZ-004 — račun i djelomične uplate
**Koraci:** Izdati račun iz prihvaćene ponude, pokušati izdati drugi račun za istu ponudu, zatim evidentirati više djelomičnih uplata.
**Očekivano:** Izdaje se samo jedan račun po ponudi; račun čuva snimku stavki i iznosa. Uplate se vežu uz račun, ažuriraju saldo i ne mogu prijeći preostali dug.

### BIZ-005 — zatvaranje projekta tek nakon svih obveza
**Koraci:** Pokušati zatvoriti projekt s nedovršenom proizvodnjom, nepotpunom isporukom, otvorenim terenskim nalogom, bez računa ili s neplaćenim saldom. Nakon dovršetka svih koraka zatvoriti projekt.
**Očekivano:** Svaki nedovršeni korak blokira zatvaranje i jasno je prikazan na kontrolnom popisu. Potpuno dovršen projekt sprema završni kontrolni popis, broj računa i iznos naplate; ponovno zatvaranje nije dopušteno.

## Kriterij završetka

Modul se ne smatra spremnim samo zato što se ekran otvara. Mora proći odgovarajuće funkcionalne, ovlastne i regresijske testove. Testovi izolacije tvrtki i zaštite financijskih podataka blokiraju objavu ako padnu.

Testovi sadrže izmišljene testne podatke. Ne koristiti stvarne podatke klijenata za razvojne ili demonstracijske testove.


## H. Profesionalizacija radnih naloga i arhiva

### WO-001 — jedinstven obrazac iz svih ulaza
**Koraci:** Na nadzornoj ploči odabrati „Novi radni nalog” i ponoviti iz brze radnje. Unijeti kupca, projekt i više komada s različitim dimenzijama i materijalima.
**Očekivano:** Oba ulaza otvaraju isti puni obrazac. Nalog se ne može spremiti bez stavki, mjera, količina i odabranog materijala; rezervacija se računa po grupi materijala.

### WO-002 — nema prečaca za zatvaranje naloga
**Koraci:** Na nadzornoj ploči pokušati otvoriti nalog kroz akciju u retku.
**Očekivano:** Akcija vodi na modul radnih naloga. Ne mijenja status u „Završen” niti zaobilazi proizvodnju i kontrolu.

### INV-015 — arhiviranje bez brisanja povijesti
**Koraci:** Pokušati arhivirati stavku s raspoloživom zalihom, zatim stavku povezanu s aktivnim nalogom. Nakon toga arhivirati stavku s nulom zalihe i bez aktivnih veza. Otvoriti arhivu i vratiti stavku.
**Očekivano:** Prva dva pokušaja su blokirana. Uspješno arhivirana stavka ostaje u lokalnim podacima, ne nudi se za nove naloge i pilanje, može se pronaći u arhivi i vratiti u aktivno skladište. Nijedan povijesni zapis ne briše se.


## I. Proizvodnja po fizičkom komadu

### PRD-004 — odvojena evidencija svakog komada
**Koraci:** Izraditi radni nalog sa stavkom količine 3 i drugom stavkom količine 2. Otvoriti Proizvodnju.
**Očekivano:** Prikazuje se pet fizičkih komada s odvojenim statusima. Promjena faze jednog komada ne mijenja ostale komade ni druge stavke naloga.

### PRD-005 — radnik po fazi
**Koraci:** Dodati dva radnika u popis. Dodijeliti prvog pilanju, drugog poliranju. Ponovno otvoriti modul i provjeriti zapise.
**Očekivano:** Dodjele ostaju spremljene po komadu i fazi; popis radnika nudi se kao pomoć pri unosu. Uklanjanje imena iz popisa ne briše stare dodjele.

### PRD-006 — mjerenje aktivnog rada
**Koraci:** Pokrenuti fazu, ostaviti je aktivnom, zatim je završiti.
**Očekivano:** Sustav bilježi početak i završetak te izračunava trajanje. Završena faza ne ostaje aktivna.

### PRD-007 — zastoj i nastavak
**Koraci:** Pokrenuti fazu, evidentirati zastoj s razlogom, zatim nastaviti i završiti fazu.
**Očekivano:** Razlog zastoja je obvezan; aktivni interval završava na zastoju, nastavak otvara novi interval, a ukupno vrijeme zbraja samo evidentirane intervale.

### PRD-008 — kontrola kvalitete
**Koraci:** Pokušati potvrditi kontrolu prije završetka obrade. Zatim završiti sve potrebne faze, označiti kontrolu kao prošlu, a na drugom komadu kao neispravnu uz opis.
**Očekivano:** Kontrola je blokirana dok faze nisu završene ili označene nepotrebnima. Rezultat i bilješka vode se zasebno po komadu.

### PRD-009 — očuvanje stare evidencije proizvodnje
**Koraci:** Otvoriti postojeće podatke s prethodnim statusima po nalogu nakon nadogradnje.
**Očekivano:** Stari statusi se prenose na pripadajuće komade, a izvorni zapis ostaje sačuvan u migracijskom objektu. Novi zapisi ne prepisuju povijesne podatke.

### PRD-010 — izvoz proizvodnje
**Koraci:** Filtrirati proizvodnju i izvesti CSV.
**Očekivano:** Izvoz sadrži radni nalog, kupca, projekt, komad, dimenzije, materijal, fazu, radnika, početak, završetak, trajanje, zastoj i kontrolu kvalitete.


## Status cjelina 1 — skladište i sljedivost

**Implementirano u PR-u #85; automatizirani CI prolaz: 129/129 testova i build uspješan.**

Automatizirani testovi uključuju:
- dnevnik kretanja bez rezanja povijesti, grupirane događaje jedne operacije i zaštitu od dvostrukog knjiženja;
- rollback svih povezanih zapisa ako jedan dio spremanja ne uspije;
- zaštitu od prepisivanja neispravnog postojećeg dnevnika;
- djelomičnu prodaju i ugradnju gotovih proizvoda, povrat, korekcije i odbijanje prevelikog izdavanja;
- otpis materijala s obveznim razlogom, kontrolu raspoložive količine i cijele komade ostataka;
- lanac porijekla ploča, ostataka i komada te zaštitu od kružnih/nedostajućih veza;
- postojeće testove rezervacije, potrošnje i isporuke.

**Obvezni ručni prihvatni prolaz prije spajanja u `main`:**
1. Zaprimiti ploču i provjeriti stanje i zapis primitka.
2. Izraditi radni nalog, rezervirati materijal i provjeriti raspoloživu zalihu.
3. Otkazati probni nalog i provjeriti povrat neiskorištene rezervacije.
4. Evidentirati pilanje: stvarnu potrošnju, gotove komade, ostatak i otpad; zatim provjeriti lanac porijekla.
5. Ponovno izrezati nastali ostatak i provjeriti da se izvorna ploča i roditeljski ostatak i dalje mogu pratiti.
6. Djelomično prodati/ugraditi gotov proizvod i provjeriti da preostala količina ostaje na zalihi.
7. Napraviti otpremnicu s djelomičnim izdavanjem i provjeriti da se ne može dvaput proknjižiti.
8. Provesti inventuru materijala i gotovih proizvoda, uključujući obvezno obrazloženje razlike.
9. Pokušati otpis bez razloga, zatim s razlogom i potvrdom; provjeriti zapis u dnevniku.
10. Ponoviti ključne korake na mobitelu i računalu. Sinkronizacija između uređaja nije podržana dok se ne uvede zajednička pohrana.

**Ograničenje:** potvrda otpisa trenutačno je lokalna potvrda u pregledniku, ne poslužiteljsko odobrenje vlasnika/managera.

### FIN-003 — razrada stvarnih troškova
**Koraci:** Za jedan radni nalog evidentirati rad, prijevoz, vanjsku obradu, montažu, najam stroja i potrošni materijal.  
**Očekivano:** Svaka kategorija prikazuje se odvojeno, a ukupni stvarni trošak ne zbraja istu stavku dvaput kada je označeno više kategorija.

### FIN-004 — automatski obračun rada
**Koraci:** Unijeti stvarne sate i cijenu sata bez ručnog ukupnog iznosa.  
**Očekivano:** Iznos stavke računa se kao sati × cijena sata i sprema s podacima o satima, cijeni sata i izvoru izračuna.

### FIN-005 — procjena marže iz prihvaćene ponude
**Koraci:** Povezati prihvaćenu ponudu s radnim nalogom, unijeti troškove i usporediti s odbijenom ponudom istog naloga.  
**Očekivano:** Koristi se samo prihvaćena ponuda; prikazuju se neto vrijednost, PDV, bruto vrijednost i procijenjena marža. Odbijene i nacrt ponude ne ulaze u izračun.

### FIN-006 — ostvarena marža na računima
**Koraci:** Izdati račun s neto i bruto iznosom, zatim evidentirati stvarne troškove.  
**Očekivano:** PDV se prikazuje kao razlika bruto i neto računa, a ostvarena marža računa se kao neto prihod umanjen za stvarne troškove. Bez izdanog računa marža se ne prikazuje kao ostvarena.


## Cjelina 5 — korisnici i ovlasti (lokalna priprema)

- [ ] Dodavanje člana s imenom, opcionalnom e-poštom i jednom od pet uloga.
- [ ] Promjena uloge, dodatnih ovlasti i aktivnog statusa.
- [ ] Uklanjanje člana bez brisanja povijesti promjena.
- [ ] Lokalni profil vlasnika ne može se ukloniti ili degradirati.
- [ ] Financijske ovlasti nisu zadane skladištaru ni radniku.
- [ ] Promjene se spremaju u lokalni popis i dnevnik.
- [ ] Sigurnosna kopija uključuje popis članova i dnevnik ovlasti.
- [ ] Sučelje jasno upozorava da lokalni profili nisu stvarni računi i ne štite podatke.
- [ ] U backend fazi testirati izolaciju dviju tvrtki, ukidanje sesije, odbijanje neovlaštenih API poziva i sinkronizaciju uređaja.


## Cjelina 6 — alati i oprema

- [ ] Dodavanje i uređivanje alata s inventarnom oznakom i serijskim brojem.
- [ ] Odbijanje duplikata inventarne oznake.
- [ ] Zaduživanje zahtijeva osobu/ekipu i datum povrata.
- [ ] Zaduženi alat ne može se ponovno zadužiti.
- [ ] Zaduženi alat ne može se otpisati prije povrata.
- [ ] Povrat sprema datum, osobu i stanje.
- [ ] Oštećen/neispravan povrat stavlja alat na popravak.
- [ ] Vraćeni alat ne ostaje označen kao zakašnjeli.
- [ ] CSV izvoz uključuje stanje registra.
- [ ] JSON sigurnosna kopija uključuje registar i povijest događaja.


## Cjelina 7 — radnici i raspored

- [ ] Raspored se otvara iz glavne navigacije.
- [ ] Radnik s evidentiranom odgovarajućom vještinom može dobiti termin.
- [ ] Radnik bez odgovarajuće evidentirane vještine ne može dobiti termin.
- [ ] Odsutan radnik ne može dobiti termin na datum odsutnosti.
- [ ] Radnik izvan smjene ne može dobiti termin na taj datum.
- [ ] Radnik raspoređen na teren ne može istog dana dobiti radionicu.
- [ ] Postojeća provjera sprječava preklapanje termina radnika i stroja.
- [ ] Višednevni termin mora biti razdvojen na dnevne aktivnosti.
- [ ] Otkazani termin ne blokira novi termin.
- [ ] Promjene statusa radnika osvježavaju se pri ponovnom ulasku u raspored.


## Cjelina 8 — terenski rad i montaža

- [ ] Obvezni kupac, projekt, lokacija i datum.
- [ ] Vrijeme završetka mora biti nakon početka.
- [ ] Najmanje jedan član ekipe.
- [ ] Odsutan član ili član izvan smjene ne može se dodijeliti.
- [ ] Radnik raspoređen u radionici ne može se istodobno dodijeliti terenu.
- [ ] Član ekipe ne može imati preklapajuće aktivne terenske naloge.
- [ ] Statusi napreduju samo dopuštenim redoslijedom.
- [ ] Svaki statusni prijelaz ostavlja događaj u povijesti.
- [ ] Završetak i povratak bilježe zasebne vremenske oznake.
- [ ] Terenski nalog ostaje povezan s radnim nalogom/projektom.


## Cjelina 9 — dokumenti i obavijesti

- [ ] Dodavanje dokumenta zahtijeva naziv i datoteku.
- [ ] Datoteka veća od 5 MB odbija se bez spremanja zapisa.
- [ ] Dokument čuva vrstu, datum, autora, povezani tip/zapis i napomenu.
- [ ] Pretraživanje i filtar vrste prikazuju samo odgovarajuće dokumente.
- [ ] Preuzimanje vraća izvornu datoteku; uklanjanje zahtijeva potvrdu.
- [ ] JSON sigurnosna kopija uključuje dokumente i njihove privitke.
- [ ] Obavijest se stvara za otvoreni zakašnjeli rok, a ne za završeni/otkazani nalog.
- [ ] Obavijest se stvara za rok u sljedeća tri dana.
- [ ] Upozoravaju se blokirani poslovi, niska zaliha i zakašnjeli alat.
- [ ] Upozorava se na zastoj proizvodne faze, održavanje i planirani teren za danas.
- [ ] Obavijest se može označiti pročitanom; stanje ostaje nakon ponovnog otvaranja.
- [ ] Odabir obavijesti vodi u odgovarajući modul.
- [ ] Sučelje jasno navodi da su dokumenti i obavijesti lokalni, bez push poruka i sinkronizacije.



## Cjelina 10 — postavke tvrtke

- [ ] Otvaranje Postavki prikazuje zaseban modul, a ne sigurnosnu kopiju.
- [ ] Profil tvrtke sprema i ponovno učitava naziv, adresu, mjesto, OIB, kontakt, IBAN i web-stranicu.
- [ ] Neispravan OIB i e-pošta odbijaju se uz razumljivu poruku.
- [ ] Logotip prihvaća slikovnu datoteku do 1 MB i odbija veće/ne-slikovne datoteke.
- [ ] Dodavanje i uklanjanje skladišne lokacije, vrste materijala i jedinice mjere.
- [ ] Skladišni obrazac nudi konfigurirane vrste, lokacije i jedinice kao prijedloge.
- [ ] Postavke smjene odbijaju završetak prije početka i pauzu dulju od smjene.
- [ ] Troškovne stope ne prihvaćaju negativne vrijednosti; koeficijent prekovremenog rada ograničen je na 1–3.
- [ ] Promjene postavki ostavljaju lokalni zapis u povijesti.
- [ ] JSON sigurnosna kopija uključuje profil, šifrarnike, pravila i dnevnik.
- [ ] Starija sigurnosna kopija bez novih ključeva može se vratiti uz sigurne zadane vrijednosti.
- [ ] Sigurnosna kopija dostupna je kao zasebna stavka navigacije.
- [ ] Sučelje jasno navodi lokalnu pohranu i ograničenja prototipa.
