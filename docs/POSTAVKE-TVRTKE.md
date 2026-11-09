# Postavke tvrtke — Kamen-app

## Profil tvrtke
Uredi osnovne podatke tvrtke i kontakt. OIB se provjerava na 11 znamenki kada je unesen; e-pošta mora biti valjanog oblika. Logotip je lokalna slikovna datoteka do 1 MB.

## Skladišni šifrarnici
Lokacije, vrste materijala i jedinice mjere služe kao prijedlozi pri unosu skladišnih stavki. Postojeće stavke ne mijenjaju se retroaktivno kada se šifrarnik promijeni.

## Pravila rada
Unesi početak i završetak smjene, pauzu, informativne troškovne stope i koeficijent prekovremenog rada. Smjena mora završiti nakon početka; pauza mora biti kraća od smjene; troškovi ne mogu biti negativni; koeficijent je od 1 do 3.

Ove vrijednosti trenutačno su konfiguracijske. Ne obračunavaju plaću, ne predstavljaju službenu evidenciju radnog vremena i ne zamjenjuju računovodstveni sustav.

## Pohrana i sigurnosna kopija
Podaci se spremaju u localStorage preglednika. Za prijenos na drugi uređaj izradi JSON sigurnosnu kopiju u zasebnom modulu Sigurnosna kopija. Stare kopije koje ne sadrže nove ključeve i dalje se mogu vratiti uz zadane vrijednosti za nove postavke.

## Ograničenja
Nema poslužiteljske pohrane, sinkronizacije, stvarnih korisničkih ovlasti ni izolacije podataka između tvrtki. Lokalni dnevnik promjena nije nepromjenjivi revizijski trag.
