#!/bin/sh
# Publish the Tonos menu to the Hostinger VPS (pst-vps = 2.24.149.78).  Run from the app folder:  sh scripts/deploy-vps.sh
# Builds the menu, uploads it, and switches all files over at the end (guests never see half an update).
# Safe to repeat. Touches only /srv/sites/tonos on the server. Menu data and admin logins are in Supabase, not here.
set -e
HOST=pst-vps
DEST=/srv/sites/tonos
npm run build
ssh "$HOST" "mkdir -p $DEST/dist"
rsync -az --delete-after --delay-updates dist/ "$HOST:$DEST/dist/"
ssh "$HOST" "chmod -R a+rX $DEST/dist"
# Caddy config for this site (kept in this project: deploy/tonos.caddy). Only applied if it changed.
if ! ssh "$HOST" "cmp -s - /etc/caddy/sites/tonos.caddy" < deploy/tonos.caddy; then
  scp -q deploy/tonos.caddy "$HOST:/etc/caddy/sites/tonos.caddy"
  ssh "$HOST" "caddy validate --config /etc/caddy/Caddyfile >/dev/null 2>&1 && systemctl reload caddy && echo 'web server config updated'"
fi
curl -s -o /dev/null -w "tonos.website: %{http_code}\n" https://tonos.website/ || true
echo "Done. Check https://tonos.website"
