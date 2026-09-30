#!/bin/sh
# Zamanı gelen e-posta/SMS bildirimlerini gönderir. /etc/cron.d/ravza dakikada bir çağırır.
SECRET=$(grep -E '^CRON_SECRET=' /etc/ravza/ravza.env | cut -d= -f2-)
[ -n "$SECRET" ] || exit 0
curl -fsS -X POST -H "x-cron-secret: $SECRET" http://127.0.0.1:3000/api/cron/notifications >/dev/null
