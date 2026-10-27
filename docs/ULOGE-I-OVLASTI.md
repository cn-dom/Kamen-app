# Kamen-app — uloge i ovlasti

**Verzija:** 1.0  
**Status:** Prijedlog za pregled — pravila prije implementacije

## Načela

- Pristup se dodjeljuje po najmanjoj potrebnoj ovlasti.
- Svaki zahtjev provjerava identitet, članstvo u tvrtki, ulogu i pristup konkretnom zapisu na poslužitelju.
- Skriven gumb nije sigurnosna zaštita.
- Korisnik tvrtke A ne smije čitati, mijenjati, pretraživati, izvoziti ni preuzimati datoteke tvrtke B.
- Financije, nabavne/prodajne cijene i marže nisu vidljive radnicima po zadanim postavkama.
- Promjene ovlasti, inventure, otpisi i financijske korekcije moraju biti evidentirani.
- Vlasnik softvera ne dobiva automatski neograničen pristup poslovnim podacima korisničkih tvrtki. Svaki podržani pristup mora biti ograničen, opravdan i zabilježen.

## Predložene uloge

### Vlasnik tvrtke

- Pregled svih projekata, radnika, materijala, faza, rokova i troškova svoje tvrtke.
- Upravljanje članovima, ulogama i postavkama tvrtke.
- Pregled nabavnih i prodajnih cijena, marži i izvještaja.
- Odobravanje otpisa, korekcija i zatvaranja naloga prema pravilima tvrtke.
- Izvoz poslovnih izvještaja i pregled revizijskog traga.
- Ne može pristupati podacima druge tvrtke samo zato što je vlasnik svoje tvrtke.

### Voditelj / poslovođa

- Pregled dodijeljenih projekata i proizvodnih rokova.
- Raspoređivanje poslova i radnika te upravljanje fazama.
- Evidencija zastoja, napretka, utroška i kvalitete.
- Pregled operativnih izvještaja.
- Financijski pregled samo ako mu vlasnik izričito dodijeli dopuštenje.
- Bez upravljanja vlasništvom tvrtke ili pristupom drugim tvrtkama.

### Skladištar

- Unos primitaka, premještaja, izdavanja i povrata.
- Pregled količina, lokacija, oznaka ploča/komada i stanja zaliha.
- Evidencija ostataka, oštećenja i inventure.
- Nabavne cijene, ukupna vrijednost zalihe i financijski izvještaji skriveni po zadanim postavkama.
- Ne može sam odobriti vlastiti otpis ili korekciju ako je za tu radnju propisano odobrenje.

### Radnik / monter

- Pregled vlastitih dodijeljenih poslova i potrebnih radnih uputa.
- Ažuriranje dopuštenih faza, vremena rada, bilježaka i fotografija.
- Evidencija preuzetog/vraćenog alata i materijala koji su mu dodijeljeni.
- Bez cijena, marži, financijskih izvještaja i podataka drugih radnika koji nisu potrebni za posao.
- Ne može mijenjati zaključene evidencije bez kontrolirane ispravke.

### Računovodstvena / financijska uloga

- Pregled samo onih troškova, prodajnih podataka i izvještaja koje vlasnik dodijeli.
- Bez automatskog prava upravljanja proizvodnim postavkama, korisnicima ili drugim tvrtkama.
- Ova uloga ne podrazumijeva da aplikacija izdaje fiskalizirane račune.

### Podrška platforme

- Upravljanje tehničkim stanjem usluge, pretplatama i aktivacijom tvrtki u opsegu koji se naknadno dogovori.
- Nema redovitog pristupa sadržaju poslovnih zapisa.
- Privremeni pristup podršci, ako bude potreban, mora imati razlog, odobrenje, ograničeno trajanje i revizijski zapis.
- Tajna autentikacijska sredstva, lozinke i privatni ključevi ne smiju biti dostupni kroz administracijsko sučelje.

## Matrica ovlasti (zadano stanje)

| Radnja | Vlasnik tvrtke | Voditelj | Skladištar | Radnik/monter | Financije |
|---|---|---|---|---|---|
| Pregled svih projekata tvrtke | Da | Prema dodjeli ili pravilima tvrtke | Samo podaci potrebni za skladište | Ne | Samo ako je potrebno |
| Izrada i uređivanje projekta | Da | Da, u okviru ovlasti | Ne | Ne | Ne |
| Pregled količina i lokacija zalihe | Da | Da | Da | Dodijeljeni materijal | Po potrebi |
| Uređivanje skladišnih kretanja | Da | Prema ovlasti | Da | Samo potvrda vlastitog izdavanja/povrata | Ne |
| Pregled nabavnih cijena | Da | Samo uz dopuštenje | Ne po zadanim postavkama | Ne | Da, ako je dodijeljeno |
| Pregled prodajnih cijena i marži | Da | Samo uz dopuštenje | Ne | Ne | Da, ako je dodijeljeno |
| Evidencija faze i sati rada | Da | Da | Ne, osim skladišnih događaja | Za dodijeljeni posao | Pregled ako je dopušten |
| Odobravanje otpisa/korekcije | Da | Samo uz izričitu ovlast | Ne vlastitu korekciju | Ne | Ne po zadanim postavkama |
| Upravljanje članovima i ulogama | Da | Ne po zadanim postavkama | Ne | Ne | Ne |
| Pregled revizijskog traga | Da | Operativni dio ako je dopušten | Svoj relevantni dio | Vlastite evidencije prema pravilima | Financijski dio ako je dopušten |
| Izvoz financijskih izvještaja | Da | Samo uz dopuštenje | Ne | Ne | Da, ako je dodijeljeno |

## Pravila za iznimke

1. Dodatne ovlasti dodjeljuju se pojedinačno i moraju biti vidljive vlasniku tvrtke.
2. Opasne radnje mogu zahtijevati potvrdu druge ovlaštene osobe.
3. Korisnik ne može odobriti vlastitu radnju ako pravilo zahtijeva neovisno odobrenje.
4. Promjena uloge mora se zabilježiti i odmah primijeniti na buduće zahtjeve.
5. Prilikom uklanjanja člana ukida se njegov pristup tvrtki, ali se poslovni zapisi i povijest rada čuvaju.
6. Izvoz i preuzimanje osjetljivih izvještaja treba evidentirati.
7. Podrška platforme ne smije zaobilaziti izolaciju tvrtki bez posebnog, kontroliranog postupka.

## Prije implementacije treba potvrditi

- Smije li voditelj vidjeti troškove rada, ali ne i prodajnu maržu?
- Treba li skladištar vidjeti nabavnu cijenu pojedine ploče ili samo količinu i lokaciju?
- Koje radnje zahtijevaju odobrenje druge osobe?
- Smije li radnik ispraviti vlastite sate istog dana, a nakon zaključavanja samo poslati zahtjev za ispravak?
- Koji su izvještaji dostupni financijskoj ulozi?

Dok se odgovori ne potvrde, vrijedi sigurnija postavka: financijski podaci dostupni su samo vlasniku tvrtke i izričito ovlaštenim osobama.
