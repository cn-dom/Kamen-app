# Kamen-app

Program za kamenoklesarske tvrtke: skladište kamena, praćenje ploča i ostataka, radni nalozi, proizvodne faze, montaža na terenu, alati, troškovi i izvještaji.

## Status

Projekt je u fazi planiranja. Dokumentacija se priprema prije izrade aplikacije. Funkcionalnosti navedene u specifikaciji još nisu tvrdnja da su implementirane.

## Dokumentacija

- [Funkcionalna specifikacija](SPECIFIKACIJA-PROGRAMA.md)
- [Struktura projekta](docs/STRUKTURA-PROJEKTA.md)
- [Plan ekrana i korisničkih tokova](docs/PLAN-EKRANA.md)

## Temeljna pravila

- Svaka tvrtka ima odvojene podatke i korisnike.
- Vlasnik tvrtke upravlja podacima i ovlastima svoje tvrtke.
- Radnici prema zadanim postavkama ne vide financijske podatke.
- Valuta je euro (EUR, €).
- Sučelje se planira za mobitel i računalo, uz mogućnost PWA instalacije.
- Sigurnost i provjera ovlasti moraju biti provedene na poslužiteljskoj strani, a ne samo skrivanjem elemenata sučelja.
- Izvorni kod, dokumentacija i promjene vode se u ovom GitHub repozitoriju.

## Trenutačno izvan opsega

Supabase nije povezan niti se smije konfigurirati u ovoj fazi. Ne stvarati tablice, migracije, politike, ključeve ni produkcijske postavke dok vlasnik projekta to izričito ne odobri.

## Plan rada

1. Uskladiti specifikaciju, strukturu i plan ekrana.
2. Razraditi korisničke uloge, podatkovne tokove i kriterije prihvaćanja.
3. Odabrati tehnologije i pripremiti lokalni razvojni kostur tek nakon potvrde plana.
4. Razvijati module postupno i testirati svaki prije nastavka.
5. Integraciju baze i autentikacije odraditi tek uz izričito odobrenje.

## Pravilo

Prije većih promjena prvo provjeriti postojeće datoteke i utjecaj promjene. Ne prikazivati planirane funkcije kao dovršene.
