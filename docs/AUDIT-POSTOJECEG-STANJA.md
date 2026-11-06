# Kamen-app — revizija postojećeg stanja

**Datum pregleda:** 6. studenoga 2026.  
**Pregledani ogranak:** `main`  
**Pregledani commit:** `57829b26bbf73adaeee0b225b7c6733bf39b3c74`  
**Vrsta pregleda:** statički pregled izvornog koda i dokumentacije. Ovo nije potvrda potpunog runtime testiranja.

## 1. Sažetak

Kamen-app već ima funkcionalnu početnu aplikaciju s nadzornom pločom i modulima za radne naloge, skladište, pilanje, gotove proizvode, proizvodne faze, terenski rad, kupce te troškove i izvještaje.

Najvažniji nedostatak nije broj ekrana nego pouzdanost povezivanja podataka. Trenutačno se podaci spremaju u `localStorage` pojedinog preglednika. Nema prijave, stvarnih korisničkih uloga, zajedničke pohrane ni sinkronizacije između uređaja. Skladišni dnevnik je ograničen na zadnjih 100 događaja i nije nepromjenjiv revizijski trag.

**Zaključak:** postojeću aplikaciju treba sačuvati i nadograđivati. Prije dodavanja velikog broja novih funkcija treba učvrstiti obračun zaliha i životni ciklus radnog naloga.

## 2. Što je već implementirano

| Područje | Trenutačno stanje u kodu | Ograničenja |
|---|---|---|
| Nadzorna ploča | Broji naloge i stanje skladišta, prikazuje rokove i brze radnje | Dio brzih radnji je pojednostavljen; nema zajedničkog osvježavanja podataka u stvarnom vremenu |
| Radni nalozi | Kupac, projekt, komadi, dimenzije, debljina, količina, status i izračun potrebnih ploča | Izračun je površinski, zaokružen na 0,01 ploče; ne optimizira raspored rezova ni širinu reza |
| Skladište | Slobodan unos materijala, dimenzije, količine, lokacija, uređivanje, uklanjanje i osnovna kretanja | Nema dobavljača/nabavnih dokumenata, QR/barcode identifikacije ni punog modela skladišnih lokacija |
| Pilanje | Ulazna ploča, stvarna decimalna potrošnja, izlazni komadi, ostatci i otpad | Nema geometrijskog nesting plana; događaji nisu zaštićeni od dvostrukog slanja ili paralelnog rada |
| Gotovi proizvodi | Ručni unos i stvaranje proizvoda pilanjem; kategorije, dimenzije, količina, obrada i status | Prodaja/ugradnja trenutačno skidaju cijelu raspoloživu količinu, bez djelomične količine |
| Proizvodnja | Statusi faza pilanje, kanterica, poliranje, ostala obrada i kontrola | Faze su vezane uz nalog, ne uz pojedini komad; nema radnika, trajanja, količine, zastoja ni potvrde utroška |
| Terenski rad | Terenski nalog, lokacija, datum, statusni tijek i osnovna vremenska polja | Nema potpune evidencije ekipe, vozila, alata, pauza, prijevoza, djelomične ugradnje i povrata |
| Kupci | Imenik, uređivanje, arhiviranje i povezani nalozi | Veza s nalozima oslanja se na jednak tekst naziva kupca, a ne stabilni ID |
| Troškovi i izvještaji | Planirani/stvarni troškovi, kategorije, sati rada, CSV i ispis | Nema cjelovitog obračuna nabave, prodaje, marže, ponuda, računa ni fiskalizacije |
| Dizajn | Responzivno sučelje i zasebni moduli | Potrebno je testirati stvarne tokove na mobitelu i računalu |

## 3. Utvrđeni rizici i nedostaci

### P0 — integritet zaliha i poslovnih zapisa

1. **Brisanje radnog naloga ne vraća rezervirani materijal.** Funkcija uklanjanja naloga trenutačno uklanja zapis iz popisa, ali ne vraća rezerviranu količinu u skladište niti stvara događaj povrata.
2. **Gotovi proizvodi nemaju djelomičnu prodaju ili ugradnju.** Promjena statusa na `Prodano` ili `Ugrađen` postavlja raspoloživu količinu na nulu. Potrebno je omogućiti unos količine i zadržati preostalu zalihu.
3. **Promjena statusa gotovog proizvoda natrag na zalihu može vratiti početnu količinu.** To može ponovno prikazati količinu koja je već djelomično prodana ili ugrađena kada se uvede djelomična potrošnja.
4. **Završetak terenskog naloga ugrađuje sve raspoložive gotove proizvode povezane s radnim nalogom.** Nema potvrde stvarno ugrađenih količina po stavci.
5. **Više odvojenih komponenti mijenja iste zapise u localStorageu.** Bez zajedničkog sloja poslovnih operacija postoji rizik zastarjelih stanja, prepisivanja promjena i dvostrukih kretanja, osobito u više kartica preglednika.
6. **Brisanje skladišne stavke fizički uklanja zapis.** Povijest i veze prema radnim nalozima mogu izgubiti jasan referentni zapis; prednost treba dati arhiviranju i kontroliranoj korekciji.

### P1 — sljedivost i proizvodnja

