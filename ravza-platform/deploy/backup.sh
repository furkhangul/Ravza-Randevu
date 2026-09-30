#!/bin/sh
# Veritabanının tutarlı bir kopyasını alır ve 14 günden eski yedekleri siler.
# /etc/cron.d/ravza her gece 03:30'da çağırır.
set -eu
DEST=/var/backups/ravza
mkdir -p "$DEST"
FILE="$DEST/ravza-$(date +%Y%m%d-%H%M).db"
sqlite3 /var/lib/ravza/ravza.db ".backup '$FILE'"
gzip "$FILE"
find "$DEST" -name 'ravza-*.db.gz' -mtime +14 -delete
