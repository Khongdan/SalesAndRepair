import React, { useEffect, useState, useCallback } from 'react';
import Modal from '../../components/ui/Modal.jsx';
import Toast from '../../components/ui/Toast.jsx';
import StateBanner from '../../components/ui/StateBanner.jsx';
import WarrantyBadge from '../../components/ui/WarrantyBadge.jsx';
import ImageUploadField from '../../components/ui/ImageUploadField.jsx';
import RepairDetailModal from './RepairDetailModal.jsx';
import { getAllCustomers } from '../../services/customer.service.js';
import { getDevicesByCustomer } from '../../services/device.service.js';
import { getRepairOrders, createRepairOrder, updateRepairStatus } from '../../services/repairOrder.service.js';

// Chỉ giữ 4 trạng thái cho gọn, dễ dùng.
const STATUS_OPTIONS = ['Tiếp nhận', 'Đang sửa', 'Đã sửa xong', 'Đã giao khách'];

// Loại xe thường gặp ở cửa hàng — chọn nhanh, vẫn có thể gõ tay khi chọn "Khác".
const DEVICE_TYPE_OPTIONS = ['Xe máy', 'Xe đạp', 'Xe đạp điện', 'Khác'];

const EMPTY_ORDER_FORM = {
  isWalkIn: false, customerId: '', customerName: '', customerPhone: '',
  deviceId: '', useNewDevice: true,
  device: { deviceType: 'Xe máy', imei: '', note: '' },
  imageUrl: '',
  initialCondition: '', reportedIssue: '', accessories: '', note: '',
};

function CreateRepairForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState(EMPTY_ORDER_FORM);
  const [customers, setCustomers] = useState([]);
  const [devices, setDevices] = useState([]);
  // "Khác" trong danh sách loại xe -> hiện thêm ô nhập tay để gõ loại xe cụ thể.
  const [isCustomDeviceType, setIsCustomDeviceType] = useState(false);

  useEffect(() => {
    getAllCustomers().then(setCustomers).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.customerId) {
      getDevicesByCustomer(Number(form.customerId)).then(setDevices).catch(() => setDevices([]));
    } else {
      setDevices([]);
    }
  }, [form.customerId]);

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const handleDeviceChange = (field) => (e) => setForm((prev) => ({ ...prev, device: { ...prev.device, [field]: e.target.value } }));

  const handleDeviceTypeSelect = (e) => {
    const val = e.target.value;
    if (val === 'Khác') {
      setIsCustomDeviceType(true);
      setForm((prev) => ({ ...prev, device: { ...prev.device, deviceType: '' } }));
    } else {
      setIsCustomDeviceType(false);
      setForm((prev) => ({ ...prev, device: { ...prev.device, deviceType: val } }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      initialCondition: form.initialCondition,
      reportedIssue: form.reportedIssue,
      accessories: form.accessories,
      imageUrl: form.imageUrl || undefined,
      note: form.note,
    };
    // Khách vãng lai (chưa có/không nhớ trong danh sách): gửi tên (và SĐT
    // nếu có) để backend tự tạo/tìm khách hàng, thay vì bắt buộc customerId.
    if (form.isWalkIn) {
      payload.customerName = form.customerName;
      payload.customerPhone = form.customerPhone || undefined;
    } else {
      payload.customerId = Number(form.customerId);
    }
    if (form.useNewDevice || !form.deviceId) {
      payload.device = form.device;
    } else {
      payload.deviceId = Number(form.deviceId);
    }
    onSubmit(payload);
  };

  return (
    <form className="entity-form" onSubmit={handleSubmit}>
      <button
        type="button"
        className={form.isWalkIn ? 'btn-primary' : 'btn-secondary'}
        style={{ alignSelf: 'flex-start' }}
        onClick={() => setForm((prev) => ({ ...prev, isWalkIn: !prev.isWalkIn, customerId: '' }))}
      >
        {form.isWalkIn ? '✓ ' : ''}Khách mới / vãng lai (chưa có trong danh sách)
      </button>

      {form.isWalkIn ? (
        <div className="form-row">
          <label>
            Tên khách hàng *
            <input value={form.customerName} onChange={handleChange('customerName')} required placeholder="Tên khách hàng" />
          </label>
          <label>
            Số điện thoại
            <input value={form.customerPhone} onChange={handleChange('customerPhone')} placeholder="Không bắt buộc" />
          </label>
        </div>
      ) : (
        <label>
          Khách hàng *
          <select value={form.customerId} onChange={handleChange('customerId')} required>
            <option value="">-- Chọn khách hàng --</option>
            {customers.map((c) => <option key={c.CustomerID} value={c.CustomerID}>{c.FullName} — {c.Phone}</option>)}
          </select>
        </label>
      )}

      {devices.length > 0 && (
        <label>
          <input
            type="checkbox"
            checked={form.useNewDevice}
            onChange={(e) => setForm((prev) => ({ ...prev, useNewDevice: e.target.checked }))}
            style={{ marginRight: 8 }}
          />
          Thêm xe mới (bỏ chọn để dùng xe đã có)
        </label>
      )}

      {!form.useNewDevice && devices.length > 0 ? (
        <label>
          Xe đã có
          <select value={form.deviceId} onChange={handleChange('deviceId')}>
            <option value="">-- Chọn xe --</option>
            {devices.map((d) => <option key={d.DeviceID} value={d.DeviceID}>{d.DeviceType} {d.Brand} {d.Model} {d.IMEI ? `— ${d.IMEI}` : ''}</option>)}
          </select>
        </label>
      ) : (
        <>
          <label>
            Loại xe *
            <select
              value={isCustomDeviceType ? 'Khác' : form.device.deviceType}
              onChange={handleDeviceTypeSelect}
            >
              {DEVICE_TYPE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {isCustomDeviceType && (
              <input
                style={{ marginTop: 6 }}
                placeholder="Nhập loại xe cụ thể"
                value={form.device.deviceType}
                onChange={handleDeviceChange('deviceType')}
                required
              />
            )}
          </label>
          <label>
            Biển số xe / Số khung (nếu có)
            <input
              placeholder="VD: 59-P1 123.45 hoặc số khung/số máy"
              value={form.device.imei}
              onChange={handleDeviceChange('imei')}
            />
          </label>
          <ImageUploadField
            label="Ảnh xe (để nhận diện — nên chụp nếu xe chưa có biển số, đặc biệt với xe đạp)"
            value={form.imageUrl}
            onChange={(url) => setForm((prev) => ({ ...prev, imageUrl: url }))}
            target="repairs"
          />
        </>
      )}

      <label>
        Lỗi khách hàng mô tả
        <textarea rows="2" value={form.reportedIssue} onChange={handleChange('reportedIssue')} />
      </label>
      <label>
        Tình trạng máy khi nhận
        <textarea rows="2" value={form.initialCondition} onChange={handleChange('initialCondition')} />
      </label>
      <label>
        Phụ kiện đi kèm
        <input value={form.accessories} onChange={handleChange('accessories')} />
      </label>
      <label>
        Ghi chú
        <input value={form.note} onChange={handleChange('note')} />
      </label>

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>Hủy</button>
        <button type="submit" className="btn-primary">Tiếp nhận</button>
      </div>
    </form>
  );
}

// Hỏi số tháng bảo hành trước khi thực sự chuyển trạng thái sang "Đã giao
// khách" — đây là lúc duy nhất bảo hành được xác lập, nên không thể chuyển
// thẳng như các trạng thái khác. Dùng chung cho việc đổi trạng thái ngay
// trong danh sách (không cần mở chi tiết).
function DeliveryWarrantyModal({ onCancel, onConfirm }) {
  const [months, setMonths] = useState(0);
  return (
    <Modal title="Xác nhận giao xe cho khách" onClose={onCancel} width={420}>
      <div className="entity-form">
        <label>
          Bảo hành cho lần sửa này (tháng) — 0 nếu không bảo hành
          <input type="number" min="0" autoFocus value={months} onChange={(e) => setMonths(e.target.value)} />
        </label>
        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>Hủy</button>
          <button type="button" className="btn-primary" onClick={() => onConfirm(Number(months) || 0)}>Xác nhận giao xe</button>
        </div>
      </div>
    </Modal>
  );
}

function Repairs() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [showCreate, setShowCreate] = useState(false);
  const [viewingOrderId, setViewingOrderId] = useState(null);
  const [toast, setToast] = useState(null);
  // Phiếu đang chờ xác nhận số tháng bảo hành để chuyển sang "Đã giao khách"
  // (đổi trạng thái ngay trong bảng danh sách, không cần mở chi tiết).
  const [pendingDeliveryOrderId, setPendingDeliveryOrderId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getRepairOrders({ page, pageSize, status: statusFilter || undefined });
      setOrders(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err?.response?.data?.message || 'Không thể tải danh sách phiếu sửa chữa');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async (payload) => {
    try {
      await createRepairOrder(payload);
      setToast({ type: 'success', message: 'Tiếp nhận phiếu sửa chữa thành công' });
      setShowCreate(false);
      loadData();
    } catch (err) {
      setToast({ type: 'error', message: err?.response?.data?.message || 'Có lỗi xảy ra' });
    }
  };

  // Đổi trạng thái ngay trong bảng danh sách — không cần mở chi tiết nữa.
  const handleStatusChange = async (orderId, newStatus) => {
    if (newStatus === 'Đã giao khách') {
      setPendingDeliveryOrderId(orderId);
      return;
    }
    try {
      await updateRepairStatus(orderId, newStatus);
      setToast({ type: 'success', message: 'Cập nhật trạng thái thành công' });
      loadData();
    } catch (err) {
      setToast({ type: 'error', message: err?.response?.data?.message || 'Có lỗi xảy ra' });
    }
  };

  const confirmDelivery = async (warrantyMonths) => {
    try {
      await updateRepairStatus(pendingDeliveryOrderId, 'Đã giao khách', warrantyMonths);
      setPendingDeliveryOrderId(null);
      setToast({ type: 'success', message: 'Đã giao xe cho khách' + (warrantyMonths > 0 ? ` — bảo hành ${warrantyMonths} tháng` : '') });
      loadData();
    } catch (err) {
      setToast({ type: 'error', message: err?.response?.data?.message || 'Có lỗi xảy ra' });
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="page-header">
        <h1>Sửa chữa</h1>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>+ Tiếp nhận máy</button>
      </div>

      <div className="filter-bar">
        <select value={statusFilter} onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}>
          <option value="">Tất cả trạng thái</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading && <StateBanner type="loading" />}
      {!loading && error && <StateBanner type="error" message={error} />}
      {!loading && !error && orders.length === 0 && <StateBanner type="empty" />}

      {!loading && !error && orders.length > 0 && (
        <>
          <table className="data-table responsive-cards">
            <thead>
              <tr><th>Mã phiếu</th><th>Khách hàng</th><th>Xe</th><th>Ngày nhận</th><th>Trạng thái</th><th>Bảo hành</th><th>Còn nợ</th><th></th></tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const remaining = Number(o.TotalCost || 0) - Number(o.PaidAmount || 0);
                return (
                  <tr key={o.RepairOrderID}>
                    <td data-label="Mã phiếu">{o.RepairOrderCode}</td>
                    <td data-label="Khách hàng">{o.CustomerName}</td>
                    <td data-label="Xe">{o.DeviceType} {o.Brand} {o.Model}</td>
                    <td data-label="Ngày nhận">{new Date(o.ReceivedDate).toLocaleDateString('vi-VN')}</td>
                    <td data-label="Trạng thái">
                      <select value={o.Status} onChange={(e) => handleStatusChange(o.RepairOrderID, e.target.value)}>
                        {/* Phiếu cũ có trạng thái đã bị bỏ: vẫn hiển thị đúng, đổi sang trạng thái mới là hết */}
                        {!STATUS_OPTIONS.includes(o.Status) && <option value={o.Status}>{o.Status}</option>}
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td data-label="Bảo hành"><WarrantyBadge warrantyMonths={o.WarrantyMonths} warrantyExpiry={o.WarrantyExpiry} /></td>
                    <td data-label="Còn nợ">{remaining > 0 ? <span className="badge badge-warranty-EXPIRED">{remaining.toLocaleString('vi-VN')} đ</span> : <span className="badge badge-warranty-ACTIVE">Đã trả đủ</span>}</td>
                    <td className="table-actions">
                      <button className="btn-link" onClick={() => setViewingOrderId(o.RepairOrderID)}>Chi tiết</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="pagination">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Trước</button>
            <span>Trang {page}/{totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Sau ›</button>
          </div>
        </>
      )}

      {showCreate && (
        <Modal title="Tiếp nhận máy sửa chữa" onClose={() => setShowCreate(false)} width={640}>
          <CreateRepairForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
        </Modal>
      )}

      {viewingOrderId && (
        <RepairDetailModal
          repairOrderId={viewingOrderId}
          onClose={() => setViewingOrderId(null)}
          onChanged={loadData}
        />
      )}

      {pendingDeliveryOrderId && (
        <DeliveryWarrantyModal
          onCancel={() => setPendingDeliveryOrderId(null)}
          onConfirm={confirmDelivery}
        />
      )}

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}

export default Repairs;
