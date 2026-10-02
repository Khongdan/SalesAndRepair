import React, { useEffect, useState, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StateBanner from '../../components/ui/StateBanner.jsx';
import Toast from '../../components/ui/Toast.jsx';
import WarrantyBadge from '../../components/ui/WarrantyBadge.jsx';
import { getCurrentUser } from '../../services/auth.service.js';
import {
  getRevenueReport,
  getProfitReport,
  getTopProducts,
  getTopComponents,
  getInventoryReport,
  getRevenueSummary,
  getDebtReport,
  downloadDebtCsv,
  downloadRevenueCsv,
  downloadReportsXlsx,
} from '../../services/report.service.js';
import { getExpiringWarranties, downloadExpiringWarrantiesCsv } from '../../services/warranty.service.js';
import { getActivityLogs } from '../../services/activityLog.service.js';

function money(n) { return Number(n || 0).toLocaleString('vi-VN') + ' đ'; }

function RevenueSection({ dateRange }) {
  const [revenue, setRevenue] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getRevenueReport({ ...dateRange, groupBy: 'day' }),
      getRevenueSummary(dateRange),
    ]).then(([r, s]) => { setRevenue(r); setSummary(s); }).finally(() => setLoading(false));
  }, [dateRange]);

  const chartData = revenue?.sales.map((d) => ({ period: d.Period, revenue: Number(d.Revenue) })) || [];

  const handleExport = async () => {
    try {
      await downloadRevenueCsv(dateRange);
    } catch (err) {
      setToast({ type: 'error', message: 'Không thể xuất CSV' });
    }
  };

  return (
    <div className="panel">
      <div className="page-header" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Doanh thu</h2>
        <button className="btn-secondary" onClick={handleExport}>Xuất CSV</button>
      </div>
      {loading && <StateBanner type="loading" />}
      {!loading && summary && (
        <div className="stat-grid" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-card-label">Doanh thu bán hàng</div>
            <div className="stat-card-value">{money(summary.salesRevenue)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Doanh thu sửa chữa</div>
            <div className="stat-card-value">{money(summary.repairRevenue)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Số đơn bán hàng</div>
            <div className="stat-card-value">{summary.salesOrderCount}</div>
          </div>
        </div>
      )}
      {!loading && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262b36" />
            <XAxis dataKey="period" stroke="#8b93a1" fontSize={12} />
            <YAxis stroke="#8b93a1" fontSize={12} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}tr`} />
            <Tooltip formatter={(v) => money(v)} contentStyle={{ background: '#161a22', border: '1px solid #262b36' }} />
            <Line type="monotone" dataKey="revenue" stroke="#4f8cff" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}

function ProfitSection({ dateRange }) {
  const [profit, setProfit] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getProfitReport(dateRange).then(setProfit).finally(() => setLoading(false));
  }, [dateRange]);

  return (
    <div className="panel">
      <h2>Lợi nhuận (ước tính)</h2>
      <p style={{ fontSize: 12, color: 'var(--color-muted)' }}>
        * Tính theo giá nhập hiện tại của sản phẩm — không phải giá vốn lịch sử chính xác tại thời điểm bán.
      </p>
      {loading && <StateBanner type="loading" />}
      {!loading && profit && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-card-label">Doanh thu</div>
            <div className="stat-card-value">{money(profit.revenue)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Giá vốn ước tính</div>
            <div className="stat-card-value">{money(profit.estimatedCost)}</div>
          </div>
          <div className="stat-card stat-card-profit">
            <div className="stat-card-label">Lợi nhuận ước tính</div>
            <div className="stat-card-value">{money(profit.estimatedProfit)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function TopItemsSection({ dateRange }) {
  const [topProducts, setTopProducts] = useState([]);
  const [topComponents, setTopComponents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getTopProducts(dateRange), getTopComponents(dateRange)])
      .then(([p, c]) => { setTopProducts(p); setTopComponents(c); })
      .finally(() => setLoading(false));
  }, [dateRange]);

  return (
    <div className="dashboard-grid">
      <div className="panel">
        <h2>Sản phẩm bán chạy</h2>
        {loading && <StateBanner type="loading" />}
        {!loading && topProducts.length === 0 && <StateBanner type="empty" />}
        {!loading && topProducts.length > 0 && (
          <table className="data-table">
            <thead><tr><th>Sản phẩm</th><th>SL bán</th><th>Doanh thu</th></tr></thead>
            <tbody>
              {topProducts.map((p) => (
                <tr key={p.ProductID}><td>{p.ProductName}</td><td>{p.TotalQuantitySold}</td><td>{money(p.TotalRevenue)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="panel">
        <h2>Linh kiện sử dụng nhiều</h2>
        {loading && <StateBanner type="loading" />}
        {!loading && topComponents.length === 0 && <StateBanner type="empty" />}
        {!loading && topComponents.length > 0 && (
          <table className="data-table">
            <thead><tr><th>Linh kiện</th><th>SL dùng</th><th>Doanh thu</th></tr></thead>
            <tbody>
              {topComponents.map((c) => (
                <tr key={c.ComponentID}><td>{c.ComponentName}</td><td>{c.TotalQuantityUsed}</td><td>{money(c.TotalRevenue)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function InventoryReportSection() {
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInventoryReport().then(setInventory).finally(() => setLoading(false));
  }, []);

  return (
    <div className="panel">
      <h2>Tồn kho</h2>
      {loading && <StateBanner type="loading" />}
      {!loading && inventory && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-card-label">Tổng SL sản phẩm tồn</div>
            <div className="stat-card-value">{inventory.products.TotalUnits}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Giá trị tồn sản phẩm</div>
            <div className="stat-card-value">{money(inventory.products.TotalValue)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

const TYPE_LABEL = { SALE: 'Bán hàng', REPAIR: 'Sửa chữa' };

function DebtSection() {
  const [data, setData] = useState({ rows: [], totalDebt: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    getDebtReport().then(setData).finally(() => setLoading(false));
  }, []);

  const handleExport = async () => {
    try {
      await downloadDebtCsv();
    } catch (err) {
      setToast({ type: 'error', message: 'Không thể xuất CSV' });
    }
  };

  return (
    <div className="panel">
      <div className="page-header" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Công nợ khách hàng</h2>
        <button className="btn-secondary" onClick={handleExport}>Xuất CSV</button>
      </div>
      {loading && <StateBanner type="loading" />}
      {!loading && (
        <p style={{ marginTop: 0, marginBottom: 12 }}>
          Tổng công nợ: <strong style={{ color: '#ff8787' }}>{Number(data.totalDebt).toLocaleString('vi-VN')} đ</strong>
          {' '}· Số đơn/phiếu còn nợ: {data.count}
        </p>
      )}
      {!loading && data.rows.length === 0 && <StateBanner type="empty" message="Không có công nợ nào — mọi đơn/phiếu đã thanh toán đủ" />}
      {!loading && data.rows.length > 0 && (
        <table className="data-table">
          <thead>
            <tr><th>Loại</th><th>Mã đơn/phiếu</th><th>Khách hàng</th><th>SĐT</th><th>Tổng tiền</th><th>Đã trả</th><th>Còn nợ</th></tr>
          </thead>
          <tbody>
            {data.rows.map((r, idx) => (
              <tr key={`${r.type}-${r.orderCode}-${idx}`}>
                <td>{TYPE_LABEL[r.type] || r.type}</td>
                <td>{r.orderCode}</td>
                <td>{r.customerName}</td>
                <td>{r.customerPhone || '—'}</td>
                <td>{Number(r.totalAmount).toLocaleString('vi-VN')} đ</td>
                <td>{Number(r.paidAmount).toLocaleString('vi-VN')} đ</td>
                <td><strong style={{ color: '#ff8787' }}>{Number(r.remainingAmount).toLocaleString('vi-VN')} đ</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}

function WarrantyExpiringSection() {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setLoading(true);
    getExpiringWarranties({ days }).then(setRows).finally(() => setLoading(false));
  }, [days]);

  const handleExport = async () => {
    try {
      await downloadExpiringWarrantiesCsv({ days });
    } catch (err) {
      setToast({ type: 'error', message: 'Không thể xuất CSV' });
    }
  };

  return (
    <div className="panel">
      <div className="page-header" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Bảo hành sắp hết hạn</h2>
        <button className="btn-secondary" onClick={handleExport}>Xuất CSV</button>
      </div>
      <div className="filter-bar" style={{ marginBottom: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--color-muted)' }}>
          Sắp hết trong vòng
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>7 ngày</option>
            <option value={15}>15 ngày</option>
            <option value={30}>30 ngày</option>
            <option value={60}>60 ngày</option>
          </select>
        </label>
      </div>
      {loading && <StateBanner type="loading" />}
      {!loading && rows.length === 0 && <StateBanner type="empty" message="Không có bảo hành nào sắp hết hạn trong khoảng đã chọn" />}
      {!loading && rows.length > 0 && (
        <table className="data-table">
          <thead>
            <tr><th>Loại</th><th>Mã đơn/phiếu</th><th>Khách hàng</th><th>SĐT</th><th>Sản phẩm / Xe</th><th>Hạn bảo hành</th></tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={`${r.type}-${r.orderCode}-${idx}`}>
                <td>{TYPE_LABEL[r.type] || r.type}</td>
                <td>{r.orderCode}</td>
                <td>{r.customerName}</td>
                <td>{r.customerPhone || '—'}</td>
                <td>{r.itemName}</td>
                <td><WarrantyBadge warrantyMonths={1} warrantyExpiry={r.warrantyExpiry} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}

function ActivityLogSection() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getActivityLogs({ page: 1, pageSize: 30 }).then((res) => setLogs(res.items)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="panel">
      <h2>Nhật ký hệ thống (30 gần nhất)</h2>
      {loading && <StateBanner type="loading" />}
      {!loading && logs.length === 0 && <StateBanner type="empty" />}
      {!loading && logs.length > 0 && (
        <table className="data-table">
          <thead><tr><th>Thời gian</th><th>Người dùng</th><th>Hành động</th><th>Mô tả</th></tr></thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.ActivityLogID}>
                <td>{new Date(log.CreatedAt).toLocaleString('vi-VN')}</td>
                <td>{log.UserName || '—'}</td>
                <td>{log.Action}</td>
                <td>{log.Description || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Reports() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [exportToast, setExportToast] = useState(null);
  const dateRange = { startDate: startDate || undefined, endDate: endDate || undefined };

  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.roleName === 'ADMIN';

  const handleExportXlsx = async () => {
    setExportingXlsx(true);
    try {
      await downloadReportsXlsx(dateRange);
    } catch (err) {
      setExportToast({ type: 'error', message: 'Không thể xuất file Excel' });
    } finally {
      setExportingXlsx(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Báo cáo</h1>
        <button className="btn-primary" onClick={handleExportXlsx} disabled={exportingXlsx}>
          {exportingXlsx ? 'Đang xuất...' : '📊 Xuất Excel tổng hợp'}
        </button>
      </div>

      <div className="filter-bar">
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--color-muted)' }}>
          Từ ngày
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--color-muted)' }}>
          Đến ngày
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
      </div>

      <RevenueSection dateRange={dateRange} />
      <div style={{ marginTop: 24 }}><ProfitSection dateRange={dateRange} /></div>
      <div style={{ marginTop: 24 }}><TopItemsSection dateRange={dateRange} /></div>
      <div style={{ marginTop: 24 }}><InventoryReportSection /></div>
      <div style={{ marginTop: 24 }}><DebtSection /></div>
      <div style={{ marginTop: 24 }}><WarrantyExpiringSection /></div>
      {isAdmin && <div style={{ marginTop: 24 }}><ActivityLogSection /></div>}
      {exportToast && <Toast type={exportToast.type} message={exportToast.message} onClose={() => setExportToast(null)} />}
    </div>
  );
}

export default Reports;
