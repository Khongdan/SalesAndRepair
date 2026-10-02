import { resolveImageUrl } from './imageUrl.js';

// Ưu tiên ẢNH QR CỐ ĐỊNH do chính cửa hàng tải lên (Cài đặt > Thông tin cửa
// hàng > QR nhận thanh toán) — đây là ảnh QR THẬT lấy từ app ngân hàng/MoMo
// của chủ cửa hàng nên luôn đúng, không phụ thuộc dịch vụ bên ngoài.
// Chỉ khi cửa hàng CHƯA tải ảnh lên mới thử dựng QR động qua dịch vụ VietQR
// công khai bên dưới (giữ lại để tương thích ngược — cách này cần nhập đúng
// mã BIN ngân hàng nên dễ sai/lỗi hơn).
export function getStaticPaymentQrImage(store) {
  return store?.PaymentQrImageURL ? resolveImageUrl(store.PaymentQrImageURL) : null;
}

// Nội dung chuyển khoản CHUẨN dùng thống nhất mọi nơi trong app: "Thanh toán
// <mã hóa đơn/phiếu>" — để đối chiếu công nợ dễ dàng khi khách chuyển khoản.
export function buildTransferContent(code) {
  return `Thanh toán ${code}`;
}

// Trả về nguồn ảnh QR tốt nhất hiện có cho 1 đơn hàng — CHỈ khi còn nợ (đơn
// đã thanh toán đủ thì không cần hiện QR nữa, dù cửa hàng có ảnh QR cố định
// hay không). Ưu tiên ảnh tĩnh đã tải lên; nếu không có mới thử dựng QR động.
export function resolvePaymentQrSrc(store, remainingAmount, code) {
  if (!(remainingAmount > 0)) return null;
  const staticImg = getStaticPaymentQrImage(store);
  if (staticImg) return staticImg;
  return buildVietQrUrl(store, remainingAmount, buildTransferContent(code));
}

// Dựng URL ảnh mã QR chuyển khoản ĐỘNG theo chuẩn VietQR (dùng dịch vụ ảnh
// công khai img.vietqr.io — không cần API key). Đây là phương án DỰ PHÒNG,
// chỉ dùng khi cửa hàng chưa tải ảnh QR cố định lên (xem resolvePaymentQrSrc
// ở trên) — cách này cần nhập đúng mã BIN ngân hàng nên dễ sai/lỗi hơn.
// Hoạt động với cả tài khoản ngân hàng thường lẫn MoMo (MoMo có mã BIN riêng
// trong mạng lưới VietQR/Napas 24/7 — lấy mã này trong app MoMo/ngân hàng của bạn).
//
// store: kết quả getStoreSettings() — cần PaymentQrBankBin + PaymentQrAccountNumber.
// amount: số tiền cần thu (thường là số tiền còn nợ trên hóa đơn).
// content: nội dung chuyển khoản — dùng mã hóa đơn/phiếu để đối chiếu sau này.
export function buildVietQrUrl(store, amount, content) {
  if (!store?.PaymentQrBankBin || !store?.PaymentQrAccountNumber) return null;

  const bankBin = encodeURIComponent(store.PaymentQrBankBin);
  const accountNumber = encodeURIComponent(store.PaymentQrAccountNumber);
  const params = new URLSearchParams({
    amount: Math.max(0, Math.round(Number(amount) || 0)),
    addInfo: content || '',
  });
  if (store.PaymentQrAccountName) params.set('accountName', store.PaymentQrAccountName);

  return `https://img.vietqr.io/image/${bankBin}-${accountNumber}-compact2.png?${params.toString()}`;
}
