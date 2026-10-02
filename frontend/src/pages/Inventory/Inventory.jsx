import React, { useEffect, useState, useCallback } from 'react';
import Toast from '../../components/ui/Toast.jsx';
import StateBanner from '../../components/ui/StateBanner.jsx';
import InvoicePhotoPanel from './InvoicePhotoPanel.jsx';
import { getProducts } from '../../services/product.service.js';
import {
  importStock,
  exportStock,
  adjustStock,
  getTransactions,
  getLowStockSummary,
} from '../../services/inventory.service.js';

const TX_TYPE_LABELS = {
  IMPORT: 'Nhập kho',
  EXPORT: 'Xuất kho',
  ADJUST: 'Điều chỉnh',
  SALE: 'Bán hàng',
  REPAIR_USE: 'Dùng cho sửa chữa',
  REPAIR_RETURN: 'Hoàn kho sửa chữa',
};

// Form dùng chung cho 3 thao tác: Nhập kho / Xuất kho / Điều chỉnh tồn kho.
// Chỉ còn 1 danh mục "Sản phẩm" duy nhất (đã gộp Linh kiện vào) nên không
// cần chọn Loại nữa như trước.
function StockActionForm({ mode, onSubmit }) {
  const itemType = 'PRODUCT';
  const [items, setItems] = useState([]);
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    setLoadingItems(true);
    getProducts({ page: 1, pageSize: 200 })
      .then((res) => setItems(res.items))
      .finally(() => setLoadingItems(false));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!itemId || !quantity) return;
    onSubmit({
      itemType,
      itemId: Number(itemId),
      ...(mode === 'adjust' ? { newQuantity: Number(quantity) } : { quantity: Number(quantity) }),
      reason,
      note,
    });
    setQuantity('');
    setReason('');
    setNote('');
  };

  return (
    <form className="entity-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label>
          Sản phẩm *
          <select value={itemId} onChange={(e) => setItemId(e.target.value)} required disabled={loadingItems}>
            <option value="">{loadingItems ? 'Đang tải...' : '-- Chọn --'}</option>
            {items.map((it) => (
              <option key={it.ProductID} value={it.ProductID}>{it.ProductCode} — {it.ProductName} (tồn: {it.Quantity})</option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-row">
        <label>
          {mode === 'adjust' ? 'Số lượng thực tế sau kiểm kê *' : 'Số lượng *'}
          <input type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
        </label>
        <label>
          Lý do
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="vd: Kiểm kê định kỳ" />
        </label>
      </div>
      <label>
        Ghi chú
        <input value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <div className="form-actions">
        <button type="submit" className="btn-primary">
          {mode === 'import' ? 'Xác nhận nhập kho' : mode === 'export' ? 'Xác nhận xuất kho' : 'Xác nhận điều chỉnh'}
        </button>
      </div>
    </form>
  );
}

function Inventory() {
  const [activeTab, setActiveTab] = useState('import');
  const [toast, setToast] = useState(null);

  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txError, setTxError] = useState('');

  const [lowStock, setLowStock] = useState([]);
  const [lowStockLoading, setLowStockLoading] = useState(true);

  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    setTxError('');
    try {
      const result = await getTransactions({ page: 1, pageSize: 15 });
      setTransactions(result.items);
    } catch (err) {
      setTxError(err?.response?.data?.message || 'Không thể tải lịch sử giao dịch kho');
    } finally {
      setTxLoading(false);
    }
  }, []);

  const loadLowStock = useCallback(async () => {
    setLowStockLoading(true);
    try {
      const items = await getLowStockSummary();
      setLowStock(items);
    } finally {
      setLowStockLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
    loadLowStock();
  }, [loadTransactions, loadLowStock]);

  const handleAction = async (payload) => {
    try {
      if (activeTab === 'import') await importStock(payload);
      else if (activeTab === 'export') await exportStock(payload);
      else await adjustStock(payload);

      setToast({ type: 'success', message: 'Thao tác kho thành công' });
      loadTransactions();
      loadLowStock();
    } catch (err) {
      setToast({ type: 'error', message: err?.response?.data?.message || 'Có lỗi xảy ra' });
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Kho hàng</h1>
      </div>

      <div className="inventory-grid">
        <div className="panel">
          <div className="tabs">
            <button className={activeTab === 'import' ? 'tab-active' : ''} onClick={() => setActiveTab('import')}>Nhập kho</button>
            <button className={activeTab === 'export' ? 'tab-active' : ''} onClick={() => setActiveTab('export')}>Xuất kho</button>
            <button className={activeTab === 'adjust' ? 'tab-active' : ''} onClick={() => setActiveTab('adjust')}>Kiểm kê / Điều chỉnh</button>
            <button className={activeTab === 'invoice-photos' ? 'tab-active' : ''} onClick={() => setActiveTab('invoice-photos')}>Đối chiếu hàng nhập</button>
          </div>
          {activeTab === 'invoice-photos'
            ? <InvoicePhotoPanel onToast={setToast} />
            : <StockActionForm mode={activeTab} onSubmit={handleAction} />}
        </div>

        <div className="panel">
          <h2>Cảnh báo tồn kho thấp</h2>
          {lowStockLoading && <StateBanner type="loading" />}
          {!lowStockLoading && lowStock.length === 0 && <StateBanner type="empty" message="Không có hàng sắp hết" />}
          {!lowStockLoading && lowStock.length > 0 && (
            <ul className="low-stock-list">
              {lowStock.map((item) => (
                <li key={`${item.ItemType}-${item.ItemID}`}>
                  <span className="badge badge-warning">SP</span>
                  {item.Code} — {item.Name}
                  <strong> ({item.Quantity}/{item.MinStock})</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 24 }}>
        <h2>Lịch sử giao dịch kho gần đây</h2>
        {txLoading && <StateBanner type="loading" />}
        {!txLoading && txError && <StateBanner type="error" message={txError} />}
        {!txLoading && !txError && transactions.length === 0 && <StateBanner type="empty" />}
        {!txLoading && !txError && transactions.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã GD</th>
                <th>Loại GD</th>
                <th>Đối tượng</th>
                <th>Số lượng</th>
                <th>Người thực hiện</th>
                <th>Thời gian</th>
                <th>Lý do</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.TransactionID}>
                  <td>{tx.TransactionCode}</td>
                  <td>{TX_TYPE_LABELS[tx.TransactionType] || tx.TransactionType}</td>
                  <td>Sản phẩm #{tx.ItemID}</td>
                  <td>{tx.Quantity}</td>
                  <td>{tx.PerformedByName}</td>
                  <td>{new Date(tx.TransactionDate).toLocaleString('vi-VN')}</td>
                  <td>{tx.Reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}

export default Inventory;
