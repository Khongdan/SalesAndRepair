import React, { useEffect, useRef, useState } from 'react';
import StateBanner from '../../components/ui/StateBanner.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import ClickableImage from '../../components/ui/ClickableImage.jsx';
import CameraCaptureModal from '../../components/ui/CameraCaptureModal.jsx';
import { resolveImageUrl } from '../../utils/imageUrl.js';
import { uploadImage } from '../../services/upload.service.js';
import { getInvoicePhotosByDate, createInvoicePhoto, deleteInvoicePhoto } from '../../services/invoicePhoto.service.js';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Đối chiếu hàng nhập bằng ảnh — thay cho module "Nhập hàng" (nhập liệu chi
 * tiết theo nhà cung cấp) đã bị loại bỏ. Cửa hàng chỉ cần chụp/tải ảnh hóa
 * đơn nhập hàng lên, gắn theo ngày; khi cần đối chiếu lại chỉ cần mở đúng
 * ngày ra xem ảnh gốc. Số lượng tồn kho cập nhật riêng ở tab "Nhập kho".
 */
function InvoicePhotoPanel({ onToast }) {
  const [date, setDate] = useState(todayStr());
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState(null);
  const galleryInputRef = useRef(null);

  const load = () => {
    setLoading(true);
    getInvoicePhotosByDate(date)
      .then(setPhotos)
      .catch(() => onToast({ type: 'error', message: 'Không thể tải ảnh hóa đơn' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUploadFile = async (file) => {
    if (!file.type.startsWith('image/')) {
      onToast({ type: 'error', message: 'Vui lòng chọn file ảnh' });
      return;
    }
    setUploading(true);
    try {
      const imageUrl = await uploadImage(file, 'invoices');
      await createInvoicePhoto({ photoDate: date, imageUrl, note: note || undefined });
      setNote('');
      onToast({ type: 'success', message: 'Đã thêm ảnh hóa đơn' });
      load();
    } catch (err) {
      onToast({ type: 'error', message: err?.response?.data?.message || 'Tải ảnh lên thất bại' });
    } finally {
      setUploading(false);
    }
  };

  const handleGalleryFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) handleUploadFile(file);
  };

  const handleCameraCapture = (file) => {
    setShowCamera(false);
    handleUploadFile(file);
  };

  const handleDelete = async () => {
    try {
      await deleteInvoicePhoto(deletingPhoto.PhotoID);
      setDeletingPhoto(null);
      onToast({ type: 'success', message: 'Đã xóa ảnh' });
      load();
    } catch (err) {
      setDeletingPhoto(null);
      onToast({ type: 'error', message: err?.response?.data?.message || 'Có lỗi xảy ra' });
    }
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 0 }}>
        Chụp hoặc tải ảnh hóa đơn nhập hàng lên, gắn theo ngày — dùng để đối chiếu lại khi cần,
        thay vì nhập liệu chi tiết từng dòng hàng. Số lượng tồn kho cập nhật riêng ở tab "Nhập kho".
      </p>

      <div className="form-row" style={{ alignItems: 'flex-end' }}>
        <label style={{ flex: '0 0 180px' }}>
          Ngày hóa đơn
          <input type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label style={{ flex: 1 }}>
          Ghi chú (tùy chọn)
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Hóa đơn phụ tùng xe máy ABC" />
        </label>
      </div>

      <div className="form-actions" style={{ justifyContent: 'flex-start', marginTop: 8 }}>
        <button type="button" className="btn-secondary" disabled={uploading} onClick={() => galleryInputRef.current?.click()}>
          📁 Chọn từ thư viện
        </button>
        <button type="button" className="btn-secondary" disabled={uploading} onClick={() => setShowCamera(true)}>
          📷 Chụp ảnh
        </button>
        {uploading && <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>Đang tải ảnh lên...</span>}
      </div>
      <input ref={galleryInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleGalleryFile} />
      {showCamera && <CameraCaptureModal onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />}

      <h3 style={{ marginTop: 20 }}>Ảnh hóa đơn ngày {new Date(date).toLocaleDateString('vi-VN')}</h3>
      {loading && <StateBanner type="loading" />}
      {!loading && photos.length === 0 && <StateBanner type="empty" message="Chưa có ảnh hóa đơn nào cho ngày này" />}
      {!loading && photos.length > 0 && (
        <div className="invoice-photo-grid">
          {photos.map((p) => (
            <div key={p.PhotoID} className="invoice-photo-card">
              <ClickableImage src={resolveImageUrl(p.ImageURL)} alt={p.Note || 'Hóa đơn'} className="invoice-photo-thumb" />
              {p.Note && <p className="invoice-photo-note">{p.Note}</p>}
              <p className="invoice-photo-meta">{p.UploadedByName} · {new Date(p.CreatedAt).toLocaleTimeString('vi-VN')}</p>
              <button type="button" className="btn-link btn-link-danger" onClick={() => setDeletingPhoto(p)}>Xóa</button>
            </div>
          ))}
        </div>
      )}

      {deletingPhoto && (
        <ConfirmDialog
          message="Bạn có chắc muốn xóa ảnh hóa đơn này?"
          onConfirm={handleDelete}
          onCancel={() => setDeletingPhoto(null)}
        />
      )}
    </div>
  );
}

export default InvoicePhotoPanel;
