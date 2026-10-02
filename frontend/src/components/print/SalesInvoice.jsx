import React from 'react';
import { resolvePaymentQrSrc, buildTransferContent } from '../../utils/vietqr.js';

function money(n) {
  return Number(n || 0).toLocaleString('vi-VN') + ' đ';
}

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('vi-VN') : '—';
}

/**
 * Mẫu hóa đơn bán hàng — dùng cho cả xem trước (trong modal) và in giấy
 * (qua PrintContext/#print-root, xem global.css khối "IN HÓA ĐƠN").
 *
 * @param {object} order - kết quả getSalesOrder(id): gồm details[], payments[]
 * @param {object} store - kết quả getStoreSettings(): StoreName, Address, Phone, TaxCode
 */
function SalesInvoice({ order, store }) {
  if (!order) return null;
  const paidAmount = (order.payments || []).reduce((s, p) => s + Number(p.Amount), 0);
  const remainingAmount = Number(order.FinalAmount) - paidAmount;
  // QR chỉ hiện khi còn nợ (đơn đã thanh toán đủ thì không cần QR nữa) —
  // ưu tiên ảnh QR cố định cửa hàng đã tải lên trong Cài đặt, xem vietqr.js.
  const qrUrl = resolvePaymentQrSrc(store, remainingAmount, order.SalesOrderCode);

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
          <h2>Hóa đơn bán hàng</h2>
          <div className="print-doc-code">{order.SalesOrderCode}</div>
        </div>
      </div>

      <div className="print-meta-grid">
        <div>Khách hàng: <strong>{order.CustomerName || 'Khách vãng lai'}</strong></div>
        <div>SĐT: {order.CustomerPhone || '—'}</div>
        <div>Ngày bán: {new Date(order.OrderDate).toLocaleString('vi-VN')}</div>
        <div>Nhân viên bán: {order.CreatedByName || '—'}</div>
      </div>

      <table className="print-table">
        <thead>
          <tr>
            <th>Sản phẩm</th>
            <th className="num">SL</th>
            <th className="num">Đơn giá</th>
            <th className="num">Thành tiền</th>
            <th>Bảo hành</th>
          </tr>
        </thead>
        <tbody>
          {order.details.map((d) => (
            <tr key={d.SalesOrderDetailID}>
              <td>{d.ProductCode} — {d.ProductName}</td>
              <td className="num">{d.Quantity}</td>
              <td className="num">{money(d.UnitPrice)}</td>
              <td className="num">{money(d.LineTotal)}</td>
              <td>{d.WarrantyMonths > 0 ? `${d.WarrantyMonths} tháng (đến ${formatDate(d.WarrantyExpiry)})` : 'Không BH'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="print-totals">
        <table>
          <tbody>
            <tr><td>Tổng tiền hàng</td><td className="num">{money(order.TotalAmount)}</td></tr>
            <tr><td>Giảm giá</td><td className="num">{money(order.DiscountAmount)}</td></tr>
            <tr className="print-grand-total"><td>Thành tiền</td><td className="num">{money(order.FinalAmount)}</td></tr>
            <tr><td>Đã thanh toán</td><td className="num">{money(paidAmount)}</td></tr>
            {remainingAmount > 0 && <tr><td>Còn nợ</td><td className="num">{money(remainingAmount)}</td></tr>}
          </tbody>
        </table>
      </div>

      {qrUrl && (
        <div className="print-qr-block">
          <img src={qrUrl} alt="QR chuyển khoản" className="print-qr-image" />
          <p>Quét mã để chuyển khoản còn lại {money(remainingAmount)}<br />Nội dung CK: <strong>{buildTransferContent(order.SalesOrderCode)}</strong></p>
        </div>
      )}

      {order.details.some((d) => d.WarrantyMonths > 0) && (
        <div className="print-warranty-note">
          Sản phẩm có bảo hành vui lòng giữ lại hóa đơn này để làm căn cứ bảo hành khi cần.
          Thời hạn bảo hành từng sản phẩm được ghi cụ thể ở bảng trên.
        </div>
      )}

      <div className="print-signatures">
        <div className="print-signature-block">
          <div>Khách hàng</div>
          <div className="print-signature-line">(Ký, ghi rõ họ tên)</div>
        </div>
        <div className="print-signature-block">
          <div>Người bán</div>
          <div className="print-signature-line">(Ký, ghi rõ họ tên)</div>
        </div>
      </div>

      <p className="print-footer-note">Cảm ơn quý khách đã mua hàng!</p>
    </div>
  );
}

export default SalesInvoice;