7. Skladišni dnevnik ograničen je na 100 zapisa; nije nepromjenjiv i nema pouzdanu identifikaciju korisnika, odobrenja ni prethodne/nove vrijednosti.
8. Rezervacija, izdavanje, stvarna potrošnja, povrat i otpis nisu još razdvojeni u cjelovitom modelu događaja.
9. Izračun ploča u radnom nalogu temelji se na ukupnoj površini komada podijeljenoj površinom ploče. Ne uzima u obzir raspored komada, rotaciju, smjer uzorka, širinu reza, rubne gubitke ni stvarni plan rezanja.
10. Proizvodne faze vode se po radnom nalogu, a ne po pojedinačnim komadima; status faze ne potvrđuje da je količina stvarno obrađena.
11. Komadi i ostatci nastali pilanjem trebaju imati trajnu vezu porijekla prema izvornoj ploči, uključujući daljnje rezanje ostatka.
12. Nedostaju dobavljači, zaprimanje po dokumentu, nabavne cijene po seriji/ploči, prijenos između lokacija, inventura i odobrenje otpisa.

### P2 — poslovni opseg

13. Nema stvarnog rasporeda radnika, smjena, evidencije radnih sati, vozila, alata i zaduženja opreme.
14. Nema modula za ponude, potvrde narudžbe, isporuke, račune i naplatu. Računovodstvo/fiskalizaciju treba posebno definirati prije razvoja.
15. Nema potpunih izvještaja o marži i profitabilnosti koji bi se mogli pouzdano izračunati iz stvarnih nabavnih i prodajnih podataka.
16. Nema sigurnosnih kopija i postupka vraćanja podataka u aplikaciji.

### P0 — platforma, pristup i pohrana

17. Podaci se čuvaju u `localStorage` jednog preglednika. Ne sinkroniziraju se između računala, mobitela ni zaposlenika; čišćenje podataka preglednika može ih izgubiti.
18. Prijava, članstvo u tvrtki i stvarne ovlasti nisu implementirani. Prikaz vlasnika i preklopnik tvrtke zasad su samo sučelje.
19. Nema izolacije podataka između tvrtki jer nema poslužiteljske pohrane ni provjere pristupa.
20. Supabase nije uveden i neće se uvoditi bez izričitog odobrenja vlasnika projekta.

## 4. Testiranje i kvaliteta

- `package.json` trenutačno definira `dev`, `build` i `preview`; nema skripti za automatske unit, integration ili end-to-end testove.
- GitHub Actions provodi instalaciju ovisnosti i Vite build. Uspješan build potvrđuje da se aplikacija može izgraditi, ali ne potvrđuje ispravnost obračuna zaliha ili cijelog korisničkog toka.
- Postojeći `docs/TESTNI-SCENARIJI.md` sadrži korisne kriterije prihvaćanja, ali oni nisu automatizirani.
- Ovim pregledom nije provedeno ručno testiranje objavljene aplikacije na stvarnom mobitelu i računalu.

## 5. Preporučeni redoslijed rada

### Korak 1 — zaštita postojećih podataka i obračuna
- Jedinstven sloj za skladišne operacije i kretanja.
- Povrat rezervacije pri otkazivanju ili uklanjanju naloga.
- Djelomično izdavanje, prodaja i ugradnja gotovih proizvoda.
- Sprječavanje dvostrukih operacija i provjera dovoljne količine.
- Arhiviranje umjesto fizičkog brisanja važnih zapisa.

### Korak 2 — sljedivost kamena
- Jedinstveni ID za ploču, komad, ostatak i otpad.
- Veza roditelj–nastali komadi kroz više faza obrade.
- Evidencija nabave, lokacije, rezervacije, stvarne potrošnje, povrata i otpisa.
- Inventura s razlogom i odobrenjem.

### Korak 3 — proizvodnja po komadu
- Pojedinačne stavke radnog naloga i neovisni statusi faza.
- Odgovorni radnik, početak/kraj, količina, zastoj, napomena i fotografija.
- Kontrola kvalitete i spremnost za isporuku.

### Korak 4 — kupac i poslovni tijek
- Stabilne veze kupac–projekt–stavka–terenski nalog.
- Dobavljači, ponude, potvrde, isporuke i troškovnik.
- Radni sati, prijevoz, oprema i izvještaji.

### Korak 5 — zajednička pohrana i korisnici
- Prvo odobriti arhitekturu i trošak.
- Tek uz izričito odobrenje vlasnika uvesti bazu, prijavu, tvrtke, uloge, sigurnosne kopije i sinkronizaciju.
- Poslužiteljska provjera ovlasti i izolacija podataka obvezni su uvjeti prije stvarnog višekorisničkog rada.

## 6. Pravila razvoja

- Ne počinjati novi projekt i ne uklanjati postojeće module.
- Ne uvoditi Supabase bez izričitog odobrenja.
- Svaku cjelinu razvijati u zasebnoj grani i kroz pull request.
- Prije spajanja provjeriti build i pregledati promjene.
- Nakon spajanja provjeriti GitHub Actions deploy.
- Ne proglašavati funkciju dovršenom samo zato što se ekran otvara.
- Svaka promjena zalihe mora imati provjerljiv događaj i jasnu vezu s nalogom ili razlogom.
- Testirati scenarije s decimalnim količinama, djelomičnom potrošnjom, otkazivanjem i ponovljenim klikom.

## 7. Sljedeća razvojna cjelina

Prvi konkretni zadatak nakon ove revizije treba biti **sigurnost obračuna rezervacija i djelomične potrošnje**: otkazivanje naloga mora vratiti samo neiskorištenu rezervaciju; prodaja i ugradnja gotovog proizvoda moraju prihvatiti količinu; ponovljena radnja ne smije dvaput promijeniti zalihu. Prije implementacije treba izraditi regresijske scenarije za te slučajeve.
