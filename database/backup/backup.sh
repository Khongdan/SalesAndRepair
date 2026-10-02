#!/usr/bin/env bash
# =====================================================================
# backup.sh — Chạy sao lưu SalesRepairDB tự động qua sqlcmd (Linux/macOS).
# Bản tương đương backup.bat (Windows) — dùng cùng với cron để backup
# HÀNG NGÀY mà không cần mở máy lên chạy tay. Xem hướng dẫn đặt lịch cron
# trong README.md cùng thư mục này.
#
# YÊU CẦU: đã cài sqlcmd trên máy chạy script này (không nhất thiết phải là
# máy đang chạy SQL Server — sqlcmd có thể kết nối tới server ở máy khác qua
# mạng). Cài sqlcmd trên Linux — xem README.md.
# =====================================================================
set -euo pipefail

# ---- 1) SỬA CÁC DÒNG NÀY CHO ĐÚNG MÔI TRƯỜNG BẠN --------------------------
SERVER="localhost"
BACKUP_FOLDER="/var/backups/SalesRepairDB"   # ⚠️ Phải TRÙNG với @BackupFolder trong backup.sql
KEEP_DAYS=30

# Trên Linux hầu như luôn cần SQL Login (username/mật khẩu) vì không có
# Windows Authentication. Điền thông tin đăng nhập SQL Server ở đây (giống
# thông tin trong backend/.env của phần mềm).
SQLUSER="sa"
SQLPASSWORD="your_password"
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p "$BACKUP_FOLDER"

echo "Đang sao lưu SalesRepairDB..."

if ! sqlcmd -S "$SERVER" -U "$SQLUSER" -P "$SQLPASSWORD" -i "$SCRIPT_DIR/backup.sql"; then
    echo "❌ Sao lưu THẤT BẠI. Kiểm tra lại kết nối SQL Server / đường dẫn." >&2
    exit 1
fi

echo "Xóa các file backup cũ hơn $KEEP_DAYS ngày..."
find "$BACKUP_FOLDER" -name "*.bak" -type f -mtime +"$KEEP_DAYS" -delete 2>/dev/null || true

echo "✅ Hoàn tất sao lưu SalesRepairDB."
