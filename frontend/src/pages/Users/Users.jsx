import React, { useEffect, useState, useCallback } from 'react';
import Modal from '../../components/ui/Modal.jsx';
import Toast from '../../components/ui/Toast.jsx';
import StateBanner from '../../components/ui/StateBanner.jsx';
import { getUsers, createUser, updateUser } from '../../services/user.service.js';
import { getRoles } from '../../services/role.service.js';

const EMPTY_FORM = { username: '', password: '', fullName: '', email: '', phone: '', roleId: '', status: 'ACTIVE' };

function UserForm({ initial, roles, onSubmit, onCancel, isEdit }) {
  const [form, setForm] = useState(initial);
  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form className="entity-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label>
          Username *
          <input value={form.username} onChange={handleChange('username')} required disabled={isEdit} />
        </label>
        {!isEdit && (
          <label>
            Mật khẩu *
            <input type="password" value={form.password} onChange={handleChange('password')} required minLength={6} />
          </label>
        )}
      </div>
      <label>
        Họ tên *
        <input value={form.fullName} onChange={handleChange('fullName')} required />
      </label>
      <div className="form-row">
        <label>
          Email
          <input value={form.email} onChange={handleChange('email')} />
        </label>
        <label>
          Số điện thoại
          <input value={form.phone} onChange={handleChange('phone')} />
        </label>
      </div>
      <div className="form-row">
        <label>
          Vai trò *
          <select value={form.roleId} onChange={handleChange('roleId')} required>
            <option value="">-- Chọn vai trò --</option>
            {roles.map((r) => <option key={r.RoleID} value={r.RoleID}>{r.RoleName}</option>)}
          </select>
        </label>
        {isEdit && (
          <label>
            Trạng thái
            <select value={form.status} onChange={handleChange('status')}>
              <option value="ACTIVE">Hoạt động</option>
              <option value="INACTIVE">Vô hiệu hóa</option>
            </select>
          </label>
        )}
      </div>
      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>Hủy</button>
        <button type="submit" className="btn-primary">Lưu</button>
      </div>
    </form>
  );
}

function Users() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [toast, setToast] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getUsers({ page, pageSize });
      setUsers(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err?.response?.data?.message || 'Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    getRoles().then(setRoles).catch(() => {});
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openCreate = () => { setEditingUser(null); setShowForm(true); };
  const openEdit = (u) => { setEditingUser(u); setShowForm(true); };

  const handleSubmit = async (form) => {
    try {
      if (editingUser) {
        await updateUser(editingUser.UserID, form);
        setToast({ type: 'success', message: 'Cập nhật người dùng thành công' });
      } else {
        await createUser(form);
        setToast({ type: 'success', message: 'Tạo người dùng thành công' });
      }
      setShowForm(false);
      loadData();
    } catch (err) {
      setToast({ type: 'error', message: err?.response?.data?.message || 'Có lỗi xảy ra' });
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="page-header">
        <h1>Người dùng</h1>
        <button className="btn-primary" onClick={openCreate}>+ Thêm người dùng</button>
      </div>

      {loading && <StateBanner type="loading" />}
      {!loading && error && <StateBanner type="error" message={error} />}
      {!loading && !error && users.length === 0 && <StateBanner type="empty" />}

      {!loading && !error && users.length > 0 && (
        <>
          <table className="data-table">
            <thead>
              <tr><th>Username</th><th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Trạng thái</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.UserID}>
                  <td>{u.Username}</td>
                  <td>{u.FullName}</td>
                  <td>{u.Email || '—'}</td>
                  <td>{u.RoleName}</td>
                  <td><span className={`badge badge-${u.Status}`}>{u.Status === 'ACTIVE' ? 'Hoạt động' : 'Vô hiệu hóa'}</span></td>
                  <td className="table-actions">
                    <button className="btn-link" onClick={() => openEdit(u)}>Sửa</button>
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
        <Modal title={editingUser ? 'Sửa người dùng' : 'Thêm người dùng'} onClose={() => setShowForm(false)}>
          <UserForm
            initial={editingUser ? {
              username: editingUser.Username,
              fullName: editingUser.FullName,
              email: editingUser.Email || '',
              phone: editingUser.Phone || '',
              roleId: editingUser.RoleID,
              status: editingUser.Status,
            } : EMPTY_FORM}
            roles={roles}
            isEdit={!!editingUser}
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
          />
        </Modal>
      )}

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}

export default Users;
