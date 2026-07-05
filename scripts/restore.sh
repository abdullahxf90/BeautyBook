#!/usr/bin/env bash
set -euo pipefail

# ========================================
# BeautyBook Database Restore Script
# ========================================

BACKUP_FILE="${1:-}"
DB_URL="${DATABASE_URL:-}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file.sql.gz>"
  echo "Available backups:"
  ls -lh /opt/beautybook/backups/daily/ 2>/dev/null || echo "No backups found"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "[$(date +%Y-%m-%dT%H:%M:%S)] Starting restore from: $BACKUP_FILE"
echo "WARNING: This will overwrite the existing database!"
read -p "Are you sure? (type 'yes' to confirm): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled"
  exit 0
fi

if [[ "$BACKUP_FILE" == *.gz ]]; then
  gunzip -c "$BACKUP_FILE" | psql "$DB_URL"
else
  psql "$DB_URL" < "$BACKUP_FILE"
fi

echo "[$(date +%Y-%m-%dT%H:%M:%S)] Restore complete!"
