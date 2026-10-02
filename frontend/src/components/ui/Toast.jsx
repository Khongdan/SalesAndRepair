import React, { useEffect } from 'react';

// Toast notification đơn giản — tự ẩn sau 3 giây.
function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!message) return null;
  return <div className={`toast toast-${type}`}>{message}</div>;
}

export default Toast;
