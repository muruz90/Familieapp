# Familie-app

Webapp til familien: eget login til alle, opgaver og lommepenge, opskrifter, madplan med samlet indkøbsliste og en familiekalender som iPhone/iPad kan abonnere på.

## Funktioner

- **Login og roller**: Forældre opretter familiemedlemmer under *Familie*. Børn ser kun egne opgaver og eget regnskab.
- **Opgaver**: Forældre opretter opgaver med beløb (én gang, dagligt eller ugentligt). Barnet trykker *Færdig*, og en forælder godkender. Godkendte opgaver bliver til en optjening.
- **Lommepenge**: Pr. barn vises tjent i alt, udbetalt i alt og saldo. Forældre registrerer udbetalinger, bonus og korrektioner.
- **Opskrifter og madplan**: Opskrifter med ingredienser (mængde + enhed). Retter lægges på ugens dage med valgfrit antal personer.
- **Indkøbsliste**: Ugens retter lægges sammen og skaleres efter antal personer. g/kg og ml/dl/l omregnes, så fx 500 g + 0,4 kg bliver til 900 g. Afkrydsning og ekstra varer.
- **Kalender**: Fælles kalender. Under *Kalender* er et hemmeligt abonnementslink (webcal), som iPhone/iPad kan abonnere på.
- **Sparemål**: Børn (og forældre) opretter sparemål under *Lommepenge*; bjælken fyldes af saldoen.
- **Gentagne aftaler**: Hver uge, hver 2. uge eller hver måned, evt. med slutdato. Sendes som RRULE i kalender-feedet.
- **Madplan-genveje**: *Kopiér sidste uge* og *Overrask mig* (fylder ugens tomme dage fra i dag med retter, I ikke har spist længe).
- **Backup**: Natlig backup på serveren (30 dage) og *Hent backup* under *Familie*, så en kopi kan ligge et andet sted. Serveren opdaterer sig selv kl. 4.15, når der er en ny version på GitHub (deploy/auto-update.sh).
- **Live indkøbsliste**: Siden henter flueben hvert 4. sekund, så flere telefoner er enige i butikken. Andre forældre får besked om nye ekstra varer.
- **Streaks og ugens stjerne**: Dage i træk med opgaver (🔥) og ugens stjerne (flest godkendte opgaver). Valgfri streak-bonus under *Opgaver*.
- **Opskriftsbilleder**: Billedet gøres mindre i telefonen (højst 1600 px) og gemmes i data/billeder.
- **Huskeliste**: Faste ting på valgte ugedage vises på barnets forside med flueben; besked kl. 7.
- **Notifikationer**: Web Push slås til pr. enhed under *Profil* (tryk på dit navn øverst). Besked ved ny opgave, opgave der venter på godkendelse, godkendelse/afvisning, udbetaling/bonus, ny aftale og 1 time før en aftale. På iPhone/iPad (iOS 16.4+) kun når appen er lagt på hjemmeskærmen. VAPID-nøglerne laves automatisk og gemmes i databasen.

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
