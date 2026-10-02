# Hướng dẫn sao lưu (backup) dữ liệu

Toàn bộ dữ liệu của cửa hàng (khách hàng, đơn hàng, phiếu sửa chữa, bảo hành,
công nợ...) đang nằm trong 1 database SQL Server duy nhất (`SalesRepairDB`)
trên máy chủ. **Nếu máy đó hỏng ổ cứng, bị virus, hoặc bị mất/hỏng mà không
có bản sao lưu, toàn bộ dữ liệu sẽ mất vĩnh viễn.** Phần này hướng dẫn sao
lưu định kỳ để tránh rủi ro đó — dùng được cho dù SQL Server của bạn chạy
trên **Windows** hay **Linux**.

## ❓ `backup.sql` và `restore.sql` có bắt buộc chạy trong SSMS không?

**Không bắt buộc.** Hai file này là **T-SQL thuần túy** — chỉ là câu lệnh
SQL, không có gì ràng buộc riêng với SSMS cả. Có 2 cách chạy, chọn cách nào
tiện hơn:

1. **Qua giao diện (GUI)** — mở file bằng **SSMS** (chỉ có trên Windows) hoặc
   **Azure Data Studio** (chạy được cả Windows/Linux/macOS), rồi bấm
   Execute/F5. Phù hợp khi muốn chạy tay, xem trực tiếp kết quả.
2. **Qua dòng lệnh bằng `sqlcmd`** — công cụ chính thức của Microsoft, có
   bản cho **cả Windows lẫn Linux/macOS** (không cần SSMS). Đây là cách 2
   script tự động `backup.bat`/`backup.sh` trong thư mục này dùng để chạy
   ngầm, không cần mở giao diện nào cả:
   ```
   sqlcmd -S <server> -U <user> -P <mật khẩu> -i backup.sql
   ```

Nói cách khác: SSMS chỉ là 1 trong nhiều cách để *mở và bấm chạy* file SQL —
không phải yêu cầu bắt buộc. Nếu máy chủ của bạn chạy Linux (không cài được
SSMS), dùng Azure Data Studio hoặc `sqlcmd` là đủ.

**Cài `sqlcmd` trên Linux** (nếu chưa có, cần cho cách tự động ở dưới):
- Ubuntu/Debian: xem hướng dẫn cài `mssql-tools18` chính thức của Microsoft tại `learn.microsoft.com` (tìm "sqlcmd Linux install"), hoặc
- Cách mới, gọn hơn: cài `go-sqlcmd` — `curl -sSL https://aka.ms/sqlcmd-install.sh | sudo bash` (script cài chính thức của Microsoft).

## Cách 1 — Sao lưu tay (đơn giản, làm ngay được)

Dùng khi bạn muốn sao lưu ngay lập tức (vd: trước khi cập nhật phần mềm,
hoặc trước khi thử tính năng mới).

- **Windows**: mở **SSMS** → chuột phải database `SalesRepairDB` → **Tasks** → **Back Up...** → chọn nơi lưu file `.bak` → **OK**.
- **Windows hoặc Linux**: mở `backup.sql` bằng SSMS/Azure Data Studio (nhanh hơn thao tác chuột ở trên) — chỉ cần sửa đường dẫn thư mục lưu ở đầu file trước khi chạy (xem ví dụ đường dẫn Windows/Linux ngay trong file).

## Cách 2 — Tự động sao lưu mỗi ngày (khuyên dùng)

Cách 1 dễ bị quên. Cách này giúp máy **tự sao lưu mỗi đêm** mà không cần ai
phải nhớ để làm tay. Có 2 file — **dùng đúng 1 file theo hệ điều hành của
máy đang chạy SQL Server**:

| Máy chủ SQL Server chạy trên | Dùng file |
|---|---|
| Windows | `backup.bat` + **Task Scheduler** |
| Linux / macOS | `backup.sh` + **cron** |

Cả hai đều gọi `backup.sql` để backup, rồi tự xóa file `.bak` cũ hơn số ngày
quy định — không có SQL Server Agent cũng dùng được (kể cả bản SQL Server
Express miễn phí).

### Windows — `backup.bat` + Task Scheduler

**Bước 1 — Chỉnh cấu hình:** mở `backup.bat` bằng Notepad, sửa 3 dòng đầu:
```bat
set SERVER=localhost
set BACKUP_FOLDER=C:\SalesRepairBackups
set KEEP_DAYS=30
```
- `SERVER`: tên server SQL Server (thường `localhost` nếu chạy cùng máy).
- `BACKUP_FOLDER`: thư mục lưu file backup — **nên là ổ đĩa khác** với ổ cài SQL Server. ⚠️ Phải sửa **giống hệt** đường dẫn `@BackupFolder` trong `backup.sql`.
- `KEEP_DAYS`: số ngày giữ lại backup cũ, quá hạn tự xóa (mặc định 30 ngày).

Nếu SQL Server đăng nhập bằng **SQL Login** (user `sa` + mật khẩu, không phải Windows Authentication), bỏ dấu `REM` ở 2 dòng `SQLUSER`/`SQLPASSWORD` và điền vào (giống thông tin trong `backend/.env`).

