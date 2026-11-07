# Kamen-app

Poslovna aplikacija za kamenoklesarske radionice. Projekt se razvija postupno, uz očuvanje postojećih funkcionalnosti i provjeru svake promjene.

## Trenutačno stanje

Aplikacija već sadrži početne module:
- nadzorna ploča;
- radni nalozi s komadima i okvirnim izračunom potrebnih ploča;
- skladište materijala, decimalna potrošnja pri pilanju, ostatci i otpad;
- gotovi proizvodi;
- proizvodnja po fizičkom komadu, radniku, vremenskim intervalima, zastojima i kontroli kvalitete;
- terenski rad;
- kupci;
- troškovi i osnovni izvještaji.

**Važno:** poslovni podaci spremaju se lokalno u preglednik (`localStorage`). Postoji ručni izvoz i povrat sigurnosne kopije, ali nema prijave, višekorisničke sinkronizacije ni izolacije tvrtki. Aplikacija se još ne smije smatrati spremnom za stvarni višekorisnički poslovni rad.

## Provjera kvalitete koda

- `npm test` pokreće automatizirane testove proizvodnih izračuna i migracije podataka.
- GitHub Actions pokreće testove prije builda i objave.

## Revizija i dokumentacija

- [Revizija postojećeg stanja i prioriteti](docs/AUDIT-POSTOJECEG-STANJA.md)
- [Funkcionalna specifikacija](SPECIFIKACIJA-PROGRAMA.md)
- [Model podataka](docs/MODEL-PODATAKA.md)
- [Struktura projekta](docs/STRUKTURA-PROJEKTA.md)
- [Plan ekrana i korisničkih tokova](docs/PLAN-EKRANA.md)
- [Testni scenariji](docs/TESTNI-SCENARIJI.md)
- [Uloge i ovlasti](docs/ULOGE-I-OVLASTI.md)

## Temeljna pravila

- Nadograđivati postojeći Kamen-app; ne počinjati ispočetka.
- Svaka tvrtka u budućem višekorisničkom sustavu mora imati odvojene podatke i korisnike.
- Vlasnik tvrtke upravlja podacima i ovlastima svoje tvrtke.
- Radnici prema zadanim postavkama ne vide financijske podatke.
- Valuta je euro (EUR, €).
- Sučelje mora biti uporabljivo na mobitelu i računalu.
- Sigurnost i provjera ovlasti moraju biti provedene na poslužiteljskoj strani, a ne samo skrivanjem elemenata sučelja.
- Svaka promjena zalihe mora imati jasan i provjerljiv trag.

## Pohrana i Supabase

Supabase nije povezan niti se smije konfigurirati dok vlasnik projekta to izričito ne odobri. Trenutačna lokalna pohrana služi za razvoj i provjeru sučelja, a ne za sinkronizirani rad više zaposlenika.

## Razvoj i objava

Promjene se rade u zasebnim granama i kroz pull request prema `main`. Prije spajanja mora proći build; nakon spajanja provjerava se objava na GitHub Pages.


## Raspored radionice

Modul **Raspored** povezuje planiranje s postojećim radnim nalozima i fizičkim komadima iz proizvodnje. Aktivnosti imaju fazu obrade, radnika, stroj/radno mjesto, prioritet, termin i status. Tjedni pregled prikazuje opterećenje, a provjera prije spremanja sprječava preklapanje termina istog radnika ili stroja. Popis opreme može se prilagoditi radionici. Raspored i oprema uključeni su u JSON sigurnosnu kopiju.

Planirani termini odvojeni su od stvarnih radnih intervala u modulu Proizvodnja: promjena rasporeda ne pokreće automatski štopericu. Podaci se i dalje spremaju lokalno u preglednik.


## Nabava i dobavljači

Modul **Nabava** vodi adresar dobavljača, narudžbe s više stavki, količine, ulazne cijene, PDV i očekivane datume. Podržano je djelomično zaprimanje: svako zaprimanje stvara novu skladišnu stavku s vezom na dobavljača i narudžbu te evidentira skladišno kretanje. Povijest nabave i CSV izvoz omogućuju pregled naručenih i zaprimljenih količina. Podaci su lokalni i uključeni u JSON sigurnosnu kopiju; modul nije zamjena za računovodstvo ili eRačun.


## Ponude i kalkulacije

Modul **Ponude** omogućuje izradu ponuda za kupce iz imenika ili ručni unos kupca, više stavki materijala i usluga, različite stope PDV-a, popust, uvjete i rok valjanosti. Ispis se otvara u pregledniku i može se spremiti kao PDF. Podaci ponuditelja spremaju se za ponovnu uporabu. Ponude imaju statuse nacrt, poslana, prihvaćena i odbijena; prihvaćenu ponudu moguće je povezati s postojećim radnim nalogom. Ponude i profil ponuditelja uključeni su u JSON sigurnosnu kopiju.


## Isporuke i naplata

Modul **Isporuke i naplata** prikazuje prihvaćene ponude, iznos naplaćenih uplata, otvorena potraživanja i dospjele obveze kupaca. Rok plaćanja može se postaviti po prihvaćenoj ponudi. Uplate se evidentiraju djelomično ili u cijelosti uz datum, način plaćanja i referencu; sustav ne dopušta evidentiranje iznosa većeg od preostalog duga.

