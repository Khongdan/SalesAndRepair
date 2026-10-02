// Helper tính trạng thái bảo hành dùng chung cho Repairs, Customers, Sales, Reports.
// status: 'NONE' (không bảo hành) | 'ACTIVE' (còn hạn) | 'EXPIRING_SOON' (còn <= 7 ngày)
//         | 'EXPIRED' (đã hết hạn)

export function getWarrantyStatus(warrantyMonths, warrantyExpiry) {
  if (!warrantyMonths || Number(warrantyMonths) <= 0 || !warrantyExpiry) {
    return { status: 'NONE', daysLeft: null };
  }
  const diffMs = new Date(warrantyExpiry).getTime() - Date.now();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  let status = 'ACTIVE';
  if (daysLeft < 0) status = 'EXPIRED';
  else if (daysLeft <= 7) status = 'EXPIRING_SOON';
  return { status, daysLeft };
}

export function warrantyLabel(warrantyMonths, warrantyExpiry) {
  const { status, daysLeft } = getWarrantyStatus(warrantyMonths, warrantyExpiry);
  const dateStr = warrantyExpiry ? new Date(warrantyExpiry).toLocaleDateString('vi-VN') : '';
  switch (status) {
    case 'EXPIRED':
      return `Hết hạn (${dateStr})`;
    case 'EXPIRING_SOON':
      return `Sắp hết — còn ${daysLeft} ngày (${dateStr})`;
    case 'ACTIVE':
      return `Còn hạn đến ${dateStr}`;
    default:
      return 'Không bảo hành';
  }
}