**Bước 2 — Đặt lịch bằng Task Scheduler:**
1. Mở **Task Scheduler** (gõ vào ô tìm kiếm Windows).
2. **Create Task...** (không chọn "Create Basic Task" để có đủ tùy chọn).
3. Tab **General**: đặt tên vd `Backup SalesRepairDB`. Tick **Run whether user is logged on or not**.
4. Tab **Triggers** → **New...** → **Daily**, đặt giờ ít dùng máy (vd 23:00 hoặc 2:00 sáng).
5. Tab **Actions** → **New...** → **Program/script**: trỏ tới đường dẫn đầy đủ `backup.bat` (vd `D:\sales-repair-management\database\backup\backup.bat`).
6. **OK**, nhập mật khẩu tài khoản Windows khi được hỏi.

### Linux / macOS — `backup.sh` + cron

**Bước 1 — Chỉnh cấu hình:** mở `backup.sh` bằng trình soạn thảo bất kỳ (nano, VS Code...), sửa các dòng đầu:
```bash
SERVER="localhost"
BACKUP_FOLDER="/var/backups/SalesRepairDB"
KEEP_DAYS=30
SQLUSER="sa"
SQLPASSWORD="your_password"
```
⚠️ `BACKUP_FOLDER` phải sửa **giống hệt** đường dẫn `@BackupFolder` trong `backup.sql` (kiểu Linux, vd `/var/opt/mssql/backups/`).

Cấp quyền chạy cho file (chỉ cần làm 1 lần):
```bash
chmod +x backup.sh
```

**Bước 2 — Đặt lịch bằng cron:**
```bash
crontab -e
```
Thêm 1 dòng (chạy mỗi ngày lúc 2:00 sáng — sửa giờ nếu muốn):
```
0 2 * * * /đường/dẫn/đầy/đủ/tới/database/backup/backup.sh >> /var/log/salesrepair-backup.log 2>&1
```
Lưu lại là xong — cron sẽ tự chạy `backup.sh` đúng giờ mỗi ngày. Dòng `>> ... 2>&1` ghi lại log để kiểm tra sau này nếu backup lỗi.

**Kiểm tra đã chạy đúng chưa** (cả 2 hệ điều hành): hôm sau mở thư mục
`BACKUP_FOLDER`, phải thấy 1 file `.bak` mới với tên có ngày giờ hôm đó (vd
`SalesRepairDB_20260115_020000.bak`).

## Nên sao lưu ở đâu?

Quy tắc kinh điển **"3-2-1"**: giữ ít nhất 3 bản sao, trên 2 loại thiết bị
khác nhau, và ít nhất 1 bản **ở nơi khác** (không cùng chỗ với máy chính) —
để nếu máy chính bị cháy/trộm/hỏng đồng thời với ổ cứng backup gắn liền thì
vẫn còn dữ liệu. Cách dễ làm nhất với 1 cửa hàng nhỏ:

- Backup vào ổ đĩa thứ 2 trong máy (khác ổ cài SQL Server) — chống hỏng 1 ổ cứng.
- **Đồng bộ thêm** thư mục backup đó lên Google Drive/OneDrive (Windows: cài app đồng bộ trỏ vào `BACKUP_FOLDER`; Linux: dùng `rclone` đồng bộ định kỳ) — chống mất/hỏng cả máy, cháy nổ, trộm.
- Thỉnh thoảng (vd đầu tháng) copy 1 file `.bak` mới nhất ra USB rời cất riêng.

## Khôi phục dữ liệu khi cần

Khi cần khôi phục (máy mới, dữ liệu bị lỗi...), dùng file `restore.sql`
trong thư mục này — chạy được theo đúng 2 cách đã nói ở mục hỏi-đáp phía
trên (SSMS/Azure Data Studio, hoặc `sqlcmd -i restore.sql`):

1. Sửa `@BackupFile` thành đường dẫn file `.bak` muốn khôi phục (đúng kiểu Windows/Linux tùy máy đang chạy SQL Server).
2. Chạy.

⚠️ Khôi phục sẽ **ghi đè toàn bộ dữ liệu hiện tại** bằng dữ liệu trong file
backup — chỉ chạy khi chắc chắn cần thiết, và nên tự backup dữ liệu hiện tại
(nếu còn dùng được) trước khi khôi phục đè lên, phòng trường hợp chọn nhầm
file.

## Danh sách file trong thư mục này

| File | Dùng để | Hệ điều hành |
|------|---------|--------------|
| `backup.sql` | Script T-SQL sao lưu 1 lần — chạy tay hoặc được gọi tự động bởi `backup.bat`/`backup.sh` | Cả hai |
| `backup.bat` | Script tự động gọi `backup.sql` + xóa backup cũ — dùng với Task Scheduler | Windows |
| `backup.sh` | Bản tương đương `backup.bat` — dùng với cron | Linux / macOS |
| `restore.sql` | Script khôi phục database từ 1 file `.bak` | Cả hai |
