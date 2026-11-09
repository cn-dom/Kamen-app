# Cjelina 5 — korisnici, uloge i pristup

**Status: lokalni upravljački prototip dovršen; stvarna sigurnost i sinkronizacija odgođene za završnu backend integraciju.**

## Implementirano u ovoj fazi
- Pet poslovnih uloga: vlasnik, voditelj/poslovođa, skladištar, radnik/monter i financije.
- Matrica dopuštenja po modulima i osjetljivim radnjama.
- Lokalni ekran za popis članova, dodavanje oglednog člana, promjenu uloge, deaktivaciju i dodatne ovlasti.
- Financijski moduli skriveni su iz ogledne navigacije radnika i skladištara.
- Vlasnik zadržava puni skup oglednih ovlasti; dodatna prava mogu se dodijeliti drugim ulogama.
- Podaci prototipa spremaju se u lokalni preglednik; nema slanja pozivnica ni stvarne autentikacije.
- Dodani su testovi matrice dopuštenja.

## Namjerno odgođeno
Korisnik je odlučio da se Cloudflare Workers + D1 i Supabase uvode tek nakon završetka svih funkcionalnih cjelina. Zato ova faza ne uvodi backend, Supabase SDK, Cloudflare Worker, bazu ni tajne ključeve.

## Sigurnosne granice
- Lokalna provjera i skrivanje navigacije služe samo za demonstraciju UX-a.
- Ne predstavljaju sigurnosnu kontrolu: korisnik može mijenjati localStorage ili pozvati postojeće funkcije iz preglednika.
- Nema stvarne prijave, pozivnica, resetiranja lozinke, opoziva sesija ni server-side ACL-a.
- Nema sigurne izolacije podataka više tvrtki niti sinkronizacije između uređaja.
- Revizijski trag ostaje lokalni i nije nepromjenjiv.
- Ne smije se koristiti s pravim zaposlenicima ili osjetljivim poslovnim podacima kao da je produkcijski sustav ovlasti.

## Završna backend faza
Nakon dovršetka funkcionalnih cjelina potrebno je:
1. Odabrati i dokumentirati podjelu odgovornosti Cloudflare Workers + D1 i Supabase.
2. Implementirati autentikaciju, pozivnice, reset lozinke i upravljanje sesijama.
3. Svaki poslovni zapis povezati s company_id; provoditi tenant izolaciju na poslužitelju i u pravilima baze.
4. Provjeravati korisnika, članstvo, ulogu i dopuštenje na svakoj API operaciji.
5. Uvesti revizijski trag na poslužitelju, kontrolu otpisa i neovisna odobrenja.
6. Uvesti sinkronizaciju uređaja, konflikte, offline ponašanje i sigurnosne kopije.
7. Provesti testove pokušaja pristupa tuđoj tvrtki, eskalacije ovlasti, opoziva pristupa i paralelnih izmjena.

**Napomena:** Cloudflare i Supabase ne treba uvoditi dvostruko za istu odgovornost bez arhitekturnog razloga. U završnoj fazi treba odrediti jedan izvor istine za identitet, podatke i ovlasti.
