#!/usr/bin/env bash
# Installerer eller opdaterer familie-appen på en Ubuntu-server med Apache.
# Kør som root:  bash install.sh
# Rører ikke eksisterende Apache-sites; tilføjer kun et nyt site for $DOMAIN.
# Alt ligger i main(), så scriptet også virker med "curl ... | bash".
main() {
set -euo pipefail

DOMAIN="${DOMAIN:-familie.goblinaiapp.com}"
DIR="${DIR:-/opt/familie-app}"
REPO="https://github.com/muruz90/Familieapp.git"
SITE="/etc/apache2/sites-available/familie-app.conf"

say() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31mFEJL: %s\033[0m\n' "$*"; exit 1; }

[ "$(id -u)" -eq 0 ] || fail "Kør scriptet som root (sudo bash install.sh)."
command -v apache2ctl >/dev/null || fail "Apache blev ikke fundet. Stop her og spørg Claude."

say "Installerer Docker og git (hvis de mangler)"
if ! command -v docker >/dev/null || ! docker compose version >/dev/null 2>&1 || ! command -v git >/dev/null; then
  apt-get update -q
  apt-get install -y -q docker.io docker-compose-v2 git
fi
systemctl enable --now docker >/dev/null

say "Henter koden til $DIR"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" pull --ff-only
else
  git clone "$REPO" "$DIR"
fi
cd "$DIR"

# Port og adresse gemmes i .env (ikke i git), så "git pull" altid virker.
if [ -f .env ] && grep -q '^FAMILIE_PORT=' .env; then
  PORT=$(grep '^FAMILIE_PORT=' .env | cut -d= -f2)
else
  PORT=3100
  while ss -ltn "( sport = :$PORT )" | grep -q LISTEN; do PORT=$((PORT + 1)); done
fi
printf 'FAMILIE_PORT=%s\nAPP_URL=https://%s\n' "$PORT" "$DOMAIN" > .env

say "Bygger og starter appen (første gang tager det et par minutter)"
docker compose up -d --build

for _ in $(seq 1 30); do
  curl -s -o /dev/null "http://127.0.0.1:$PORT/login" && break
  sleep 2
done
curl -s -o /dev/null "http://127.0.0.1:$PORT/login" || fail "Appen svarer ikke på port $PORT. Se: docker compose logs"
echo "Appen kører på 127.0.0.1:$PORT"

say "Sætter Apache op for $DOMAIN"
a2enmod -q proxy proxy_http headers ssl >/dev/null

# Find det certifikat, de eksisterende sites bruger, og genbrug det, hvis det dækker $DOMAIN.
CERT=""; KEY=""
while read -r conf; do
  [ "$conf" = "$SITE" ] && continue
  c=$(grep -hoP '^\s*SSLCertificateFile\s+\K\S+' "$conf" | head -1 || true)
  k=$(grep -hoP '^\s*SSLCertificateKeyFile\s+\K\S+' "$conf" | head -1 || true)
  if [ -n "$c" ] && [ -f "$c" ] && openssl x509 -noout -ext subjectAltName -in "$c" 2>/dev/null \
      | grep -qE "DNS:(\*\.${DOMAIN#*.}|$DOMAIN)(,|$)"; then
    CERT="$c"; KEY="${k:-$c}"; break
  fi
done < <(grep -rl SSLCertificateFile /etc/apache2/sites-enabled/ 2>/dev/null || true)

PROXY="    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:$PORT/
    ProxyPassReverse / http://127.0.0.1:$PORT/
    RequestHeader set X-Forwarded-Host \"$DOMAIN\"
    RequestHeader set X-Forwarded-Proto \"https\""

if [ -n "$CERT" ]; then
  echo "Genbruger certifikatet $CERT (dækker $DOMAIN)"
  SELF_SIGNED=0
else
  # Intet eksisterende certifikat dækker domænet: lav et selvsigneret, som Cloudflare (SSL "Full") accepterer.
  CERT=/etc/ssl/certs/familie-app.crt; KEY=/etc/ssl/private/familie-app.key
  [ -f "$CERT" ] || openssl req -x509 -newkey rsa:2048 -nodes -days 3650 -subj "/CN=$DOMAIN" \
    -addext "subjectAltName=DNS:$DOMAIN" -keyout "$KEY" -out "$CERT" 2>/dev/null
  chmod 600 "$KEY"
  echo "Lavede et selvsigneret certifikat til $DOMAIN"
  SELF_SIGNED=1
fi

cat > "$SITE" <<EOF
<VirtualHost *:80>
    ServerName $DOMAIN
$PROXY
</VirtualHost>
<VirtualHost *:443>
    ServerName $DOMAIN
    SSLEngine on
    SSLCertificateFile $CERT
    SSLCertificateKeyFile $KEY
$PROXY
</VirtualHost>
EOF

a2ensite -q familie-app >/dev/null
if ! apache2ctl configtest 2>/dev/null; then
  a2dissite -q familie-app >/dev/null
  apache2ctl configtest
  fail "Apache-opsætningen fejlede, så det nye site er slået fra igen. Intet andet er ændret."
fi
systemctl reload apache2

say "Daglig backup af databasen (gemmes i 30 dage)"
cat > /etc/cron.d/familie-app <<EOF
30 3 * * * root mkdir -p $DIR/data/backup && docker exec familie-app node -e "require('better-sqlite3')('/data/familie.db').backup('/data/backup/familie-'+new Date().toISOString().slice(0,10)+'.db')" && find $DIR/data/backup -name 'familie-*.db' -mtime +30 -delete
EOF

say "Færdig"
echo "Appen kører i Docker på port $PORT, og Apache sender $DOMAIN videre til den."
echo "Mangler: DNS-record i Cloudflare: A  ${DOMAIN%%.*}  167.233.208.191  (Proxied)."
if [ "$SELF_SIGNED" = 1 ]; then
  echo
  echo "Bemærk: Der bruges et selvsigneret certifikat mellem Cloudflare og serveren."
  echo "Det virker, når Cloudflare står på SSL/TLS-tilstand 'Full'. Står den på 'Full (strict)', så sig det til Claude."
fi
echo
echo "Opdatering senere:  bash $DIR/deploy/install.sh"
}

main "$@" </dev/null
