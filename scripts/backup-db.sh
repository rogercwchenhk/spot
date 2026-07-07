#!/usr/bin/env bash
# Database backup script for Supabase
# Requires: pg_dump, SUPABASE_DB_URL
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/customer_radar_${TIMESTAMP}.sql.gz"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL not set"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"

if [ -f "$BACKUP_FILE" ]; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "[$(date)] Backup complete: $BACKUP_FILE ($SIZE)"
else
  echo "[$(date)] ERROR: Backup file not created"
  exit 1
fi

# Cleanup old backups (keep last 7)
if [ "${KEEP_COUNT:-7}" -gt 0 ]; then
  ls -1t ${BACKUP_DIR}/customer_radar_*.sql.gz 2>/dev/null | tail -n +$((KEEP_COUNT + 1)) | xargs -r rm -f
  echo "[$(date)] Cleaned up old backups, keeping last $KEEP_COUNT"
fi
