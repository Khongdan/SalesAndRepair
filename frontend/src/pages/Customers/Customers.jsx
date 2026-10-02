import React, { useEffect, useState, useCallback } from 'react';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import Toast from '../../components/ui/Toast.jsx';
import StateBanner from '../../components/ui/StateBanner.jsx';
import WarrantyBadge from '../../components/ui/WarrantyBadge.jsx';
import {
  getCustomers,
  getCustomerHistory,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../../services/customer.service.js';

const EMPTY_FORM = { fullName: '', phone: '', email: '', address: '', note: '' };

function CustomerForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(initial);
  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form className="entity-form" onSubmit={handleSubmit}>
      <label>
        Họ tên *
        <input value={form.fullName} onChange={handleChange('fullName')} required />
      </label>
      <div className="form-row">
        <label>
          Số điện thoại
          <input value={form.phone} onChange={handleChange('phone')} />
        </label>
        <label>
          Email
          <input value={form.email} onChange={handleChange('email')} />
        </label>
      </div>
      <label>
        Địa chỉ
        <input value={form.address} onChange={handleChange('address')} />
      </label>
      <label>
        Ghi chú
        <textarea rows="2" value={form.note} onChange={handleChange('note')} />
      </label>
      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>Hủy</button>
        <button type="submit" className="btn-primary">Lưu</button>
      </div>
    </form>
  );
}

