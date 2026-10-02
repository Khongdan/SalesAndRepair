import React, { useRef, useState } from 'react';
import { uploadImage } from '../../services/upload.service.js';
import { resolveImageUrl } from '../../utils/imageUrl.js';
import CameraCaptureModal from './CameraCaptureModal.jsx';
import ClickableImage from './ClickableImage.jsx';

const MAX_SIZE_MB = 5;

/**
 * Ô chọn/hiển thị ảnh sản phẩm hoặc linh kiện.
 * - "Chọn từ thư viện": input file bình thường, mở trình duyệt ảnh trên máy.
 * - "Chụp ảnh": mở modal dùng camera trực tiếp qua getUserMedia (xem
 *   CameraCaptureModal.jsx) — trình duyệt sẽ hỏi quyền camera, hoạt động
 *   trên cả máy tính lẫn điện thoại.
 * File được upload lên server ngay khi chọn/chụp xong, sau đó component
 * chỉ giữ URL trả về (không giữ file gốc trong state của form cha).
 *
 * Props:
 *  - value: URL ảnh hiện tại (string) hoặc rỗng
 *  - onChange(url): gọi khi upload xong (url mới) hoặc khi xóa ảnh (url = '')
 *  - target: 'products' | 'components' — quyết định endpoint upload
 *  - label: nhãn hiển thị phía trên
 */
function ImageUploadField({ value, onChange, target, label = 'Hình ảnh' }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const galleryInputRef = useRef(null);

  const uploadFile = async (file) => {
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file ảnh');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Ảnh quá lớn, tối đa ${MAX_SIZE_MB}MB`);
      return;
    }

    setError('');
    setUploading(true);
    try {
      const url = await uploadImage(file, target);
      onChange(url);
    } catch (err) {
      setError(err?.response?.data?.message || 'Tải ảnh lên thất bại, vui lòng thử lại');
    } finally {
      setUploading(false);
    }
  };

  const handleGalleryFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // cho phép chọn lại cùng 1 file lần sau
    if (file) uploadFile(file);
  };

  const handleCameraCapture = (file) => {
    setShowCamera(false);
    uploadFile(file);
  };

  return (
    <div className="image-upload-field">
      <label className="image-upload-label">{label}</label>

      <div className="image-upload-body">
        {value ? (
          <ClickableImage src={resolveImageUrl(value)} alt="Ảnh xem trước" className="image-upload-preview" />
        ) : (
          <div className="image-upload-placeholder">Chưa có ảnh</div>
        )}

        <div className="image-upload-actions">
          <button
            type="button"
            className="btn-secondary"
            disabled={uploading}
            onClick={() => galleryInputRef.current?.click()}
          >
            📁 Chọn từ thư viện
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={uploading}
            onClick={() => setShowCamera(true)}
          >
            📷 Chụp ảnh
          </button>
          {value && (
            <button
              type="button"
              className="btn-link btn-link-danger"
              disabled={uploading}
              onClick={() => onChange('')}
            >
              Xóa ảnh
            </button>
          )}
        </div>
      </div>

      {uploading && <div className="image-upload-status">Đang tải ảnh lên...</div>}
      {error && <div className="image-upload-error">{error}</div>}

      {/* Input ẩn: chọn từ thư viện ảnh trên máy */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleGalleryFile}
      />

      {/* Modal chụp ảnh trực tiếp — dùng getUserMedia nên sẽ hỏi quyền
          camera thật sự của trình duyệt, hoạt động trên cả máy tính lẫn
          điện thoại (không như thuộc tính HTML "capture" chỉ có tác dụng
          trên điện thoại). */}
      {showCamera && (
        <CameraCaptureModal
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}

export default ImageUploadField;
