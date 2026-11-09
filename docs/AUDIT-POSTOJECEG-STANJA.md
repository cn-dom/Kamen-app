# Kamen-app — revizija postojećeg stanja

**Datum ažuriranja:** 9. studenoga 2026.  
**Pregledani projekt:** `cn-dom/Kamen-app`  
**Cjelina 1:** PR [#85](https://github.com/cn-dom/Kamen-app/pull/85), ogranak `feature/cjelina-1-skladiste-integritet`  
**Pregledani commit:** `3e390004de4c31a1e50f68170106b0aed7d318e9`  
**Provjera CI-ja:** Build #261 — 129 testova prošlo, 0 palo; `npm run build` uspješan.  
**Napomena:** Ovo potvrđuje automatizirane testove i produkcijski build. Ne zamjenjuje ručni prolaz kroz stvarno sučelje na telefonu i računalu.

## 1. Sažetak

Cjelina 1 — **pouzdanost skladišta i sljedivost materijala** — implementirana je u PR-u #85. PR je prošao CI: 129/129 testova i Vite build. Promjene još nisu spojene u `main`.

Glavni tokovi skladišta sada koriste zajednički sloj transakcija: povezani zapisi zalihe, radnog naloga, gotovih proizvoda, potrošnje i dnevnika spremaju se zajedno. Svaka operacija ima jedinstveni ID radi zaštite od ponovljenog knjiženja. Ako spremanje jednog dijela transakcije ne uspije, prethodne vrijednosti vraćaju se.

## 2. Cjelina 1 — implementirano

| Područje | Stanje |
|---|---|
| Skladišni dnevnik | Nema automatskog rezanja na zadnjih 100/500 događaja; događaji imaju ID operacije, a gdje je primjenjivo i stanje prije/poslije |
| Primitak i izdavanje | Povezani zapisi spremaju se transakcijski; količina se validira |
| Ručna korekcija | Promjena količine traži obrazloženje |
| Otpis materijala | Traži količinu, razlog i dodatnu potvrdu prije knjiženja |
| Rezervacija radnog naloga | Rezervacija i nalog spremaju se zajedno |
| Otkazivanje/zatvaranje naloga | Neiskorištena rezervacija vraća se u raspoloživu zalihu; već potrošeni materijal ne vraća se |
| Pilanje | Potrošnja, povrat neiskorištene rezervacije, komadi, ostatci, otpad, obračun potrošnje i ažuriranje naloga jedna su transakcija |
| Gotovi proizvodi | Djelomična prodaja, ugradnja, povrat i korekcija; ne dopušta se izdavanje iznad raspoložive količine |
| Otpremnice | Otpremnica i skidanje gotovih proizvoda sa zalihe knjiže se zajedno |
| Inventura | Materijali i gotovi proizvodi ažuriraju se jednom transakcijom; zastarjelo stanje se odbija |
| Sljedivost | Novi komadi i ostatci nastali pilanjem imaju roditeljsku stavku, izvornu ploču i ID postupka pilanja; veza se čuva i pri daljnjem rezanju ostatka |
| Regresijski testovi | Testirana idempotentnost, rollback, djelomična prodaja/ugradnja, povrat, otpis, količine ostataka i lanac porijekla |

### Važno ograničenje odobravanja otpisa

Otpis trenutačno zahtijeva razlog i izričitu potvrdu u istom pregledniku. To je kontrola za trenutačni lokalni način rada, **nije stvarna provjera identiteta vlasnika/managera**. Poslužiteljsko odobravanje prema korisničkoj ulozi ne može se sigurno provesti dok ne postoje prijava, korisničke uloge i zajednička pohrana. Taj dio ostaje u cjelini za pristup i ovlasti.

## 3. Ograničenja koja ostaju

1. **Lokalna pohrana:** podaci su u `localStorage` pojedinog preglednika. Nema sinkronizacije između telefona i računala ni istodobnog rada više korisnika.
2. **Revizijski trag:** dnevnik je append-only kroz uobičajene radnje aplikacije, ali nije kriptografski ni poslužiteljski nepromjenjiv; netko s pristupom pregledniku može mijenjati lokalnu pohranu.
3. **Odobrenja:** nema stvarne ACL provjere vlasnika/managera; lokalna potvrda otpisa nije zamjena za korisničke ovlasti.
4. **Stari zapisi:** sljedivost se automatski upisuje za nove izlaze pilanja. Starim komadima i ostatcima bez poznatog izvora ne izmišljaju se veze.
5. **Kapacitet preglednika:** dnevnik se više ne skraćuje, ali lokalna pohrana ima ograničen kapacitet. Potrebno je zadržati sigurnosne kopije i kasnije premjestiti trajne podatke u zajedničku bazu.
6. **Ručna provjera:** potrebno je proći stvarni tok od primitka ploče do pilanja, povrata ostatka, prodaje/ugradnje, otpremnice, inventure i otpisa na telefonu i računalu.

## 4. Sljedeće cjeline

- **Cjelina 2 — obračun radnog naloga:** stvarna potrošnja materijala, nabavna cijena, obrada, radni sati, teren, prijevoz, montaža, prodajna cijena, PDV i marža.
- **Cjelina 3 — proizvodnja:** planiranje po pojedinom fizičkom komadu i radnom centru, kapaciteti strojeva, radnici, zastoji i kontrola kvalitete.
- **Cjelina 4 — poslovni tijek:** kupac → ponuda → nalog → proizvodnja → isporuka → račun/uplata → zatvaranje projekta.
- **Cjelina 5 — pristup i rad na više uređaja:** prijava, stvarne uloge, odvajanje tvrtki, sinkronizacija i poslužiteljski revizijski trag.

Ne uvoditi Supabase niti drugi backend bez izričite odluke korisnika.