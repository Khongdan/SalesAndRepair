#!/usr/bin/env bash
# =====================================================================
# install-fonts-linux.sh — Cài font Times New Roman THẬT lên Linux.
#
# Windows và macOS đã có sẵn Times New Roman — KHÔNG cần chạy file này.
#
# ⚠️ CÓ CẦN CHẠY FILE NÀY KHÔNG?
# Không bắt buộc. Giao diện web của chương trình (cả màn hình bình thường
# lẫn hóa đơn/phiếu khi in) đã tự hiển thị đúng dáng chữ Times New Roman
# ngay cả khi CHƯA chạy file này, nhờ dùng "Tinos" — font mã nguồn mở của
# Google được thiết kế để có kích thước/khoảng cách chữ GIỐNG HỆT Times New
# Roman (metric-compatible), tự tải qua Google Fonts khi mở trình duyệt.
#
# Chỉ cần chạy file này nếu bạn muốn máy Linux có SẴN font Times New Roman
# "chính chủ" của Microsoft ở cấp hệ điều hành (vd để dùng trong các phần
# mềm khác ngoài trình duyệt, xuất PDF từ công cụ khác...).
#
# CÁCH DÙNG:
#   chmod +x scripts/install-fonts-linux.sh
#   sudo ./scripts/install-fonts-linux.sh
#
# YÊU CẦU: quyền sudo + kết nối internet (tải gói font từ Microsoft/nguồn
# tương đương). Hỗ trợ Debian/Ubuntu (phổ biến nhất); Fedora/RHEL và Arch
# xem ghi chú bên dưới nếu script không nhận diện được trình quản lý gói.
# =====================================================================
set -e

if [[ "$EUID" -ne 0 ]]; then
    echo "❌ Cần quyền quản trị (sudo) để cài font hệ thống. Chạy lại bằng:"
    echo "   sudo ./scripts/install-fonts-linux.sh"
    exit 1
fi

echo "Đang cài font Times New Roman..."

if command -v apt-get >/dev/null 2>&1; then
    # Debian/Ubuntu: gói "ttf-mscorefonts-installer" — chính Microsoft cấp
    # phép tải miễn phí (không phải vi phạm bản quyền), chứa Times New
    # Roman, Arial, Courier New... Tự chấp nhận EULA để không cần bấm tay.
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y
    echo "ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true" | debconf-set-selections
    apt-get install -y ttf-mscorefonts-installer fontconfig

elif command -v dnf >/dev/null 2>&1; then
    # Fedora/RHEL/CentOS: không có sẵn trong repo mặc định — cần bật thêm
    # RPM Fusion (kho cộng đồng phổ biến, không phải kho chính thức Fedora).
    echo "Đang bật kho RPM Fusion (nonfree) để lấy gói font tương thích..."
    dnf install -y "https://download1.rpmfusion.org/nonfree/fedora/rpmfusion-nonfree-release-$(rpm -E %fedora).noarch.rpm" || true
    dnf install -y msttcore-fonts-installer

elif command -v pacman >/dev/null 2>&1; then
    # Arch Linux: gói nằm trong AUR (kho do cộng đồng đóng gói), không cài
    # thẳng bằng pacman được — cần trình trợ giúp AUR như yay/paru.
    echo "⚠️  Trên Arch Linux, script này không tự cài được (gói nằm trong AUR)."
    echo "   Cài bằng: yay -S ttf-ms-fonts   (hoặc trình trợ giúp AUR khác)"
    exit 1

else
    echo "⚠️  Không nhận diện được trình quản lý gói (apt/dnf/pacman)."
    echo "   Vui lòng tìm gói 'ttf-mscorefonts-installer' (hoặc tương đương)"
    echo "   theo hướng dẫn của bản phân phối Linux bạn đang dùng."
    exit 1
fi

fc-cache -f >/dev/null 2>&1 || true

echo "✅ Đã cài xong. Kiểm tra bằng lệnh:  fc-list | grep -i 'times new roman'"
