import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const PrintContext = createContext(null);

/**
 * PrintProvider — hạ tầng chung để "in hóa đơn" / "in phiếu sửa chữa - bảo hành".
 *
 * Cách hoạt động: nội dung cần in được render vào 1 khối cố định (#print-root)
 * gắn ngay dưới <body> qua Portal. Khi in (window.print), CSS @media print
 * trong global.css sẽ ẩn TOÀN BỘ trang (kể cả modal, sidebar...) và CHỈ hiện
 * #print-root — nhờ vậy không cần quan tâm hóa đơn đang được mở từ modal nào,
 * component nào cũng gọi được usePrint() để in.
 */
export function PrintProvider({ children }) {
  const [content, setContent] = useState(null);
  const timeoutRef = useRef(null);

  const printContent = useCallback((node) => {
    setContent(node);
    // Đợi 1 tick để React render nội dung vào #print-root trước khi mở hộp thoại in.
    timeoutRef.current = setTimeout(() => {
      window.print();
    }, 50);
  }, []);

  return (
    <PrintContext.Provider value={{ printContent }}>
      {children}
      {createPortal(<div id="print-root">{content}</div>, document.body)}
    </PrintContext.Provider>
  );
}

export function usePrint() {
  const ctx = useContext(PrintContext);
  if (!ctx) throw new Error('usePrint phải được dùng trong PrintProvider');
  return ctx;
}
