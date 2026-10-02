import React, { useEffect, useState } from 'react';
import ClickableImage from './ClickableImage.jsx';

function money(n) {
  return `${Number(n || 0).toLocaleString('vi-VN')} đ`;
}

/**
 * Thẻ hiển thị mã QR chuyển khoản khi khách chọn thanh toán bằng "Chuyển khoản".
 *
 * Ảnh QR lấy từ resolvePaymentQrSrc() trong utils/vietqr.js — ưu tiên ảnh QR cố
 * định cửa hàng đã tải lên ở Cài đặt, nếu chưa có mới dựng QR động VietQR.
 *
 * Props:
 *  - src: URL ảnh QR (null/rỗng nếu cửa hàng chưa cấu hình QR)
 *  - amount: số tiền khách cần chuyển
 *  - content: nội dung chuyển khoản (vd: "Thanh toán SO-0001")
 *  - store: kết quả getStoreSettings() — dùng để hiện tên/số tài khoản nếu có
 */
function PaymentQrCard({ src, amount, content, store }) {
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setFailed(false); }, [src]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* trình duyệt chặn clipboard (vd: http, không phải localhost) — bỏ qua, người dùng tự chép */
    }
  };

  if (!src || failed) {
    return (
      <div className="pay-qr-empty">
        {failed
          ? 'Không tải được ảnh QR — kiểm tra lại ảnh QR hoặc thông tin ngân hàng trong Cài đặt > Thông tin cửa hàng.'
          : 'Cửa hàng chưa cấu hình QR nhận thanh toán — vào Cài đặt > Thông tin cửa hàng để thêm ảnh QR.'}
      </div>
    );
  }

  return (
    <div className="pay-qr-card">
      <div className="pay-qr-frame">
        <ClickableImage
          src={src}
          alt="QR chuyển khoản"
          className="pay-qr-img"
        />
        {/* ảnh ẩn để bắt lỗi tải — ClickableImage không có onError */}
        <img src={src} alt="" style={{ display: 'none' }} onError={() => setFailed(true)} />
      </div>

      <div className="pay-qr-info">
        <div className="pay-qr-title">🏦 Quét mã để chuyển khoản</div>
        <div className="pay-qr-amount">{money(amount)}</div>

        {(store?.PaymentQrAccountName || store?.PaymentQrAccountNumber) && (
          <div className="pay-qr-account">
            {store.PaymentQrAccountName && <span>{store.PaymentQrAccountName}</span>}
            {store.PaymentQrAccountNumber && <span className="pay-qr-account-number">{store.PaymentQrAccountNumber}</span>}
          </div>
        )}

        <div className="pay-qr-row">
          <span>Nội dung CK: <strong>{content}</strong></span>
          <button type="button" className="pay-qr-copy" onClick={handleCopy}>
            {copied ? '✓ Đã chép' : 'Sao chép'}
          </button>
        </div>
        <p className="pay-qr-hint">Bấm vào mã QR để phóng to. Chỉ xác nhận khi đã thấy tiền về tài khoản.</p>
      </div>
    </div>
  );
}

export default PaymentQrCard;