Otpremnica se izrađuje iz prihvaćene ponude, omogućuje djelomičnu isporuku pojedinih stavki i kontrolira da ukupno evidentirana isporuka ne prijeđe ugovorenu količinu. Dokument se može ispisati ili spremiti u PDF. Otpremnice i uplate uključene su u JSON sigurnosnu kopiju.

Pri izradi otpremnice svaka stavka može se povezati s odgovarajućim gotovim proizvodom. Za povezane stavke sustav provjerava raspoloživu količinu, umanjuje zalihu gotovih proizvoda i zapisuje transakciju na kartici proizvoda te skladišno kretanje s brojem otpremnice. Stavke bez povezanog proizvoda (npr. rad, montaža ili prijevoz) ne mijenjaju zalihu. Ista otpremnica ne može se dvaput proknjižiti.

**Ograničenja:** ovo je interna evidencija, a ne fiskalizirani račun, eRačun ili knjigovodstvena evidencija. Isporuka ne skida sirovi materijal; umanjuje samo izričito povezanu zalihu gotovih proizvoda. Podaci se spremaju lokalno u preglednik.


## Servis i reklamacije

Modul **Servis i reklamacije** vodi reklamacije, jamstvene i plaćene servise te redovne preglede. Servisni nalog može se povezati s kupcem iz imenika ili ručno unesenim kupcem te s izvornim radnim nalogom. Evidentiraju se datum prijave, rok, rok jamstva, prioritet, odgovorna osoba, opis problema, rezultat zahvata i kronološka povijest promjena. Fotografije prije i poslije mogu se dodavati i nakon otvaranja naloga (do 1,5 MB po fotografiji). Trošak se računa iz dijelova, sati rada i cijene sata, puta i ostalih troškova. Završetak zahtijeva evidentiran rezultat servisa. Podaci i fotografije uključeni su u JSON sigurnosnu kopiju.

**Ograničenja:** evidencija se sprema lokalno u preglednik; nije sustav za automatsku naplatu jamstvenih zahtjeva ni službeno izdavanje računa. Fotografije povećavaju veličinu lokalne pohrane i sigurnosne kopije.


## Održavanje strojeva i opreme

Modul **Održavanje strojeva** vodi registar strojeva i opreme s inventarnim i serijskim brojem, proizvođačem, lokacijom, radnim satima te intervalima redovnog servisa po danima i radnim satima. Dodavanje opreme sinkronizira naziv s popisom strojeva u modulu Raspored. Servisni zapisi obuhvaćaju preventivne preglede, kvarove, jamstvene zahvate, odgovornu osobu, zastoj, utrošene dijelove, sate rada i ostale troškove. Završetak zapisa zahtijeva opis rješenja, a servisna povijest sprječava slučajno brisanje stroja.

**Ograničenja:** radni sati unose se ručno; aplikacija ih ne očitava iz strojeva. Rokovi održavanja su podsjetnici na temelju ručno unesenih intervala. Podaci se spremaju lokalno u preglednik i uključeni su u JSON sigurnosnu kopiju.


### Izdavanje rezervnih dijelova za održavanje

U modulu **Održavanje strojeva** servisni nalog može sadržavati više rezervnih dijelova odabranih iz aktivnog skladišta. Pri spremanju naloga sustav provjerava raspoloživu količinu, umanjuje zalihu, sprema izdavanje u skladišna kretanja s referencom na servisni nalog te čuva naziv, količinu, jedinicu i lokaciju iz trenutka izdavanja. Izdani dijelovi ostaju zaključani pri naknadnom uređivanju kako se ista stavka ne bi dvaput skinula sa zalihe. Ako spremanje povezane evidencije ne uspije, sustav pokušava vratiti prethodne lokalne vrijednosti. Trošak dijelova u servisnom nalogu i dalje se unosi zasebno kao novčani iznos.


### Minimalne zalihe i prijedlozi nabave

Na kartici materijala u skladištu postavi minimalnu količinu veću od nule. Modul **Nabava → Niske zalihe** prikazuje aktivne materijale koji su na ili ispod minimuma, trenutačno stanje, prag i predloženu količinu za dopunu do dvostrukog minimuma. Gumb **Pripremi narudžbu** otvara nacrt nabave s unaprijed popunjenim podacima materijala; povezani dobavljač predlaže se ako je spremljen na skladišnoj stavci. Prije spremanja korisnik mora provjeriti dobavljača, količinu i cijenu. Sustav ne šalje narudžbe automatski. Prijedlozi se računaju iz trenutačnog stanja skladišta, pa obuhvaćaju i potrošnju kroz proizvodnju, servis, prodaju i ručna kretanja.


### Upozorenja minimalne zalihe na nadzornoj ploči

Početna nadzorna ploča koristi isti izračun minimalne zalihe kao modul Nabava. Brojač prikazuje samo aktivne materijale s postavljenim minimumom koji su na ili ispod praga; materijali bez minimuma ne stvaraju lažna upozorenja. Zvonce u gornjoj traci otvara popis materijala sa stanjem i minimumom, a bočna navigacija prikazuje broj upozorenja uz Nabavu. Odabir **Otvori nabavu** vodi izravno u modul nabave. Podaci se osvježavaju pri povratku iz modula na pregled.
