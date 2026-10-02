import React, { useEffect, useState, useCallback } from 'react';
import Modal from '../../components/ui/Modal.jsx';
import Toast from '../../components/ui/Toast.jsx';
import StateBanner from '../../components/ui/StateBanner.jsx';
import ClickableImage from '../../components/ui/ClickableImage.jsx';
import RepairSlip from '../../components/print/RepairSlip.jsx';
import { usePrint } from '../../contexts/PrintContext.jsx';
import { resolveImageUrl } from '../../utils/imageUrl.js';
import { resolvePaymentQrSrc, buildTransferContent } from '../../utils/vietqr.js';
import { getRepairServices } from '../../services/serviceCatalog.service.js';
import { getProducts } from '../../services/product.service.js';
import { getStoreSettings } from '../../services/storeSettings.service.js';
import {
  getRepairOrder,
  addRepairService,
  removeRepairService,
  useComponent,
  returnComponent,
  addRepairPayment,
} from '../../services/repairOrder.service.js';

function money(n) { return Number(n || 0).toLocaleString('vi-VN') + ' đ'; }

// Bộ chọn dịch vụ/linh kiện kiểu giống hệt trang Bán hàng (POS): tìm theo
// tên, giá lấy thẳng từ bảng giá đã khai báo sẵn (không cho gõ tay giá),
// chọn số lượng rồi bấm "+ Thêm" là cộng dồn vào phiếu ngay.
function CatalogPicker({ items, idField, nameField, priceField, metaLabel, placeholder, emptyMessage, disabledCheck, onAdd }) {
  const [search, setSearch] = useState('');
  const [qtyById, setQtyById] = useState({});

  const filtered = items.filter((it) => it[nameField].toLowerCase().includes(search.toLowerCase()));
  const qtyOf = (id) => qtyById[id] || 1;

  return (
    <div>
      <input className="pos-search" placeholder={placeholder} value={search} onChange={(e) => setSearch(e.target.value)} />
      {filtered.length === 0 ? <StateBanner type="empty" message={emptyMessage} /> : (
        <ul className="pos-product-list">
          {filtered.map((it) => {
            const id = it[idField];
            const disabled = disabledCheck ? disabledCheck(it) : false;
            return (
              <li key={id}>
                <div>
                  <strong>{it[nameField]}</strong>
                  <div className="pos-product-meta">
                    {Number(it[priceField]).toLocaleString('vi-VN')} đ{metaLabel ? ` · ${metaLabel(it)}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="number"
                    min="1"
                    value={qtyOf(id)}
                    onChange={(e) => setQtyById((prev) => ({ ...prev, [id]: e.target.value }))}
                    style={{ width: 50 }}
                  />
                  <button
                    className="btn-secondary"
                    disabled={disabled}
                    onClick={() => onAdd(it, Number(qtyOf(id)) || 1)}
                  >
                    {disabled ? 'Hết hàng' : '+ Thêm'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RepairDetailModal({ repairOrderId, onClose, onChanged }) {
  const [order, setOrder] = useState(null);
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState([]);
  const [componentsList, setComponentsList] = useState([]);
  const [toast, setToast] = useState(null);
  const { printContent } = usePrint();

  // Luồng "Xác nhận thanh toán" — thay hẳn cho khối Báo giá cũ. 3 bước:
  // null (chưa mở) -> 'form' (nhập số tiền/phương thức, xác nhận) ->
  // 'success' (đã ghi nhận xong, hỏi có in hóa đơn không).
  const [paymentPanel, setPaymentPanel] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: 0, paymentMethod: 'CASH' });
  const [paidOrder, setPaidOrder] = useState(null); // order mới nhất ngay sau khi thanh toán — dùng để in cho chắc, tránh state cũ

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRepairOrder(repairOrderId);
      setOrder(data);
    } finally {
      setLoading(false);
    }
  }, [repairOrderId]);

  useEffect(() => {
    load();
    getRepairServices().then(setServices).catch(() => {});
    getProducts({ page: 1, pageSize: 200 }).then((res) => setComponentsList(res.items)).catch(() => {});
    getStoreSettings().then(setStore).catch(() => {});
  }, [load]);

  const notifyAndReload = (message) => {
    setToast({ type: 'success', message });
    load();
    onChanged && onChanged();
  };

  const handleError = (err) => setToast({ type: 'error', message: err?.response?.data?.message || 'Có lỗi xảy ra' });

  const handleAddService = async (service, quantity) => {
    try {
      await addRepairService(repairOrderId, {
        repairServiceId: service.RepairServiceID,
        quantity,
        unitPrice: Number(service.DefaultPrice),
      });
      notifyAndReload('Thêm công sửa chữa thành công');
    } catch (err) { handleError(err); }
  };

  const handleRemoveService = async (detailId) => {
    try {
      await removeRepairService(repairOrderId, detailId);
      notifyAndReload('Đã xóa công sửa chữa');
    } catch (err) { handleError(err); }
  };

  const handleUseComponent = async (component, quantity) => {
    try {
      await useComponent(repairOrderId, {
        componentId: component.ProductID,
        quantity,
        unitPrice: Number(component.SalePrice),
      });
      notifyAndReload('Ghi nhận dùng sản phẩm/linh kiện thành công — đã trừ tồn kho');
    } catch (err) { handleError(err); }
  };

  const handleReturnComponent = async (repairComponentId) => {
    try {
      await returnComponent(repairOrderId, repairComponentId);
      notifyAndReload('Đã hoàn kho linh kiện');
    } catch (err) { handleError(err); }
  };

  // Tính toán dùng chung — đặt lên trước để handleOpenPayment/handleConfirmPayment dùng được.
  const laborTotal = order ? (order.services || []).reduce((s, x) => s + Number(x.LineTotal), 0) : 0;
  const componentTotal = order ? (order.components || []).filter((c) => !c.IsReturned).reduce((s, x) => s + Number(x.LineTotal), 0) : 0;
  const grandTotal = laborTotal + componentTotal;
  const paidSoFar = order ? (order.payments || []).reduce((s, p) => s + Number(p.Amount), 0) : 0;
  const remaining = grandTotal - paidSoFar;

  // Mở khối "Xác nhận thanh toán" — mặc định điền sẵn đúng số tiền còn nợ,
  // nhân viên vẫn sửa được (thu ít hơn = ghi nhận đặt cọc/thanh toán một phần).
  const handleOpenPayment = () => {
    setPaymentForm({ amount: remaining, paymentMethod: 'CASH' });
    setPaymentPanel('form');
  };

  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0) {
      setToast({ type: 'error', message: 'Số tiền thanh toán phải lớn hơn 0' });
      return;
    }
    try {
      await addRepairPayment(repairOrderId, { amount, paymentMethod: paymentForm.paymentMethod });
      // Lấy lại dữ liệu mới nhất ngay lập tức (không chờ setState re-render)
      // để nút "In hóa đơn" ở bước tiếp theo chắc chắn in đúng số tiền vừa thu.
      const fresh = await getRepairOrder(repairOrderId);
      setOrder(fresh);
      setPaidOrder(fresh);
      setPaymentPanel('success');
      onChanged && onChanged();
    } catch (err) { handleError(err); }
  };

  const handlePrintAfterPayment = () => {
    printContent(<RepairSlip order={paidOrder || order} store={store} />);
    setPaymentPanel(null);
  };

  const handlePrint = () => {
    if (!order) return;
    printContent(<RepairSlip order={order} store={store} />);
  };

  // QR chỉ hiện khi còn nợ — ưu tiên ảnh QR cố định cửa hàng đã tải lên
  // trong Cài đặt, xem vietqr.js.
  const qrUrl = order ? resolvePaymentQrSrc(store, remaining, order.RepairOrderCode) : null;

  return (
    <Modal title={order ? `Phiếu sửa chữa ${order.RepairOrderCode}` : 'Chi tiết phiếu sửa chữa'} onClose={onClose} width={800}>
      {loading && <StateBanner type="loading" />}
      {!loading && order && (
        <div className="repair-detail">
          <div className="page-header" style={{ marginBottom: 12 }}>
            <span className={`badge badge-ACTIVE`}>{order.Status}</span>
            <button className="btn-secondary" onClick={handlePrint}>🖨️ In phiếu</button>
          </div>

          {/* ---- Khối xem trước hóa đơn — bố cục giống hệt thứ tự trên phiếu in ---- */}
          <div className="invoice-preview">
            <div className="invoice-preview-header">
              {store?.StoreName && <div className="invoice-preview-store">{store.StoreName}</div>}
              <h2>Phiếu sửa chữa {Number(order.WarrantyMonths) > 0 ? '& bảo hành' : ''}</h2>
              <div className="invoice-preview-code">{order.RepairOrderCode}</div>
            </div>

            <div className="invoice-preview-meta">
              <span><strong>Khách hàng:</strong> {order.CustomerName} · {order.CustomerPhone}</span>
              <span><strong>Xe:</strong> {order.DeviceType} {order.Brand} {order.Model} {order.IMEI ? `— ${order.IMEI}` : ''}</span>
              <span><strong>Lỗi khách báo:</strong> {order.ReportedIssue || '—'}</span>
              <span><strong>Tình trạng khi nhận:</strong> {order.InitialCondition || '—'}</span>
              <span><strong>Phụ kiện đi kèm:</strong> {order.Accessories || '—'}</span>
              <span>
                <strong>Bảo hành:</strong> {Number(order.WarrantyMonths) > 0
                  ? `${order.WarrantyMonths} tháng (đến ${new Date(order.WarrantyExpiry).toLocaleDateString('vi-VN')})`
                  : (order.Status === 'Đã giao khách' ? 'Không bảo hành' : '— (nhập khi giao xe)')}
              </span>
            </div>

            {order.ImageURL && (
              <ClickableImage src={resolveImageUrl(order.ImageURL)} alt="Ảnh xe" className="invoice-preview-photo" />
            )}

            <table className="data-table invoice-preview-table">
              <thead><tr><th>Công sửa chữa</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
              <tbody>
                {order.services.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-muted)' }}>Chưa có công sửa chữa nào</td></tr>
                ) : order.services.map((s) => (
                  <tr key={s.RepairOrderDetailID}>
                    <td>{s.ServiceName}</td><td>{s.Quantity}</td><td>{money(s.UnitPrice)}</td><td>{money(s.LineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <table className="data-table invoice-preview-table">
              <thead><tr><th>Linh kiện sử dụng</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
              <tbody>
                {order.components.filter((c) => !c.IsReturned).length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-muted)' }}>Chưa dùng linh kiện nào</td></tr>
                ) : order.components.filter((c) => !c.IsReturned).map((c) => (
                  <tr key={c.RepairComponentID}>
                    <td>{c.ComponentName}</td><td>{c.Quantity}</td><td>{money(c.UnitPrice)}</td><td>{money(c.LineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="invoice-preview-totals">
              <div>Tiền công: {money(laborTotal)}</div>
              <div>Tiền linh kiện: {money(componentTotal)}</div>
              <div className="grand">Tổng cộng: {money(grandTotal)}</div>
              <div>Đã thanh toán: {money(paidSoFar)}</div>
              {remaining > 0 && <div className="due">Còn nợ: {money(remaining)}</div>}
            </div>

            {qrUrl && (
              <div className="invoice-preview-qr">
                <img src={qrUrl} alt="QR chuyển khoản" />
                <p>Quét để chuyển khoản còn lại {money(remaining)}<br />Nội dung CK: <strong>{buildTransferContent(order.RepairOrderCode)}</strong></p>
              </div>
            )}
          </div>

          <h3>Thêm công sửa chữa</h3>
          <CatalogPicker
            items={services}
            idField="RepairServiceID"
            nameField="ServiceName"
            priceField="DefaultPrice"
            placeholder="Tìm dịch vụ..."
            emptyMessage="Không tìm thấy dịch vụ"
            onAdd={handleAddService}
          />
          {order.services.length > 0 && (
            <table className="data-table responsive-cards" style={{ marginTop: 10 }}>
              <thead><tr><th>Đã áp dụng</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th><th></th></tr></thead>
              <tbody>
                {order.services.map((s) => (
                  <tr key={s.RepairOrderDetailID}>
                    <td data-label="Đã áp dụng">{s.ServiceName}</td>
                    <td data-label="SL">{s.Quantity}</td>
                    <td data-label="Đơn giá">{money(s.UnitPrice)}</td>
                    <td data-label="Thành tiền">{money(s.LineTotal)}</td>
                    <td className="table-actions"><button className="btn-link btn-link-danger" onClick={() => handleRemoveService(s.RepairOrderDetailID)}>Xóa</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3 style={{ marginTop: 20 }}>Dùng sản phẩm/linh kiện</h3>
          <CatalogPicker
            items={componentsList}
            idField="ProductID"
            nameField="ProductName"
            priceField="SalePrice"
            placeholder="Tìm sản phẩm/linh kiện..."
            emptyMessage="Không tìm thấy sản phẩm/linh kiện"
            metaLabel={(c) => `Tồn: ${c.Quantity}`}
            disabledCheck={(c) => c.Quantity <= 0}
            onAdd={handleUseComponent}
          />
          {order.components.length > 0 && (
            <table className="data-table responsive-cards" style={{ marginTop: 10 }}>
              <thead><tr><th>Đã dùng</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th><th>Trạng thái</th><th></th></tr></thead>
              <tbody>
                {order.components.map((c) => (
                  <tr key={c.RepairComponentID}>
                    <td data-label="Linh kiện đã dùng">{c.ComponentName}</td>
                    <td data-label="SL">{c.Quantity}</td>
                    <td data-label="Đơn giá">{money(c.UnitPrice)}</td>
                    <td data-label="Thành tiền">{money(c.LineTotal)}</td>
                    <td data-label="Trạng thái">{c.IsReturned ? 'Đã hoàn kho' : 'Đang dùng'}</td>
                    <td className="table-actions">
                      {!c.IsReturned && (
                        <button className="btn-link btn-link-danger" onClick={() => handleReturnComponent(c.RepairComponentID)}>Hoàn kho</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3 style={{ marginTop: 20 }}>Thanh toán</h3>
          {order.payments.length === 0 ? <StateBanner type="empty" message="Chưa có thanh toán" /> : (
            <table className="data-table responsive-cards">
              <thead><tr><th>Số tiền</th><th>Phương thức</th><th>Ngày</th></tr></thead>
              <tbody>
                {order.payments.map((p) => (
                  <tr key={p.PaymentID}>
                    <td data-label="Số tiền">{money(p.Amount)}</td>
                    <td data-label="Phương thức">{p.PaymentMethod}</td>
                    <td data-label="Ngày">{new Date(p.PaymentDate).toLocaleString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {remaining <= 0 && grandTotal > 0 && paymentPanel !== 'success' && (
            <p style={{ marginTop: 10 }}><span className="badge badge-ACTIVE">✅ Đã thanh toán đủ</span></p>
          )}

          {/* ---- Khối "Xác nhận thanh toán" — thay cho phần Báo giá cũ ---- */}
          {remaining > 0 && paymentPanel === null && (
            <div style={{ marginTop: 10 }}>
              <button className="btn-primary" onClick={handleOpenPayment}>
                💳 Xác nhận thanh toán ({money(remaining)})
              </button>
            </div>
          )}

          {paymentPanel === 'form' && (
            <form className="payment-confirm-box" onSubmit={handleConfirmPayment}>
              <div className="form-row" style={{ alignItems: 'flex-end' }}>
                <label style={{ flex: '0 0 160px' }}>
                  Số tiền thu
                  <input
                    type="number" min="1" max={remaining} value={paymentForm.amount}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                  />
                </label>
                <label style={{ flex: 1 }}>
                  Phương thức
                  <select value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm((p) => ({ ...p, paymentMethod: e.target.value }))}>
                    <option value="CASH">Tiền mặt</option>
                    <option value="TRANSFER">Chuyển khoản</option>
                    <option value="MIXED">Kết hợp</option>
                  </select>
                </label>
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-muted)', margin: '4px 0 0' }}>
                Mặc định điền sẵn đúng số tiền còn nợ ({money(remaining)}) — có thể sửa thấp hơn nếu khách chỉ đặt cọc/thanh toán một phần.
              </p>

              {paymentForm.paymentMethod === 'TRANSFER' && qrUrl && (
                <div className="invoice-preview-qr" style={{ marginTop: 10 }}>
                  <img src={qrUrl} alt="QR chuyển khoản" />
                  <p>Quét để chuyển khoản {money(Number(paymentForm.amount) || 0)}<br />Nội dung CK: <strong>{buildTransferContent(order.RepairOrderCode)}</strong></p>
                </div>
              )}
              {paymentForm.paymentMethod === 'TRANSFER' && !qrUrl && (
                <p style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                  Cửa hàng chưa cấu hình QR nhận thanh toán — vào Cài đặt {'>'} Thông tin cửa hàng để thêm ảnh QR.
                </p>
              )}

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setPaymentPanel(null)}>Hủy</button>
                <button type="submit" className="btn-primary">Xác nhận đã thu tiền</button>
              </div>
            </form>
          )}

          {paymentPanel === 'success' && (
            <div className="payment-confirm-box payment-confirm-success">
              <p>✅ Đã ghi nhận thanh toán thành công.</p>
              <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>Bạn có muốn in hóa đơn cho khách không?</p>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setPaymentPanel(null)}>Đóng</button>
                <button type="button" className="btn-primary" onClick={handlePrintAfterPayment}>🖨️ In hóa đơn</button>
              </div>
            </div>
          )}
        </div>
      )}
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </Modal>
  );
}

export default RepairDetailModal;
