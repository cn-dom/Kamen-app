# Završna provjera Kamen-app

Datum provjere: 2026-11-09  
Ciljna grana: `main`

## Obuhvat

Završna provjera obuhvaća deset funkcionalnih cjelina koje su već uključene u glavnu granu:

1. Skladište i evidencija materijala
2. Financije i troškovi
3. Proizvodnja i radni centri
4. Poslovni tijek i projekti
5. Korisnici i lokalne ovlasti
6. Alati i oprema
7. Radnici i raspored
8. Terenski rad i montaža
9. Dokumenti i obavijesti
10. Postavke tvrtke

## Dorada obračuna rada i prijevoza

Ova završna dorada povezuje postojeće evidencije s cijenama iz Postavke tvrtke:

- Proizvodni sati iz vremenskih sesija po komadu i fazi množe se s postavljenim troškom rada po satu.
- Faza `Terenski rad / montaža` iz proizvodnog zapisa izuzima se iz tog zbroja kako se ne bi dvostruko obračunala s terenskim nalogom.
- Terenski sati računaju se iz vremenskih događaja `Montaža u tijeku` i `Završeno`, pomnoženo s brojem članova ekipe.
- Ukupna kilometraža unosi se u proširenom prikazu terenskog naloga nakon povratka ekipe. Prijevoz se obračunava tek kad je nalog u statusu `Vraćeno`.
- Cijena rada i prijevoza uzima se iz lokalno spremljenih pravila tvrtke.
- Ako postoji ručno unesena stavka stvarnog troška iste kategorije za isti radni nalog, ručni unos ima prednost i automatski se izračun te kategorije ne dodaje. Time se izbjegava dvostruko zbrajanje.

Automatski obračuni su izvedeni zapisi u pregledu financija; ne spremaju se kao trajne ručne stavke i ponovno se izračunavaju iz izvornih evidencija.

## Ograničenja koja ostaju

- Podaci se i dalje spremaju u `localStorage`; nema međ uređajne sinkronizacije ni server-side izolacije tvrtki.
- Lokalna korisnička prava nisu sigurnosna granica.
- Cijena rada po satu predstavlja informativni trošak rada, a ne obračun plaće ili zakonsku evidenciju radnog vremena.
- Kilometražu unosi korisnik; aplikacija ne očitava GPS ni kilometar-sat vozila.
- Financijski pregled nije računovodstveni ni fiskalizacijski sustav.
- Plan pilanja je pomoć pri planiranju; ne upravlja fizičkim strojevima.
- Nije provedeno fizičko testiranje na stvarnim strojevima ni potpuni ručni prolaz svih ekrana na svim modelima uređaja.

## Završni koraci prije stvarne višekorisničke uporabe

1. Vratiti zaštitu grane `main`: zahtijevati PR i uspješan `build` check, zabraniti izravni push i force-push.
2. Provesti ručni prihvatni test stvarnog procesa: zaprimanje ploče → plan pilanja → potrošnja i ostatak → proizvodne faze → montaža → račun → uplata → zatvaranje projekta.
3. Nakon završetka funkcionalnih modula implementirati backend, autentikaciju, tenant izolaciju, audit i sinkronizaciju između uređaja.
4. Ponoviti testove i sigurnosnu provjeru nakon backend integracije.

## Status

Ova dokumentacija bilježi pregled koda i automatiziranih provjera. Ne predstavlja potvrdu računovodstvene, pravne, sigurnosne ili strojarske ispravnosti aplikacije.
