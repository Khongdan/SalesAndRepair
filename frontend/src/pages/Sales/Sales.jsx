import React, { useEffect, useState, useCallback } from 'react';
import Modal from '../../components/ui/Modal.jsx';
import Toast from '../../components/ui/Toast.jsx';
import StateBanner from '../../components/ui/StateBanner.jsx';
import PaymentQrCard from '../../components/ui/PaymentQrCard.jsx';
import WarrantyBadge from '../../components/ui/WarrantyBadge.jsx';
import SalesInvoice from '../../components/print/SalesInvoice.jsx';
import { usePrint } from '../../contexts/PrintContext.jsx';
import { getProducts } from '../../services/product.service.js';
import { getAllCustomers } from '../../services/customer.service.js';
import { getStoreSettings } from '../../services/storeSettings.service.js';
import { getSalesOrders, getSalesOrder, createSalesOrder, addSalesPayment } from '../../services/salesOrder.service.js';
import { resolvePaymentQrSrc, buildTransferContent } from '../../utils/vietqr.js';

const money = (n) => `${Number(n || 0).toLocaleString('vi-VN')} đ`;

const PAYMENT_METHODS = [
  { value: 'CASH', icon: '💵', label: 'Tiền mặt' },
  { value: 'TRANSFER', icon: '🏦', label: 'Chuyển khoản' },
  { value: 'MIXED', icon: '🔀', label: 'Kết hợp' },
];
const paymentMethodInfo = (value) => PAYMENT_METHODS.find((m) => m.value === value) || { icon: '💳', label: value };

