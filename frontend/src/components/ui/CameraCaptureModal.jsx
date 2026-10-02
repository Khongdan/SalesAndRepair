import React, { useEffect, useRef, useState } from 'react';
import Modal from './Modal.jsx';

/**
 * Modal chụp ảnh trực tiếp từ camera của thiết bị.
 *
 * Dùng navigator.mediaDevices.getUserMedia — đây là API chuẩn để truy cập
 * camera từ trình duyệt, và chính API này khiến trình duyệt hiển thị hộp
 * thoại "Cho phép trang này dùng camera?" — hoạt động trên CẢ máy tính lẫn
 * điện thoại (thuộc tính HTML `capture` trên input file chỉ có tác dụng
 * trên điện thoại và không hề hỏi quyền trong trang, nó mở thẳng app
 * camera ngoài trình duyệt).
 *
 * Luồng sử dụng:
 *  1. Mở modal -> xin quyền + hiển thị hình ảnh trực tiếp (preview) từ camera.
 *  2. Bấm "Chụp" -> chụp khung hình hiện tại vào canvas -> hiển thị ảnh vừa chụp.
 *  3. Bấm "Dùng ảnh này" -> trả file ảnh (Blob) ra ngoài qua onCapture.
 *     Hoặc bấm "Chụp lại" -> quay về bước 1.
 *
 * Props:
 *  - onCapture(file): gọi khi người dùng xác nhận dùng ảnh vừa chụp
 *  - onClose(): đóng modal (hủy)
 */
function CameraCaptureModal({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  const [status, setStatus] = useState('requesting'); // requesting | streaming | error | captured
  const [errorMessage, setErrorMessage] = useState('');
  const [capturedDataUrl, setCapturedDataUrl] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      setStatus('requesting');
      setErrorMessage('');

      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('error');
        setErrorMessage('Trình duyệt này không hỗ trợ truy cập camera. Vui lòng dùng "Chọn từ thư viện" thay thế.');
        return;
      }

      try {
        // facingMode 'environment' ưu tiên camera sau trên điện thoại;
        // trên máy tính chỉ có 1 camera nên trình duyệt sẽ tự dùng camera đó.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatus('streaming');
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
          setErrorMessage('Bạn đã từ chối quyền dùng camera. Hãy cấp quyền camera cho trang này trong cài đặt trình duyệt rồi thử lại, hoặc dùng "Chọn từ thư viện".');
        } else if (err?.name === 'NotFoundError') {
          setErrorMessage('Không tìm thấy camera trên thiết bị này. Vui lòng dùng "Chọn từ thư viện".');
        } else {
          setErrorMessage('Không thể mở camera. Vui lòng dùng "Chọn từ thư viện".');
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleTakePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    setCapturedDataUrl(canvas.toDataURL('image/jpeg', 0.92));
    setStatus('captured');
    // Dừng preview trực tiếp khi đã chụp xong (đỡ tốn tài nguyên camera),
    // stream sẽ được mở lại nếu người dùng bấm "Chụp lại".
    streamRef.current?.getTracks().forEach((t) => t.stop());
  };

  const handleRetake = () => {
    setCapturedDataUrl('');
    setStatus('requesting');
    // useEffect chỉ chạy 1 lần lúc mount nên gọi lại thủ công bằng cách
    // trigger lại logic mở camera.
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStatus('streaming');
      } catch {
        setStatus('error');
        setErrorMessage('Không thể mở lại camera. Vui lòng dùng "Chọn từ thư viện".');
      }
    })();
  };

  const handleConfirm = () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCapture(file);
    }, 'image/jpeg', 0.92);
  };

  return (
    <Modal title="Chụp ảnh" onClose={onClose} width={460}>
      <div className="camera-capture">
        {status === 'requesting' && (
          <div className="camera-capture-status">Đang xin quyền truy cập camera...</div>
        )}

        {status === 'error' && (
          <div className="camera-capture-status camera-capture-error">{errorMessage}</div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ display: status === 'streaming' ? 'block' : 'none' }}
          className="camera-capture-video"
        />

        {status === 'captured' && capturedDataUrl && (
          <img src={capturedDataUrl} alt="Ảnh vừa chụp" className="camera-capture-video" />
        )}

        {/* canvas ẩn dùng để trích xuất khung hình, không hiển thị trực tiếp */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <div className="form-actions" style={{ marginTop: 12 }}>
          {status === 'streaming' && (
            <button type="button" className="btn-primary" onClick={handleTakePhoto}>📸 Chụp</button>
          )}
          {status === 'captured' && (
            <>
              <button type="button" className="btn-secondary" onClick={handleRetake}>Chụp lại</button>
              <button type="button" className="btn-primary" onClick={handleConfirm}>Dùng ảnh này</button>
            </>
          )}
          <button type="button" className="btn-secondary" onClick={onClose}>Hủy</button>
        </div>
      </div>
    </Modal>
  );
}

export default CameraCaptureModal;
