import React from 'react';

// Hiển thị Loading state / Empty state / Error state dùng chung cho các bảng dữ liệu.
const DEFAULT_MESSAGES = {
  loading: 'Đang tải dữ liệu...',
  empty: 'Không có dữ liệu',
  error: 'Đã xảy ra lỗi khi tải dữ liệu',
};

function StateBanner({ type = 'empty', message }) {
  return <div className={`state-banner state-${type}`}>{message || DEFAULT_MESSAGES[type]}</div>;
}

export default StateBanner;
