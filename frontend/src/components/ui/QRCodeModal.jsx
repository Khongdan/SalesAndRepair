import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import Modal from './Modal.jsx';

/**
 * Modal hiển thị mã QR cho 1 sản phẩm/linh kiện. Mã QR mã hoá đường dẫn tới
 * trang công khai (không cần đăng nhập) hiển thị thông tin món hàng đó —
 * người bán dán mã này lên sản phẩm/xe, khách chỉ cần dùng camera điện
 * thoại quét là mở được trang thông tin ngay.
 *
 * QUAN TRỌNG: đường dẫn QR dùng `window.location.origin` (domain hiện tại
 * trình duyệt đang chạy) thay vì domain viết cứng — để mã QR luôn trỏ đúng
 * dù ứng dụng đang chạy ở localhost, IP mạng LAN hay domain thật khi đã
 * triển khai thực tế.
 *
 * Props:
 *  - itemType: 'products' | 'components' — quyết định đường dẫn trang công khai
 *  - code: mã sản phẩm/linh kiện (vd: SP001, LK001)
 *  - name: tên hiển thị trong modal
 */
function QRCodeModal({ itemType, code, name, onClose }) {
  const canvasRef = useRef(null);
  const [publicUrl, setPublicUrl] = useState('');

  useEffect(() => {
    const url = `${window.location.origin}/scan/${itemType}/${encodeURIComponent(code)}`;
    setPublicUrl(url);
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 240, margin: 2 }, () => {});
    }
  }, [itemType, code]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `qr-${code}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handlePrint = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const printWindow = window.open('', '_blank', 'width=420,height=520');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head><title>In mã QR — ${code}</title></head>
        <body style="text-align:center; font-family: 'Times New Roman', Times, serif; padding: 24px;">
          <img src="${dataUrl}" style="width:240px;height:240px;" />
          <p style="font-size:16px; font-weight:700; margin-top:8px;">${name || ''}</p>
          <p style="font-size:13px; color:#555;">${code}</p>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Modal title={`Mã QR — ${name || code}`} onClose={onClose} width={380}>
      <div className="qr-code-box">
        <canvas ref={canvasRef} />
        <div className="qr-code-meta">{publicUrl}</div>
        <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>
          Dán mã này lên sản phẩm/xe — khách chỉ cần mở camera điện thoại quét là xem
          được thông tin sản phẩm, không cần cài thêm ứng dụng nào.
        </p>
        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={handlePrint}>🖨️ In</button>
          <button type="button" className="btn-primary" onClick={handleDownload}>⬇️ Tải ảnh QR</button>
        </div>
      </div>
    </Modal>
  );
}

export default QRCodeModal;
