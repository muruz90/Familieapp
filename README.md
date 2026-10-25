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

## Drift på serveren (Docker)

```bash
git clone https://github.com/muruz90/Familieapp.git familie-app
cd familie-app
docker compose up -d --build
```

Appen lytter på `127.0.0.1:3100`. Sæt en reverse proxy foran, fx nginx:

```nginx
server {
    listen 80;
    server_name familie.goblinaiapp.com;
    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

eller Caddy: `familie.goblinaiapp.com { reverse_proxy 127.0.0.1:3100 }`

I Cloudflare: opret en A-record `familie` → serverens IP (proxied, SSL-tilstand *Full*).

Første gang siden åbnes, oprettes den første forælder.

**Backup**: kopiér mappen `data/` (fx dagligt med cron).

**Opdatering**: `git pull && docker compose up -d --build`
