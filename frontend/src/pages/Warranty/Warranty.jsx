import React, { useState } from 'react';
import StateBanner from '../../components/ui/StateBanner.jsx';
import WarrantyBadge from '../../components/ui/WarrantyBadge.jsx';
import { searchWarranty } from '../../services/warranty.service.js';

const TYPE_LABEL = { SALE: 'Bán hàng', REPAIR: 'Sửa chữa' };

function Warranty() {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState(null); // null = chưa tra cứu lần nào
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await searchWarranty(keyword.trim());
      setResults(data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Không thể tra cứu bảo hành');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Tra cứu bảo hành</h1>
      </div>

      <p style={{ color: 'var(--color-muted)', marginTop: -8, marginBottom: 16 }}>
        Nhập số điện thoại khách hàng, biển số xe/số khung, hoặc mã đơn/phiếu để xem các lần mua hàng
        và sửa chữa còn/hết bảo hành.
      </p>

      <form className="filter-bar" onSubmit={handleSearch}>
        <input
          placeholder="VD: 0912345678 hoặc 59-P1 123.45..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          autoFocus
        />
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Đang tra...' : 'Tra cứu'}
        </button>
      </form>

      {loading && <StateBanner type="loading" />}
      {!loading && error && <StateBanner type="error" message={error} />}

      {!loading && !error && results !== null && results.length === 0 && (
        <StateBanner type="empty" message="Không tìm thấy lần mua hàng/sửa chữa nào có bảo hành khớp với từ khóa này" />
      )}

      {!loading && !error && results && results.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Loại</th>
              <th>Mã đơn/phiếu</th>
              <th>Khách hàng</th>
              <th>SĐT</th>
              <th>Sản phẩm / Xe</th>
              <th>Bảo hành</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={`${r.type}-${r.orderId}`}>
                <td>{TYPE_LABEL[r.type] || r.type}</td>
                <td>{r.orderCode}</td>
                <td>{r.customerName}</td>
                <td>{r.customerPhone || '—'}</td>
                <td>{r.itemName}</td>
                <td><WarrantyBadge warrantyMonths={r.warrantyMonths} warrantyExpiry={r.warrantyExpiry} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Warranty;