function ProductSearchPanel({ onAddToCart }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      getProducts({ page: 1, pageSize: 20, search, status: 'ACTIVE' })
        .then((res) => setResults(res.items))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="panel">
      <h2>Tìm sản phẩm</h2>
      <input
        className="pos-search"
        placeholder="Tìm theo tên hoặc mã sản phẩm / quét mã vạch..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
      />
      {loading && <StateBanner type="loading" />}
      {!loading && results.length === 0 && <StateBanner type="empty" message="Không tìm thấy sản phẩm" />}
      {!loading && results.length > 0 && (
        <ul className="pos-product-list">
          {results.map((p) => (
            <li key={p.ProductID}>
              <div>
                <strong>{p.ProductName}</strong>
                <div className="pos-product-meta">{p.ProductCode} · Tồn: {p.Quantity} · {Number(p.SalePrice).toLocaleString('vi-VN')} đ</div>
              </div>
              <button
                className="btn-secondary"
                disabled={p.Quantity <= 0}
                onClick={() => onAddToCart(p)}
              >
                {p.Quantity <= 0 ? 'Hết hàng' : '+ Thêm'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CartPanel({ cart, setCart, onCheckout, checkingOut }) {
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  // Công nợ: mặc định khách trả đủ (hành vi cũ). Chỉ khi tick "Cho nợ một phần"
  // mới hiện ô nhập số tiền khách trả trước, phần còn lại ghi thành công nợ.
  const [allowDebt, setAllowDebt] = useState(false);
  const [paidInput, setPaidInput] = useState('');
  const [store, setStore] = useState(null);

  useEffect(() => {
    getAllCustomers().then(setCustomers).catch(() => {});
    getStoreSettings().then(setStore).catch(() => {});
  }, []);

  const updateQuantity = (productId, quantity) => {
    setCart((prev) => prev.map((line) => (
      line.ProductID === productId ? { ...line, quantity: Math.max(1, Math.min(quantity, line.Quantity)) } : line
    )));
  };

  const updateWarranty = (productId, warrantyMonths) => {
    setCart((prev) => prev.map((line) => (
      line.ProductID === productId ? { ...line, warrantyMonths: Math.max(0, Number(warrantyMonths) || 0) } : line
    )));
  };

  const removeLine = (productId) => setCart((prev) => prev.filter((line) => line.ProductID !== productId));

  const total = cart.reduce((sum, l) => sum + l.quantity * l.SalePrice, 0);
  const finalAmount = Math.max(0, total - Number(discount || 0));
  const paidAmount = allowDebt ? Math.min(Math.max(0, Number(paidInput) || 0), finalAmount) : finalAmount;
  const remainingAmount = finalAmount - paidAmount;

  // Khách chọn "Chuyển khoản" → hiện QR của cửa hàng với đúng số tiền khách trả lúc này.
  // Đơn chưa được tạo nên chưa có mã đơn — nội dung CK dùng cụm chung "đơn hàng".
  const showTransferQr = paymentMethod === 'TRANSFER' && cart.length > 0 && paidAmount > 0;
  const transferContent = buildTransferContent('đơn hàng');
  const cartQrSrc = showTransferQr ? resolvePaymentQrSrc(store, paidAmount, 'đơn hàng') : null;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (allowDebt && !customerId) return; // công nợ phải gắn với khách hàng cụ thể để theo dõi, không cho khách vãng lai
    onCheckout({
      customerId: customerId || null,
      discountAmount: Number(discount) || 0,
      paymentMethod,
      paidAmount,
      items: cart.map((l) => ({
        productId: l.ProductID,
        quantity: l.quantity,
        unitPrice: l.SalePrice,
        warrantyMonths: l.warrantyMonths || 0,
      })),
    });
    setDiscount(0);
    setAllowDebt(false);
    setPaidInput('');
  };

  return (
    <div className="panel">
      <h2>Giỏ hàng</h2>

      {cart.length === 0 ? (
        <StateBanner type="empty" message="Chưa có sản phẩm trong giỏ hàng" />
      ) : (
        <table className="data-table">
          <thead><tr><th>Sản phẩm</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th><th>BH (tháng)</th><th></th></tr></thead>
          <tbody>
            {cart.map((line) => (
              <tr key={line.ProductID}>
                <td>{line.ProductName}</td>
                <td>
                  <input
                    type="number"
                    min="1"
                    max={line.Quantity}
                    value={line.quantity}
                    onChange={(e) => updateQuantity(line.ProductID, Number(e.target.value))}
                    style={{ width: 60 }}
                  />
                </td>
                <td>{Number(line.SalePrice).toLocaleString('vi-VN')} đ</td>
                <td>{(line.quantity * line.SalePrice).toLocaleString('vi-VN')} đ</td>
                <td>
                  <input
                    type="number"
                    min="0"
                    title="Số tháng bảo hành cho sản phẩm này (0 = không bảo hành)"
                    value={line.warrantyMonths || 0}
                    onChange={(e) => updateWarranty(line.ProductID, e.target.value)}
                    style={{ width: 60 }}
                  />
                </td>
                <td><button className="btn-link btn-link-danger" onClick={() => removeLine(line.ProductID)}>Xóa</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="entity-form" style={{ marginTop: 16 }}>
        <label>
          Khách hàng
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Khách vãng lai</option>
            {customers.map((c) => <option key={c.CustomerID} value={c.CustomerID}>{c.FullName} — {c.Phone}</option>)}
          </select>
        </label>
        <div className="form-row">
          <label>
            Giảm giá
            <input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </label>
          <label>
            Phương thức thanh toán
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="CASH">Tiền mặt</option>
              <option value="TRANSFER">Chuyển khoản</option>
              <option value="MIXED">Kết hợp</option>
            </select>
          </label>
        </div>
        <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={allowDebt}
            disabled={!customerId}
            onChange={(e) => { setAllowDebt(e.target.checked); setPaidInput(''); }}
          />
          Cho nợ một phần (cần chọn khách hàng cụ thể, không áp dụng khách vãng lai)
        </label>
        {allowDebt && (
          <label>
            Khách trả trước
            <input
              type="number"
              min="0"
              max={finalAmount}
              value={paidInput}
              onChange={(e) => setPaidInput(e.target.value)}
              placeholder="0"
            />
          </label>
        )}
      </div>

      {showTransferQr && (
        <PaymentQrCard src={cartQrSrc} amount={paidAmount} content={transferContent} store={store} />
      )}

      <div className="pos-total">
        <span>Tổng tiền hàng: {total.toLocaleString('vi-VN')} đ</span>
        <span>Thành tiền: <strong>{finalAmount.toLocaleString('vi-VN')} đ</strong></span>
        {allowDebt && remainingAmount > 0 && (
          <span style={{ color: '#ff8787', fontWeight: 700 }}>Còn nợ: {remainingAmount.toLocaleString('vi-VN')} đ</span>
        )}
      </div>

      <button className="btn-primary pos-checkout-btn" disabled={cart.length === 0 || checkingOut} onClick={handleCheckout}>
        {checkingOut ? 'Đang xử lý...' : (paymentMethod === 'TRANSFER' ? '✓ Đã nhận chuyển khoản — Thanh toán' : 'Thanh toán')}
      </button>
    </div>
  );
}

function OrderDetailModal({ orderId, onClose, onChanged }) {
  const [order, setOrder] = useState(null);
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentMethod: 'CASH' });
  const { printContent } = usePrint();

  const load = useCallback(() => {
    setLoading(true);
    getSalesOrder(orderId).then(setOrder).finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { getStoreSettings().then(setStore).catch(() => {}); }, []);

  const handlePrint = async () => {
    if (!order) return;
    let s = store;
    if (!s) {
      try { s = await getStoreSettings(); } catch { /* in được mà không cần thông tin cửa hàng cũng không sao */ }
    }
    printContent(<SalesInvoice order={order} store={s} />);
  };

  const payments = order?.payments || [];
  const paidAmount = payments.reduce((s, p) => s + Number(p.Amount), 0);
  const finalAmount = Number(order?.FinalAmount || 0);
  const remainingAmount = finalAmount - paidAmount;
  const isPaidFull = remainingAmount <= 0;
  const paidPercent = finalAmount > 0 ? Math.min(100, Math.round((paidAmount / finalAmount) * 100)) : 100;
  const totalQty = (order?.details || []).reduce((s, d) => s + Number(d.Quantity), 0);

  // QR chỉ hiện khi nhân viên chọn "Chuyển khoản" ở form ghi nhận thanh toán.
  // Số tiền trên QR = số đang nhập (hoặc toàn bộ số còn nợ nếu chưa nhập).
  const qrAmount = Number(paymentForm.amount) > 0 ? Number(paymentForm.amount) : remainingAmount;
  const showQr = paymentForm.paymentMethod === 'TRANSFER' && remainingAmount > 0;
  const qrSrc = showQr && order ? resolvePaymentQrSrc(store, qrAmount, order.SalesOrderCode) : null;

  const handleAddPayment = async (e) => {
    e.preventDefault();
    const amount = Number(paymentForm.amount);
    if (!(amount > 0)) {
      setToast({ type: 'error', message: 'Số tiền thanh toán phải lớn hơn 0' });
      return;
    }
    if (amount > remainingAmount) {
      setToast({ type: 'error', message: `Số tiền vượt quá công nợ còn lại (${money(remainingAmount)})` });
      return;
    }
    setSaving(true);
    try {
      await addSalesPayment(orderId, { amount, paymentMethod: paymentForm.paymentMethod });
      setPaymentForm({ amount: '', paymentMethod: 'CASH' });
      setToast({ type: 'success', message: 'Ghi nhận thanh toán thành công' });
      load();
      onChanged?.();
    } catch (err) {
      setToast({ type: 'error', message: err?.response?.data?.message || 'Có lỗi xảy ra' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Chi tiết đơn bán hàng" onClose={onClose} width={760}>
      {loading && <StateBanner type="loading" />}
      {!loading && order && (
        <div className="order-detail">
          {/* ---- Đầu đơn: mã đơn + trạng thái thanh toán ---- */}
          <div className="order-hero">
            <div>
              <div className="order-hero-label">Đơn bán hàng</div>
              <div className="order-hero-code">{order.SalesOrderCode}</div>
              <div className="order-hero-sub">{new Date(order.OrderDate).toLocaleString('vi-VN')}</div>
            </div>
            <div className="order-hero-side">
              <span className={`badge order-status-badge ${isPaidFull ? 'badge-warranty-ACTIVE' : 'badge-warranty-EXPIRED'}`}>
                {isPaidFull ? '✅ Đã thanh toán đủ' : `⚠️ Còn nợ ${money(remainingAmount)}`}
              </span>
              <button className="btn-secondary" onClick={handlePrint}>🖨️ In hóa đơn</button>
            </div>
          </div>

          {/* ---- Thông tin chung ---- */}
          <div className="order-info-grid">
            <div className="order-info-item">
              <span className="order-info-label">👤 Khách hàng</span>
              <strong>{order.CustomerName || 'Khách vãng lai'}</strong>
              {order.CustomerPhone && <small>{order.CustomerPhone}</small>}
            </div>
            <div className="order-info-item">
              <span className="order-info-label">🧑‍💼 Nhân viên bán</span>
              <strong>{order.CreatedByName || '—'}</strong>
            </div>
            <div className="order-info-item">
              <span className="order-info-label">📦 Số lượng</span>
              <strong>{order.details.length} mặt hàng</strong>
              <small>Tổng {totalQty} sản phẩm</small>
            </div>
          </div>

          {/* ---- Danh sách sản phẩm ---- */}
          <h3 className="order-section-title">Sản phẩm <span className="order-count">{order.details.length}</span></h3>
          <table className="data-table responsive-cards order-items-table">
            <thead><tr><th>Sản phẩm</th><th className="num">SL</th><th className="num">Đơn giá</th><th className="num">Thành tiền</th><th>Bảo hành</th></tr></thead>
            <tbody>
              {order.details.map((d) => (
                <tr key={d.SalesOrderDetailID}>
                  <td data-label="Sản phẩm">
                    <div className="order-item-name">{d.ProductName}</div>
                    <div className="order-item-code">{d.ProductCode}</div>
                  </td>
                  <td data-label="SL" className="num">× {d.Quantity}</td>
                  <td data-label="Đơn giá" className="num">{money(d.UnitPrice)}</td>
                  <td data-label="Thành tiền" className="num"><strong>{money(d.LineTotal)}</strong></td>
                  <td data-label="Bảo hành">
                    <WarrantyBadge warrantyMonths={d.WarrantyMonths} warrantyExpiry={d.WarrantyExpiry} />
                    {d.WarrantyMonths > 0 && <div className="order-item-code">{d.WarrantyMonths} tháng</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ---- Tổng kết tiền ---- */}
          <div className="order-summary">
            <div className="order-summary-row"><span>Tổng tiền hàng</span><span>{money(order.TotalAmount)}</span></div>
            <div className="order-summary-row"><span>Giảm giá</span><span>− {money(order.DiscountAmount)}</span></div>
            <div className="order-summary-row order-summary-grand"><span>Thành tiền</span><span>{money(finalAmount)}</span></div>
            <div className="order-summary-row"><span>Đã thanh toán</span><span className="order-paid">{money(paidAmount)}</span></div>
            {!isPaidFull && (
              <div className="order-summary-row order-summary-due"><span>Còn nợ</span><span>{money(remainingAmount)}</span></div>
            )}
            <div className="order-progress" title={`Đã thu ${paidPercent}%`}>
              <div className={`order-progress-bar ${isPaidFull ? 'full' : ''}`} style={{ width: `${paidPercent}%` }} />
            </div>
          </div>

          {/* ---- Lịch sử thanh toán ---- */}
          <h3 className="order-section-title">Lịch sử thanh toán <span className="order-count">{payments.length}</span></h3>
          {payments.length === 0 ? <StateBanner type="empty" message="Chưa có thanh toán" /> : (
            <ul className="order-payment-list">
              {payments.map((p) => {
                const m = paymentMethodInfo(p.PaymentMethod);
                return (
                  <li key={p.PaymentID}>
                    <span className="order-payment-icon">{m.icon}</span>
                    <div className="order-payment-main">
                      <strong>{money(p.Amount)}</strong>
                      <small>{m.label} · {new Date(p.PaymentDate).toLocaleString('vi-VN')}</small>
                    </div>
                    {p.Note && <small className="order-payment-note">{p.Note}</small>}
                  </li>
                );
              })}
            </ul>
          )}

          {/* ---- Ghi nhận thanh toán thêm + QR khi chọn chuyển khoản ---- */}
          {!isPaidFull && (
            <form className="payment-confirm-box" onSubmit={handleAddPayment}>
              <h3 className="order-section-title" style={{ marginTop: 0 }}>Ghi nhận thanh toán</h3>

              <div className="pay-method-toggle" role="radiogroup" aria-label="Phương thức thanh toán">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    role="radio"
                    aria-checked={paymentForm.paymentMethod === m.value}
                    className={paymentForm.paymentMethod === m.value ? 'active' : ''}
                    onClick={() => setPaymentForm((p) => ({ ...p, paymentMethod: m.value }))}
                  >
                    <span>{m.icon}</span> {m.label}
                  </button>
                ))}
              </div>

              <div className="entity-form">
                <label>
                  Số tiền thu
                  <input
                    type="number"
                    min="1"
                    max={remainingAmount}
                    value={paymentForm.amount}
                    placeholder={`Tối đa ${remainingAmount.toLocaleString('vi-VN')}`}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                  />
                </label>
                <div>
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => setPaymentForm((p) => ({ ...p, amount: String(remainingAmount) }))}
                  >
                    Thu đủ {money(remainingAmount)}
                  </button>
                </div>
              </div>

              {showQr && (
                <PaymentQrCard
                  src={qrSrc}
                  amount={qrAmount}
                  content={buildTransferContent(order.SalesOrderCode)}
                  store={store}
                />
              )}

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Đang lưu...' : (paymentForm.paymentMethod === 'TRANSFER' ? '✓ Đã nhận chuyển khoản' : '+ Ghi nhận thanh toán')}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </Modal>
  );
}

function Sales() {
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);

  const [recentOrders, setRecentOrders] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [viewingOrderId, setViewingOrderId] = useState(null);

  const loadRecent = useCallback(async () => {
    setRecentLoading(true);
    try {
      const result = await getSalesOrders({ page: 1, pageSize: 10 });
      setRecentOrders(result.items);
    } finally {
      setRecentLoading(false);
    }
  }, []);

  useEffect(() => { loadRecent(); }, [loadRecent]);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.ProductID === product.ProductID);
      if (existing) {
        return prev.map((l) => (
          l.ProductID === product.ProductID
            ? { ...l, quantity: Math.min(l.quantity + 1, product.Quantity) }
            : l
        ));
      }
      return [...prev, { ...product, quantity: 1, warrantyMonths: 0 }];
    });
  };

  const handleCheckout = async (payload) => {
    setCheckingOut(true);
    try {
      await createSalesOrder(payload);
      setToast({ type: 'success', message: 'Thanh toán thành công — đã trừ tồn kho' });
      setCart([]);
      loadRecent();
    } catch (err) {
      setToast({ type: 'error', message: err?.response?.data?.message || 'Có lỗi xảy ra' });
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Bán hàng (POS)</h1>
      </div>

      <div className="pos-grid">
        <ProductSearchPanel onAddToCart={addToCart} />
        <CartPanel cart={cart} setCart={setCart} onCheckout={handleCheckout} checkingOut={checkingOut} />
      </div>

      <div className="panel" style={{ marginTop: 24 }}>
        <h2>Đơn hàng gần đây</h2>
        {recentLoading && <StateBanner type="loading" />}
        {!recentLoading && recentOrders.length === 0 && <StateBanner type="empty" />}
        {!recentLoading && recentOrders.length > 0 && (
          <table className="data-table">
            <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày</th><th>Thành tiền</th><th>Còn nợ</th><th></th></tr></thead>
            <tbody>
              {recentOrders.map((o) => {
                const remaining = Number(o.FinalAmount) - Number(o.PaidAmount || 0);
                return (
                  <tr key={o.SalesOrderID}>
                    <td>{o.SalesOrderCode}</td>
                    <td>{o.CustomerName || 'Khách vãng lai'}</td>
                    <td>{new Date(o.OrderDate).toLocaleString('vi-VN')}</td>
                    <td>{Number(o.FinalAmount).toLocaleString('vi-VN')} đ</td>
                    <td>{remaining > 0 ? <span className="badge badge-warranty-EXPIRED">{remaining.toLocaleString('vi-VN')} đ</span> : <span className="badge badge-warranty-ACTIVE">Đã trả đủ</span>}</td>
                    <td className="table-actions">
                      <button className="btn-link" onClick={() => setViewingOrderId(o.SalesOrderID)}>Chi tiết</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {viewingOrderId && <OrderDetailModal orderId={viewingOrderId} onClose={() => setViewingOrderId(null)} onChanged={loadRecent} />}
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}

export default Sales;
