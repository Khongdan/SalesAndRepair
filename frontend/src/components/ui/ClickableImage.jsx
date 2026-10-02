import React, { useState } from 'react';

/**
 * Bọc quanh 1 ảnh thu nhỏ (thumbnail) để bấm vào xem được bản phóng to.
 * Dùng chung cho mọi nơi hiển thị ảnh sản phẩm/linh kiện trong ứng dụng
 * (bảng danh sách, trang công khai quét QR...).
 *
 * Cách dùng:
 *   <ClickableImage src={p.ImageURL} alt={p.ProductName} className="product-thumb" />
 */
function ClickableImage({ src, alt, className }) {
  const [open, setOpen] = useState(false);
  if (!src) return null;

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={className}
        style={{ cursor: 'zoom-in' }}
        onClick={() => setOpen(true)}
      />
      {open && (
        <div className="lightbox-overlay" onClick={() => setOpen(false)}>
          <button
            type="button"
            className="lightbox-close"
            onClick={() => setOpen(false)}
            aria-label="Đóng"
          >
            ✕
          </button>
          <img src={src} alt={alt} className="lightbox-image" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}

export default ClickableImage;
