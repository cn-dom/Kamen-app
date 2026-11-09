# Kamen-app — uloge i ovlasti

**Verzija:** 1.1  
**Status:** Lokalni pripremni modul implementiran; stvarna sigurnost čeka backend fazu.

## Uloge

- **Vlasnik tvrtke:** upravlja svim podacima, članovima, financijama i odobrenjima unutar svoje tvrtke.
- **Voditelj / poslovođa:** vodi projekte, proizvodnju, raspored i operativnu kvalitetu; financije samo uz izričitu dodatnu ovlast.
- **Skladištar:** vodi primitke, izdavanja, premještaje i inventuru te može predlagati otpis; ne odobrava vlastiti otpis.
- **Radnik / monter:** evidentira vlastiti rad i vidi dodijeljene poslove u stvarnom višekorisničkom sustavu.
- **Financije:** pristup troškovima, cijenama, maržama i financijskim izvještajima kada je dodijeljeno.

## Zadane ovlasti

| Područje | Vlasnik | Voditelj | Skladištar | Radnik/monter | Financije |
|---|---:|---:|---:|---:|---:|
| Projekti | Sve | Pregled i uređivanje | — | Dodijeljeni poslovi (kasnije) | Pregled |
| Proizvodnja i raspored | Da | Da | — | Vlastiti rad | — |
| Skladište | Sve | Pregled | Primitak/izdavanje/premještaj | Potvrda vlastitog materijala (kasnije) | — |
| Predlaganje otpisa | Da | Uz dodatnu ovlast | Da | — | — |
| Odobravanje otpisa | Da | Samo uz dodatnu ovlast | Ne vlastiti | — | — |
| Nabavne cijene i troškovi | Da | Samo uz dodatnu ovlast | Ne | Ne | Da |
| Prodajne cijene i marže | Da | Samo uz dodatnu ovlast | Ne | Ne | Da |
| Financijski izvještaji | Da | Samo uz dodatnu ovlast | Ne | Ne | Da |
| Upravljanje članovima | Da | Ne po zadanim postavkama | Ne | Ne | Ne |
| Povijest promjena | Da | Operativni dio | Relevantni dio | Vlastiti dio (kasnije) | Financijski dio |

## Implementirano u ovoj fazi

- Lokalni popis članova s imenom, opcionalnom e-poštom, ulogom i statusom.
- Dodavanje i uklanjanje članova te deaktivacija/aktivacija lokalnog profila.
- Zadane uloge i pojedinačno uključivanje/isključivanje ovlasti.
- Pregled prava profila i lokalni dnevnik promjena.
- Uključivanje popisa članova i dnevnika u JSON sigurnosnu kopiju.

## Granice implementacije

Sve se sprema u localStorage preglednika. Ne postoje stvarni računi, prijava, potvrda e-pošte, reset lozinke, sesije, poslužiteljska autorizacija, sigurno odvajanje tvrtki ni sinkronizacija. Uloge služe pripremi poslovnih pravila i provjeri sučelja; **ne štite podatke** i ne smiju se koristiti kao sigurnosna kontrola. Lokalni dnevnik može se mijenjati zajedno s podacima preglednika i nije nepromjenjiv.

## Završna faza povezivanja

Nakon dovršetka funkcionalnih cjelina povezati odabrani backend i provesti:
1. autentikaciju, potvrdu računa, reset lozinke i upravljanje sesijama;
2. članstva korisnika u jednoj ili više tvrtki;
3. poslužiteljsku provjeru svake radnje i izolaciju svih podataka po tvrtki;
4. poziv/uklanjanje korisnika i ukidanje sesija;
5. kontrolu odobrenja otpisa, inventurnih razlika i financijskih korekcija;
6. revizijski trag na poslužitelju;
7. sinkronizaciju između računala i mobitela;
8. migraciju postojećih lokalnih podataka i provjeru sigurnosnih kopija.

Backend se ne uvodi u ovoj cjelini.
