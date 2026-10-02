@echo off
REM =====================================================================
REM backup.bat — Chạy sao lưu SalesRepairDB tự động qua sqlcmd.
REM Dùng file này với Windows Task Scheduler để backup HÀNG NGÀY mà không
REM cần mở máy tính/SSMS lên. Xem hướng dẫn đặt lịch trong README.md cùng
REM thư mục này.
REM =====================================================================

REM ---- 1) SỬA 3 DÒNG NÀY CHO ĐÚNG MÁY BẠN --------------------------------
set SERVER=localhost
set BACKUP_FOLDER=C:\SalesRepairBackups
set KEEP_DAYS=30
REM Nếu SQL Server dùng SQL Login (sa) thay vì Windows Authentication,
REM bỏ dấu REM ở 2 dòng dưới và điền user/mật khẩu:
REM set SQLUSER=sa
REM set SQLPASSWORD=your_password
REM -------------------------------------------------------------------------

if not exist "%BACKUP_FOLDER%" mkdir "%BACKUP_FOLDER%"

echo Dang sao luu SalesRepairDB...

if defined SQLUSER (
    sqlcmd -S %SERVER% -U %SQLUSER% -P %SQLPASSWORD% -i "%~dp0backup.sql"
) else (
    sqlcmd -S %SERVER% -E -i "%~dp0backup.sql"
)

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Sao luu THAT BAI. Kiem tra lai ket noi SQL Server / duong dan.
    exit /b 1
)

echo Xoa cac file backup cu hon %KEEP_DAYS% ngay...
forfiles /p "%BACKUP_FOLDER%" /m *.bak /d -%KEEP_DAYS% /c "cmd /c del @path" 2>nul

echo ✅ Hoan tat sao luu SalesRepairDB.
