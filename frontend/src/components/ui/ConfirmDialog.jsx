import React from 'react';

// Xác nhận trước khi xóa hoặc thực hiện thao tác quan trọng (mục 3 tài liệu dự án).
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" style={{ width: 360 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-body">
          <p>{message}</p>
          <div className="confirm-actions">
            <button className="btn-secondary" onClick={onCancel}>Hủy</button>
            <button className="btn-danger" onClick={onConfirm}>Xác nhận</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
