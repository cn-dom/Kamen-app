# Cloudflare D1 — zajednička pohrana Kamen-app

## Cilj
Uvesti poslužiteljsku pohranu za više uređaja i više tvrtki, bez izravnog pristupa bazi iz preglednika. Svaki zapis i svako skladišno kretanje mora biti vezano uz `company_id`; Worker provjerava identitet i članstvo prije čitanja ili izmjene.

## Prva migracija
`migrations/0001_initial_schema.sql` stvara:
- tvrtke i članstva s ulogama vlasnik, voditelj i radnik;
- generičke poslovne zapise po tipu (radni nalozi, zalihe, proizvodnja, postavke, strojevi itd.) uz verzioniranje;
- zaseban dnevnik skladišnih kretanja i idempotency ključeve za sprječavanje dvostrukog knjiženja;
- neizmjenjiv trag promjena;
- metapodatke učitanih dokumenata. Same datoteke idu u R2, ne u D1.

## Sigurnosna pravila
1. D1 binding postoji samo na Cloudflare Workeru; frontend nikada ne dobiva D1 credentials.
2. Worker mora provjeriti potpis i issuer Cloudflare Access JWT-a, zatim aktivno članstvo korisnika u konkretnoj tvrtki.
3. Svaki SQL upit mora filtrirati po `company_id` iz provjerenog članstva, nikada po vrijednosti koju klijent sam pošalje bez provjere.
4. Uloge i ovlasti provjeravaju se na poslužitelju. Skriveni gumbi u Reactu nisu sigurnosna kontrola.
5. Skladišna promjena, zapis kretanja i idempotency ključ moraju se potvrditi u jednoj D1 batch transakciji.
6. Migracija iz localStorage mora prvo napraviti sigurnosnu kopiju i pregled prije uvoza; lokalni podaci se ne brišu automatski.

## Stanje
D1 baza `kamen-app-staging` je stvorena kao prazno razvojno okruženje. Ova migracija još nije primijenjena, a produkcijski Worker još nije povezan. Prije produkcijskog prebacivanja treba implementirati API, identitet/prijavu, članstva i testirati migraciju podataka na stagingu.
