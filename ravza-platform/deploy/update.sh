#!/bin/sh
# Yeni sürümü yayınlar: kodu çeker, derler, veritabanı göçlerini uygular, yeniden başlatır.
# Kullanım: sudo /opt/ravza/app/deploy/update.sh
set -eu
cd /opt/ravza/app
sudo -u ravza git pull --ff-only
sudo -u ravza npm ci
sudo -u ravza npm run build
/opt/ravza/app/deploy/backup.sh
sudo -u ravza env DATABASE_PATH=/var/lib/ravza/ravza.db node scripts/migrate.mjs
systemctl restart ravza
sleep 2
systemctl --no-pager --lines=5 status ravza
