#!/usr/bin/env bash
set -euo pipefail

# ========================================
# BeautyBook Database Backup Script
# Supports: Full, Incremental, and Schema-only backups
# ========================================

BACKUP_DIR="${BACKUP_DIR:-/opt/beautybook/backups}"
DB_URL="${DATABASE_URL:-}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS="${RETENTION_DAYS:-30}"
BACKUP_TYPE="${1:-full}"

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly" "$BACKUP_DIR/monthly"

log() { echo "[$(date +%Y-%m-%dT%H:%M:%S)] $*"; }

backup_full() {
  local file="$BACKUP_DIR/daily/beautybook_full_$TIMESTAMP.sql.gz"
  log "Starting full database backup -> $file"
  pg_dump "$DB_URL" --no-owner --compress=9 --file="$file"
  log "Full backup complete: $(du -h "$file" | cut -f1)"
}

backup_schema() {
  local file="$BACKUP_DIR/daily/beautybook_schema_$TIMESTAMP.sql"
  log "Starting schema-only backup -> $file"
  pg_dump "$DB_URL" --schema-only --no-owner --file="$file"
  gzip -f "$file"
  log "Schema backup complete"
}

backup_data() {
  local file="$BACKUP_DIR/daily/beautybook_data_$TIMESTAMP.sql.gz"
  log "Starting data-only backup -> $file"
  pg_dump "$DB_URL" --data-only --no-owner --compress=9 --file="$file"
  log "Data backup complete"
}

cleanup_old() {
  log "Cleaning up backups older than $RETENTION_DAYS days"
  find "$BACKUP_DIR/daily" -name "*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
  find "$BACKUP_DIR/daily" -name "*.sql.gz" -mtime +7 -exec mv {} "$BACKUP_DIR/weekly/" \; 2>/dev/null || true
  find "$BACKUP_DIR/weekly" -name "*.sql.gz" -mtime +60 -exec mv {} "$BACKUP_DIR/monthly/" \; 2>/dev/null || true
  find "$BACKUP_DIR/monthly" -name "*.sql.gz" -mtime +365 -delete
  log "Cleanup complete"
}

case "$BACKUP_TYPE" in
  full)
    backup_full
    backup_schema
    ;;
  schema)
    backup_schema
    ;;
  data)
    backup_data
    ;;
  *)
    echo "Usage: $0 {full|schema|data}"
    exit 1
    ;;
esac

cleanup_old
log "Backup process completed successfully"
