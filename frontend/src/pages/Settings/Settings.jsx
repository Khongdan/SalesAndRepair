import React, { useEffect, useState, useCallback } from 'react';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import Toast from '../../components/ui/Toast.jsx';
import StateBanner from '../../components/ui/StateBanner.jsx';
import ImageUploadField from '../../components/ui/ImageUploadField.jsx';
import { resolveImageUrl } from '../../utils/imageUrl.js';
import { getCurrentUser, changePassword } from '../../services/auth.service.js';
import { getStoreSettings, updateStoreSettings } from '../../services/storeSettings.service.js';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../services/category.service.js';
import {
  getRepairServices, createRepairService, updateRepairService, deleteRepairService,
} from '../../services/serviceCatalog.service.js';

/* ------------------------------------------------------------------ */
/* Tab 1: Đổi mật khẩu cá nhân                                          */
/* ------------------------------------------------------------------ */
function ChangePasswordTab() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setToast({ type: 'error', message: 'Mật khẩu mới nhập lại không khớp' });
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(oldPassword, newPassword);
      setToast({ type: 'success', message: 'Đổi mật khẩu thành công' });
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      setToast({ type: 'error', message: err?.response?.data?.message || 'Có lỗi xảy ra' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="panel">
      <h2>Đổi mật khẩu</h2>
      <form className="entity-form" style={{ maxWidth: 360 }} onSubmit={handleSubmit}>
        <label>
          Mật khẩu hiện tại *
          <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required />
        </label>
        <label>
          Mật khẩu mới *
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
        </label>
        <label>
          Nhập lại mật khẩu mới *
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
        </label>
        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Đang lưu...' : 'Đổi mật khẩu'}
          </button>
        </div>
      </form>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 2: Thông tin cửa hàng (in hóa đơn)                               */
/* ------------------------------------------------------------------ */
function StoreInfoTab({ isAdmin }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    getStoreSettings()
      .then((data) => setForm({
        storeName: data.StoreName || '',
        address: data.Address || '',
        phone: data.Phone || '',
        email: data.Email || '',
        taxCode: data.TaxCode || '',
        logoUrl: data.LogoURL || '',
        paymentQrBankBin: data.PaymentQrBankBin || '',
        paymentQrAccountNumber: data.PaymentQrAccountNumber || '',
        paymentQrAccountName: data.PaymentQrAccountName || '',
        paymentQrImageUrl: data.PaymentQrImageURL || '',
      }))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateStoreSettings(form);
      setToast({ type: 'success', message: 'Cập nhật thông tin cửa hàng thành công' });
    } catch (err) {
      setToast({ type: 'error', message: err?.response?.data?.message || 'Có lỗi xảy ra' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel">
      <h2>Thông tin cửa hàng</h2>
      <p style={{ fontSize: 12, color: 'var(--color-muted)' }}>
        Thông tin này sẽ hiển thị trên hóa đơn bán hàng và phiếu sửa chữa khi in.
      </p>
      {loading && <StateBanner type="loading" />}
      {!loading && form && (
        <form className="entity-form" style={{ maxWidth: 480 }} onSubmit={handleSubmit}>
          <label>
            Tên cửa hàng *
            <input value={form.storeName} onChange={handleChange('storeName')} required disabled={!isAdmin} />
          </label>
          <label>
            Địa chỉ
            <input value={form.address} onChange={handleChange('address')} disabled={!isAdmin} />
          </label>
          <div className="form-row">
            <label>
              Số điện thoại
              <input value={form.phone} onChange={handleChange('phone')} disabled={!isAdmin} />
            </label>
            <label>
              Email
              <input value={form.email} onChange={handleChange('email')} disabled={!isAdmin} />
            </label>
          </div>
          <div className="form-row">
            <label>
              Mã số thuế
              <input value={form.taxCode} onChange={handleChange('taxCode')} disabled={!isAdmin} />
            </label>
            <label>
              URL logo
              <input value={form.logoUrl} onChange={handleChange('logoUrl')} disabled={!isAdmin} />
            </label>
          </div>

          <h3 style={{ marginTop: 20 }}>QR chuyển khoản trên hóa đơn</h3>
          <p style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 0 }}>
            Tải lên ảnh mã QR nhận tiền THẬT của cửa hàng (chụp màn hình hoặc lưu ảnh từ mục
            "Nhận tiền / Mã QR của tôi" trong app ngân hàng/MoMo) — hệ thống sẽ in đúng ảnh này lên
            hóa đơn/phiếu khi còn nợ, không qua bất kỳ dịch vụ dựng QR nào khác nên luôn chính xác.
          </p>
          {isAdmin ? (
            <ImageUploadField
              target="settings"
              label="Ảnh mã QR nhận thanh toán"
              value={form.paymentQrImageUrl}
              onChange={(url) => setForm((prev) => ({ ...prev, paymentQrImageUrl: url }))}
            />
          ) : (
            form.paymentQrImageUrl && (
              <img src={resolveImageUrl(form.paymentQrImageUrl)} alt="QR nhận thanh toán" style={{ width: 140, borderRadius: 8 }} />
            )
          )}

          <details style={{ marginTop: 14 }}>
            <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--color-muted)' }}>
              Chưa có sẵn ảnh QR? Điền thông tin bên dưới để hệ thống tự dựng QR (nâng cao)
            </summary>
            <p style={{ fontSize: 12, color: 'var(--color-muted)' }}>
              Chỉ dùng khi CHƯA tải ảnh QR ở trên — điền đủ 2 mục đầu để hệ thống tự dựng mã QR qua
              dịch vụ VietQR công khai. Cách này cần đúng mã BIN ngân hàng nên dễ sai/lỗi hơn ảnh tải
              lên trực tiếp; nếu đã có ảnh QR ở trên thì bỏ trống phần này cũng được, hệ thống luôn ưu
              tiên dùng ảnh đã tải lên.
            </p>
            <div className="form-row">
              <label>
                Mã ngân hàng (BIN VietQR)
                <input value={form.paymentQrBankBin} onChange={handleChange('paymentQrBankBin')} placeholder="VD: 970436 (Vietcombank), hoặc mã MoMo" disabled={!isAdmin} />
              </label>
              <label>
                Số tài khoản / Số điện thoại nhận tiền
                <input value={form.paymentQrAccountNumber} onChange={handleChange('paymentQrAccountNumber')} placeholder="VD: 0912345678" disabled={!isAdmin} />
              </label>
            </div>
            <label>
              Tên chủ tài khoản (không dấu, tùy chọn)
              <input value={form.paymentQrAccountName} onChange={handleChange('paymentQrAccountName')} placeholder="VD: NGUYEN VAN A" disabled={!isAdmin} />
            </label>
          </details>

          {isAdmin ? (
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--color-muted)' }}>
              Chỉ ADMIN được sửa thông tin cửa hàng.
            </p>
          )}
        </form>
      )}
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 3: Quản lý danh mục sản phẩm (Categories)                        */
/* ------------------------------------------------------------------ */
function CategoriesTab() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState({ categoryName: '', description: '' });
  const [toast, setToast] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    getCategories().then(setCategories).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ categoryName: '', description: '' }); setShowForm(true); };
  const openEdit = (c) => { setEditing(c); setForm({ categoryName: c.CategoryName, description: c.Description || '' }); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateCategory(editing.CategoryID, form);
        setToast({ type: 'success', message: 'Cập nhật danh mục thành công' });
      } else {
        await createCategory(form);
        setToast({ type: 'success', message: 'Thêm danh mục thành công' });
      }
      setShowForm(false);
      load();
    } catch (err) {
      setToast({ type: 'error', message: err?.response?.data?.message || 'Có lỗi xảy ra' });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCategory(deleting.CategoryID);
      setToast({ type: 'success', message: 'Đã xóa danh mục' });
      setDeleting(null);
      load();
    } catch (err) {
      setToast({ type: 'error', message: err?.response?.data?.message || 'Có lỗi xảy ra (danh mục có thể đang được sản phẩm sử dụng)' });
      setDeleting(null);
    }
  };

  return (
    <div className="panel">
      <div className="page-header" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Danh mục sản phẩm</h2>
        <button className="btn-secondary" onClick={openCreate}>+ Thêm danh mục</button>
      </div>
      {loading && <StateBanner type="loading" />}
      {!loading && categories.length === 0 && <StateBanner type="empty" />}
      {!loading && categories.length > 0 && (
        <table className="data-table">
          <thead><tr><th>Tên danh mục</th><th>Mô tả</th><th></th></tr></thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.CategoryID}>
                <td>{c.CategoryName}</td>
                <td>{c.Description || '—'}</td>
                <td className="table-actions">
                  <button className="btn-link" onClick={() => openEdit(c)}>Sửa</button>
                  <button className="btn-link btn-link-danger" onClick={() => setDeleting(c)}>Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <Modal title={editing ? 'Sửa danh mục' : 'Thêm danh mục'} onClose={() => setShowForm(false)}>
          <form className="entity-form" onSubmit={handleSubmit}>
            <label>
              Tên danh mục *
              <input value={form.categoryName} onChange={(e) => setForm((p) => ({ ...p, categoryName: e.target.value }))} required />
            </label>
            <label>
              Mô tả
              <textarea rows="2" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </label>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Hủy</button>
              <button type="submit" className="btn-primary">Lưu</button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          message={`Bạn có chắc muốn xóa danh mục "${deleting.CategoryName}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 4: Quản lý bảng giá công sửa chữa (RepairServices)               */
/* ------------------------------------------------------------------ */
function RepairServicesTab() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState({ serviceName: '', defaultPrice: 0, description: '' });
  const [toast, setToast] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    getRepairServices().then(setServices).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ serviceName: '', defaultPrice: 0, description: '' }); setShowForm(true); };
  const openEdit = (s) => { setEditing(s); setForm({ serviceName: s.ServiceName, defaultPrice: s.DefaultPrice, description: s.Description || '' }); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateRepairService(editing.RepairServiceID, form);
        setToast({ type: 'success', message: 'Cập nhật dịch vụ thành công' });
      } else {
        await createRepairService(form);
        setToast({ type: 'success', message: 'Thêm dịch vụ thành công' });
      }
      setShowForm(false);
      load();
    } catch (err) {
      setToast({ type: 'error', message: err?.response?.data?.message || 'Có lỗi xảy ra' });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteRepairService(deleting.RepairServiceID);
      setToast({ type: 'success', message: 'Đã xóa dịch vụ' });
      setDeleting(null);
      load();
    } catch (err) {
      setToast({ type: 'error', message: err?.response?.data?.message || 'Có lỗi xảy ra' });
      setDeleting(null);
    }
  };

  return (
    <div className="panel">
      <div className="page-header" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Bảng giá công sửa chữa</h2>
        <button className="btn-secondary" onClick={openCreate}>+ Thêm dịch vụ</button>
      </div>
      {loading && <StateBanner type="loading" />}
      {!loading && services.length === 0 && <StateBanner type="empty" />}
      {!loading && services.length > 0 && (
        <table className="data-table">
          <thead><tr><th>Tên dịch vụ</th><th>Giá mặc định</th><th>Mô tả</th><th></th></tr></thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.RepairServiceID}>
                <td>{s.ServiceName}</td>
                <td>{Number(s.DefaultPrice).toLocaleString('vi-VN')} đ</td>
                <td>{s.Description || '—'}</td>
                <td className="table-actions">
                  <button className="btn-link" onClick={() => openEdit(s)}>Sửa</button>
                  <button className="btn-link btn-link-danger" onClick={() => setDeleting(s)}>Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <Modal title={editing ? 'Sửa dịch vụ' : 'Thêm dịch vụ'} onClose={() => setShowForm(false)}>
          <form className="entity-form" onSubmit={handleSubmit}>
            <label>
              Tên dịch vụ *
              <input value={form.serviceName} onChange={(e) => setForm((p) => ({ ...p, serviceName: e.target.value }))} required />
            </label>
            <label>
              Giá mặc định
              <input type="number" min="0" value={form.defaultPrice} onChange={(e) => setForm((p) => ({ ...p, defaultPrice: e.target.value }))} />
            </label>
            <label>
              Mô tả
              <textarea rows="2" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </label>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Hủy</button>
              <button type="submit" className="btn-primary">Lưu</button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          message={`Bạn có chắc muốn xóa dịch vụ "${deleting.ServiceName}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Container: Cài đặt                                                   */
/* ------------------------------------------------------------------ */
const TABS = [
  { key: 'password', label: 'Đổi mật khẩu' },
  { key: 'store', label: 'Thông tin cửa hàng' },
  { key: 'categories', label: 'Danh mục sản phẩm' },
  { key: 'services', label: 'Bảng giá sửa chữa' },
];

function Settings() {
  const [activeTab, setActiveTab] = useState('password');
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.roleName === 'ADMIN';

  // Chỉ ADMIN mới quản lý được danh mục/dịch vụ — role khác chỉ thấy tab Đổi mật khẩu + xem thông tin cửa hàng.
  const visibleTabs = TABS.filter((t) => isAdmin || t.key === 'password' || t.key === 'store');

  return (
    <div>
      <div className="page-header">
        <h1>Cài đặt</h1>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        {visibleTabs.map((t) => (
          <button key={t.key} className={activeTab === t.key ? 'tab-active' : ''} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'password' && <ChangePasswordTab />}
      {activeTab === 'store' && <StoreInfoTab isAdmin={isAdmin} />}
      {activeTab === 'categories' && isAdmin && <CategoriesTab />}
      {activeTab === 'services' && isAdmin && <RepairServicesTab />}
    </div>
  );
}

export default Settings;
