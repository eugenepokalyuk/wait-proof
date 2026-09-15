#!/bin/sh
# Ежедневный дамп базы в /backups (на хосте — /var/backups/wait-proof).
# Формат custom (-Fc): сжат и восстанавливается выборочно через pg_restore.
set -eu

KEEP_DAYS=14
export PGPASSWORD="${DB_PASSWORD}"

while :; do
  stamp=$(date +%F)
  if pg_dump -h db -U "${DB_USER:-waitproof}" -Fc "${DB_NAME:-waitproof}" > "/backups/db-$stamp.dump.tmp"; then
    mv "/backups/db-$stamp.dump.tmp" "/backups/db-$stamp.dump"
    echo "бэкап $stamp готов"
  else
    rm -f "/backups/db-$stamp.dump.tmp"
    echo "бэкап $stamp не удался" >&2
  fi
  find /backups -name 'db-*.dump' -mtime +$KEEP_DAYS -delete
  sleep 86400
done