function CustomerHistory({ customer, onClose }) {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCustomerHistory(customer.CustomerID).then(setHistory).finally(() => setLoading(false));
  }, [customer.CustomerID]);

  return (
    <Modal title={`Lịch sử khách hàng — ${customer.FullName}`} onClose={onClose} width={640}>
      {loading && <StateBanner type="loading" />}
      {!loading && history && (
        <>
          <p>Tổng chi tiêu: <strong>{Number(history.totalSpent).toLocaleString('vi-VN')} đ</strong></p>

          <h3>Lịch sử mua hàng</h3>
          {history.purchases.length === 0 ? (
            <StateBanner type="empty" message="Chưa có đơn mua hàng" />
          ) : (
            <table className="data-table">
              <thead><tr><th>Mã đơn</th><th>Ngày</th><th>Thành tiền</th><th>Trạng thái</th><th>Còn nợ</th><th>Bảo hành</th></tr></thead>
              <tbody>
                {history.purchases.map((p) => {
                  const remaining = Number(p.FinalAmount) - Number(p.PaidAmount || 0);
                  return (
                    <tr key={p.SalesOrderID}>
                      <td>{p.SalesOrderCode}</td>
                      <td>{new Date(p.OrderDate).toLocaleDateString('vi-VN')}</td>
                      <td>{Number(p.FinalAmount).toLocaleString('vi-VN')} đ</td>
                      <td>{p.Status}</td>
                      <td>{remaining > 0 ? <span className="badge badge-warranty-EXPIRED">{remaining.toLocaleString('vi-VN')} đ</span> : <span className="badge badge-warranty-ACTIVE">Đã trả đủ</span>}</td>
                      <td>{p.WarrantyExpiry ? <WarrantyBadge warrantyMonths={1} warrantyExpiry={p.WarrantyExpiry} /> : <span className="badge badge-warranty-NONE">Không bảo hành</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <h3 style={{ marginTop: 20 }}>Lịch sử sửa chữa</h3>
          {history.repairs.length === 0 ? (
            <StateBanner type="empty" message="Chưa có phiếu sửa chữa" />
          ) : (
            <table className="data-table">
              <thead><tr><th>Mã phiếu</th><th>Xe</th><th>Ngày nhận</th><th>Trạng thái</th><th>Còn nợ</th><th>Bảo hành</th></tr></thead>
              <tbody>
                {history.repairs.map((r) => {
                  const remaining = Number(r.TotalCost || 0) - Number(r.PaidAmount || 0);
                  return (
                    <tr key={r.RepairOrderID}>
                      <td>{r.RepairOrderCode}</td>
                      <td>{r.Brand} {r.Model}</td>
                      <td>{new Date(r.ReceivedDate).toLocaleDateString('vi-VN')}</td>
                      <td>{r.Status}</td>
                      <td>{remaining > 0 ? <span className="badge badge-warranty-EXPIRED">{remaining.toLocaleString('vi-VN')} đ</span> : <span className="badge badge-warranty-ACTIVE">Đã trả đủ</span>}</td>
                      <td><WarrantyBadge warrantyMonths={r.WarrantyMonths} warrantyExpiry={r.WarrantyExpiry} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </>
      )}
    </Modal>
  );
}

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deletingCustomer, setDeletingCustomer] = useState(null);
  const [historyCustomer, setHistoryCustomer] = useState(null);
  const [toast, setToast] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getCustomers({ page, pageSize, search });
      setCustomers(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err?.response?.data?.message || 'Không thể tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { loadData(); }, [loadData]);

  const openCreate = () => { setEditingCustomer(null); setShowForm(true); };
  const openEdit = (c) => { setEditingCustomer(c); setShowForm(true); };

  const handleSubmit = async (form) => {
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.CustomerID, form);
        setToast({ type: 'success', message: 'Cập nhật khách hàng thành công' });
      } else {
        await createCustomer(form);
        setToast({ type: 'success', message: 'Thêm khách hàng thành công' });
      }
      setShowForm(false);
      loadData();
    } catch (err) {
      setToast({ type: 'error', message: err?.response?.data?.message || 'Có lỗi xảy ra' });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCustomer(deletingCustomer.CustomerID);
      setToast({ type: 'success', message: 'Đã xóa khách hàng' });
      setDeletingCustomer(null);
      loadData();
    } catch (err) {
      setToast({ type: 'error', message: err?.response?.data?.message || 'Có lỗi xảy ra' });
      setDeletingCustomer(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="page-header">
        <h1>Khách hàng</h1>
        <button className="btn-primary" onClick={openCreate}>+ Thêm khách hàng</button>
      </div>

      <div className="filter-bar">
        <input
          placeholder="Tìm theo tên, SĐT hoặc mã khách hàng..."
          value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value); }}
        />
      </div>

      {loading && <StateBanner type="loading" />}
      {!loading && error && <StateBanner type="error" message={error} />}
      {!loading && !error && customers.length === 0 && <StateBanner type="empty" />}

      {!loading && !error && customers.length > 0 && (
        <>
          <table className="data-table">
            <thead>
              <tr><th>Mã KH</th><th>Họ tên</th><th>SĐT</th><th>Email</th><th></th></tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.CustomerID}>
                  <td>{c.CustomerCode}</td>
                  <td>{c.FullName}</td>
                  <td>{c.Phone || '—'}</td>
                  <td>{c.Email || '—'}</td>
                  <td className="table-actions">
                    <button className="btn-link" onClick={() => setHistoryCustomer(c)}>Lịch sử</button>
                    <button className="btn-link" onClick={() => openEdit(c)}>Sửa</button>
                    <button className="btn-link btn-link-danger" onClick={() => setDeletingCustomer(c)}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Trước</button>
            <span>Trang {page}/{totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Sau ›</button>
          </div>
        </>
      )}

      {showForm && (
        <Modal title={editingCustomer ? 'Sửa khách hàng' : 'Thêm khách hàng'} onClose={() => setShowForm(false)}>
          <CustomerForm
            initial={editingCustomer ? {
              fullName: editingCustomer.FullName,
              phone: editingCustomer.Phone || '',
              email: editingCustomer.Email || '',
              address: editingCustomer.Address || '',
              note: editingCustomer.Note || '',
            } : EMPTY_FORM}
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
          />
        </Modal>
      )}

      {deletingCustomer && (
        <ConfirmDialog
          message={`Bạn có chắc muốn xóa khách hàng "${deletingCustomer.FullName}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingCustomer(null)}
        />
      )}

      {historyCustomer && (
        <CustomerHistory customer={historyCustomer} onClose={() => setHistoryCustomer(null)} />
      )}

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}

export default Customers;
