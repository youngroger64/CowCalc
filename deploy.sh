#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
git pull --ff-only origin main
sudo mkdir -p /var/www/cowcalc
sudo rsync -av --delete \
  --exclude='.git/' \
  --exclude='.venv/' \
  --exclude='*.bak' \
  --exclude='__pycache__/' \
  --exclude='*.pyc' \
  ./ /var/www/cowcalc/
sudo chown -R nginx:nginx /var/www/cowcalc
sudo find /var/www/cowcalc -type d -exec chmod 755 {} \;
sudo find /var/www/cowcalc -type f -exec chmod 644 {} \;
sudo nginx -t
sudo systemctl reload nginx
echo "CowCalc deployed successfully."
