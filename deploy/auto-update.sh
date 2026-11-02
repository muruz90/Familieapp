#!/usr/bin/env bash
# Køres hver nat af cron (se install.sh): opdaterer kun, hvis der er en ny version på GitHub.
# Fejler bygningen, kører den gamle version videre.
set -euo pipefail
DIR="${DIR:-/opt/familie-app}"
cd "$DIR"
git fetch -q origin
if [ "$(git rev-parse HEAD)" = "$(git rev-parse '@{u}')" ]; then
  exit 0
fi
echo "$(date '+%F %T') Ny version fundet, opdaterer"
bash "$DIR/deploy/install.sh"
