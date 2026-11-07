# Kamen-app — testni scenariji

**Verzija:** 1.0  
**Status:** Kriteriji prihvaćanja i plan testiranja. Automatizirani funkcionalni testovi još nisu implementirani; trenutačni CI provjerava Vite build. Za poznate rizike pogledati [reviziju](AUDIT-POSTOJECEG-STANJA.md).

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

## Kriterij završetka

Modul se ne smatra spremnim samo zato što se ekran otvara. Mora proći odgovarajuće funkcionalne, ovlastne i regresijske testove. Testovi izolacije tvrtki i zaštite financijskih podataka blokiraju objavu ako padnu.

Testovi sadrže izmišljene testne podatke. Ne koristiti stvarne podatke klijenata za razvojne ili demonstracijske testove.
