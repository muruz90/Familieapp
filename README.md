# Familie-app

Webapp til familien: eget login til alle, opgaver og lommepenge, opskrifter, madplan med samlet indkøbsliste og en familiekalender som iPhone/iPad kan abonnere på.

## Funktioner

- **Login og roller**: Forældre opretter familiemedlemmer under *Familie*. Børn ser kun egne opgaver og eget regnskab.
- **Opgaver**: Forældre opretter opgaver med beløb (én gang, dagligt eller ugentligt). Barnet trykker *Færdig*, og en forælder godkender. Godkendte opgaver bliver til en optjening.
- **Lommepenge**: Pr. barn vises tjent i alt, udbetalt i alt og saldo. Forældre registrerer udbetalinger, bonus og korrektioner.
- **Opskrifter og madplan**: Opskrifter med ingredienser (mængde + enhed). Retter lægges på ugens dage med valgfrit antal personer.
- **Indkøbsliste**: Ugens retter lægges sammen og skaleres efter antal personer. g/kg og ml/dl/l omregnes, så fx 500 g + 0,4 kg bliver til 900 g. Afkrydsning og ekstra varer.
- **Kalender**: Fælles kalender. Under *Kalender* er et hemmeligt abonnementslink (webcal), som iPhone/iPad kan abonnere på.

## Udvikling

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # enhedstest af indkøbsliste, beløb og kalenderfeed
```

Data ligger i SQLite i `data/familie.db` (sti kan ændres med `DATA_DIR`).

## Drift på serveren

Serveren kører Apache (bruges også af andre sites). Installation og opdatering, som root på serveren:

```bash
curl -fsSL https://raw.githubusercontent.com/muruz90/Familieapp/main/deploy/install.sh -o install.sh
bash install.sh
```

Scriptet installerer Docker hvis nødvendigt, henter koden til `/opt/familie-app`, starter appen på
`127.0.0.1:3100` (eller næste ledige port, gemt i `.env`), tilføjer et nyt Apache-site for
`familie.goblinaiapp.com` (eksisterende sites røres ikke, og `apache2ctl configtest` køres før reload)
og opretter en daglig backup i `/opt/familie-app/data/backup`.

Opret en DNS A-record `familie` → serverens IP (DNS ligger hos Hetzner), og hent derefter et certifikat:
`certbot --apache -d familie.goblinaiapp.com`.

Første gang siden åbnes, oprettes den første forælder.

**Opdatering**: `bash /opt/familie-app/deploy/install.sh`
