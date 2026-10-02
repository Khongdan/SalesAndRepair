import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import StateBanner from '../../components/ui/StateBanner.jsx';
import { getDashboard } from '../../services/report.service.js';

function money(n) { return Number(n || 0).toLocaleString('vi-VN') + ' đ'; }

function StatCard({ label, value, tone }) {
  return (
    <div className={`stat-card ${tone ? `stat-card-${tone}` : ''}`}>
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value}</div>
    </div>
  );
}

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch((err) => setError(err?.response?.data?.message || 'Không thể tải dữ liệu dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <StateBanner type="loading" />;
  if (error) return <StateBanner type="error" message={error} />;
  if (!data) return null;

  const revenueChartData = data.revenueByDay.map((d) => ({ day: d.Day.slice(5), revenue: Number(d.Revenue) }));
  const salesVsRepairData = [
    { name: 'Bán hàng', value: Number(data.salesVsRepairThisMonth.SalesRevenue) },
    { name: 'Sửa chữa', value: Number(data.salesVsRepairThisMonth.RepairRevenue) },
  ];
  const lowStockAll = data.lowStockProducts;

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="stat-grid">
        <StatCard label="Doanh thu hôm nay" value={money(data.todayRevenue)} />
        <StatCard label="Đơn hàng hôm nay" value={data.todayOrderCount} />
        <StatCard label="Doanh thu tháng này" value={money(data.monthRevenue)} />
        <StatCard label="Lợi nhuận ước tính (tháng)" value={money(data.estimatedProfitThisMonth)} tone="profit" />
        <StatCard label="Phiếu sửa chữa đang xử lý" value={data.activeRepairs} />
        <StatCard label="Phiếu đã sửa xong (chờ giao)" value={data.unfinishedRepairs} tone="warning" />
        <StatCard label="Sản phẩm đang kinh doanh" value={data.productCount} />
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <h2>Doanh thu bán hàng 14 ngày gần đây</h2>
          {revenueChartData.length === 0 ? <StateBanner type="empty" message="Chưa có dữ liệu doanh thu" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262b36" />
                <XAxis dataKey="day" stroke="#8b93a1" fontSize={12} />
                <YAxis stroke="#8b93a1" fontSize={12} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}tr`} />
                <Tooltip formatter={(v) => money(v)} contentStyle={{ background: '#161a22', border: '1px solid #262b36' }} />
                <Line type="monotone" dataKey="revenue" stroke="#4f8cff" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="panel">
          <h2>Doanh thu bán hàng vs sửa chữa (tháng này)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={salesVsRepairData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262b36" />
              <XAxis dataKey="name" stroke="#8b93a1" fontSize={12} />
              <YAxis stroke="#8b93a1" fontSize={12} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}tr`} />
              <Tooltip formatter={(v) => money(v)} contentStyle={{ background: '#161a22', border: '1px solid #262b36' }} />
              <Bar dataKey="value" fill="#4f8cff" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="dashboard-grid" style={{ marginTop: 24 }}>
        <div className="panel">
          <h2>Đơn hàng gần đây</h2>
          {data.recentSales.length === 0 ? <StateBanner type="empty" /> : (
            <table className="data-table">
              <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày</th><th>Thành tiền</th></tr></thead>
              <tbody>
                {data.recentSales.map((o) => (
                  <tr key={o.SalesOrderCode}>
                    <td>{o.SalesOrderCode}</td>
                    <td>{o.CustomerName || 'Khách vãng lai'}</td>
                    <td>{new Date(o.OrderDate).toLocaleDateString('vi-VN')}</td>
                    <td>{money(o.FinalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel">
          <h2>Phiếu sửa chữa gần đây</h2>
          {data.recentRepairs.length === 0 ? <StateBanner type="empty" /> : (
            <table className="data-table">
              <thead><tr><th>Mã phiếu</th><th>Khách hàng</th><th>Trạng thái</th><th>Ngày nhận</th></tr></thead>
              <tbody>
                {data.recentRepairs.map((r) => (
                  <tr key={r.RepairOrderCode}>
                    <td>{r.RepairOrderCode}</td>
                    <td>{r.CustomerName}</td>
                    <td>{r.Status}</td>
                    <td>{new Date(r.ReceivedDate).toLocaleDateString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 24 }}>
        <h2>Sản phẩm sắp hết hàng</h2>
        {lowStockAll.length === 0 ? <StateBanner type="empty" message="Không có hàng sắp hết" /> : (
          <ul className="low-stock-list">
            {data.lowStockProducts.map((p) => (
              <li key={`p-${p.ProductID}`}>
                <span className="badge badge-warning">SP</span>{p.ProductCode} — {p.ProductName}
                <strong> ({p.Quantity}/{p.MinStock})</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
