import React from 'react';
import { getWarrantyStatus, warrantyLabel } from '../../utils/warranty.js';

// Badge màu hiển thị trạng thái bảo hành: xanh = còn hạn, cam = sắp hết
// (<= 7 ngày), đỏ = đã hết, xám = không bảo hành.
function WarrantyBadge({ warrantyMonths, warrantyExpiry }) {
  const { status } = getWarrantyStatus(warrantyMonths, warrantyExpiry);
  return <span className={`badge badge-warranty-${status}`}>{warrantyLabel(warrantyMonths, warrantyExpiry)}</span>;
}

export default WarrantyBadge;
