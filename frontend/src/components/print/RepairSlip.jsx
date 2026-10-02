import React from 'react';
import { resolvePaymentQrSrc, buildTransferContent } from '../../utils/vietqr.js';

function money(n) {
  return Number(n || 0).toLocaleString('vi-VN') + ' đ';
}

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('vi-VN') : '—';
}

/**
 * Mẫu phiếu sửa chữa — dùng cho cả xem trước (trong modal) và in giấy.
 * Nếu phiếu đã có WarrantyMonths (đã giao khách + có bảo hành), phiếu này
 * đồng thời đóng vai trò "thẻ bảo hành" cho lần sửa chữa đó.
 *
 * @param {object} order - kết quả getRepairOrder(id)
 * @param {object} store - kết quả getStoreSettings()
 */
function RepairSlip({ order, store }) {
  if (!order) return null;
  const laborTotal = (order.services || []).reduce((s, x) => s + Number(x.LineTotal), 0);
  const componentTotal = (order.components || []).filter((c) => !c.IsReturned).reduce((s, x) => s + Number(x.LineTotal), 0);
  const grandTotal = laborTotal + componentTotal;
  const paidAmount = (order.payments || []).reduce((s, p) => s + Number(p.Amount), 0);
  const remainingAmount = grandTotal - paidAmount;
  const qrUrl = resolvePaymentQrSrc(store, remainingAmount, order.RepairOrderCode);
  const hasWarranty = Number(order.WarrantyMonths) > 0;

  return (
    <div className="print-doc">
      <div className="print-header">
        <div>
          <p className="print-store-name">{store?.StoreName || 'Cửa hàng của tôi'}</p>
          <p className="print-store-meta">
            {store?.Address ? <>{store.Address}<br /></> : null}
            {store?.Phone ? <>ĐT: {store.Phone} </> : null}
            {store?.TaxCode ? <> · MST: {store.TaxCode}</> : null}
          </p>
        </div>
        <div className="print-doc-title">
          <h2>{hasWarranty ? 'Phiếu sửa chữa & bảo hành' : 'Phiếu sửa chữa'}</h2>
          <div className="print-doc-code">{order.RepairOrderCode}</div>
        </div>
      </div>

      <div className="print-meta-grid">
        <div>Khách hàng: <strong>{order.CustomerName}</strong></div>
        <div>SĐT: {order.CustomerPhone || '—'}</div>
        <div>Xe: {order.DeviceType} {order.Brand} {order.Model}</div>
        <div>Biển số / Số khung: {order.IMEI || '—'}</div>
        <div>Ngày nhận: {new Date(order.ReceivedDate).toLocaleString('vi-VN')}</div>
        <div>Ngày giao: {order.CompletedDate ? new Date(order.CompletedDate).toLocaleString('vi-VN') : '—'}</div>
        <div>Trạng thái: {order.Status}</div>
      </div>

      <p style={{ fontSize: 12, margin: '0 0 10px' }}>
        Lỗi khách báo: {order.ReportedIssue || '—'}<br />
        Tình trạng khi nhận: {order.InitialCondition || '—'}<br />
        Phụ kiện đi kèm: {order.Accessories || '—'}
      </p>

      {order.services && order.services.length > 0 && (
        <table className="print-table">
          <thead><tr><th>Công sửa chữa</th><th className="num">SL</th><th className="num">Đơn giá</th><th className="num">Thành tiền</th></tr></thead>
          <tbody>
            {order.services.map((s) => (
              <tr key={s.RepairOrderDetailID}>
                <td>{s.ServiceName}</td><td className="num">{s.Quantity}</td>
                <td className="num">{money(s.UnitPrice)}</td><td className="num">{money(s.LineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {order.components && order.components.filter((c) => !c.IsReturned).length > 0 && (
        <table className="print-table">
          <thead><tr><th>Linh kiện đã dùng</th><th className="num">SL</th><th className="num">Đơn giá</th><th className="num">Thành tiền</th></tr></thead>
          <tbody>
            {order.components.filter((c) => !c.IsReturned).map((c) => (
              <tr key={c.RepairComponentID}>
                <td>{c.ComponentCode} — {c.ComponentName}</td><td className="num">{c.Quantity}</td>
                <td className="num">{money(c.UnitPrice)}</td><td className="num">{money(c.LineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="print-totals">
        <table>
          <tbody>
            <tr><td>Tiền công</td><td className="num">{money(laborTotal)}</td></tr>
            <tr><td>Tiền linh kiện</td><td className="num">{money(componentTotal)}</td></tr>
            <tr className="print-grand-total"><td>Tổng cộng</td><td className="num">{money(grandTotal)}</td></tr>
            <tr><td>Đã thanh toán</td><td className="num">{money(paidAmount)}</td></tr>
            {remainingAmount > 0 && <tr><td>Còn nợ</td><td className="num">{money(remainingAmount)}</td></tr>}
          </tbody>
        </table>
      </div>

      {qrUrl && (
        <div className="print-qr-block">
          <img src={qrUrl} alt="QR chuyển khoản" className="print-qr-image" />
          <p>Quét mã để chuyển khoản còn lại {money(remainingAmount)}<br />Nội dung CK: <strong>{buildTransferContent(order.RepairOrderCode)}</strong></p>
        </div>
      )}

      <div className="print-warranty-note">
        {hasWarranty ? (
          <>
            <strong>Bảo hành lần sửa chữa này: {order.WarrantyMonths} tháng</strong> — hết hạn ngày{' '}
            <strong>{formatDate(order.WarrantyExpiry)}</strong>. Vui lòng giữ phiếu này làm căn cứ khi cần bảo hành lại.
          </>
        ) : (
          'Lần sửa chữa này không áp dụng bảo hành.'
        )}
      </div>

      <div className="print-signatures">
        <div className="print-signature-block">
          <div>Khách hàng</div>
          <div className="print-signature-line">(Ký, ghi rõ họ tên)</div>
        </div>
        <div className="print-signature-block">
          <div>Kỹ thuật viên / Cửa hàng</div>
          <div className="print-signature-line">(Ký, ghi rõ họ tên)</div>
        </div>
      </div>
    </div>
  );
}

export default RepairSlip;
