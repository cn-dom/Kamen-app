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

**Važno:** trenutačni podaci spremaju se lokalno u preglednik (`localStorage`). Nema prijave, višekorisničke sinkronizacije, izolacije tvrtki ni sigurnosne kopije. Aplikacija se još ne smije smatrati spremnom za stvarni višekorisnički poslovni rad.

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
