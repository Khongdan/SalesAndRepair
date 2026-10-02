import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import StateBanner from '../../components/ui/StateBanner.jsx';
import ClickableImage from '../../components/ui/ClickableImage.jsx';
import { getPublicProduct } from '../../services/public.service.js';
import { resolveImageUrl } from '../../utils/imageUrl.js';

// Trang này KHÔNG nằm trong ProtectedRoute — bất kỳ ai quét mã QR dán trên
// sản phẩm cũng mở xem được, không cần tài khoản đăng nhập.
function PublicProduct() {
  const { code } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getPublicProduct(code)
      .then(setProduct)
      .catch((err) => {
        setError(err?.response?.status === 404
          ? 'Không tìm thấy sản phẩm này (có thể đã ngừng kinh doanh hoặc mã QR không đúng)'
          : 'Không thể tải thông tin sản phẩm, vui lòng thử lại');
      })
      .finally(() => setLoading(false));
  }, [code]);

  return (
    <div className="public-page">
      <div className="public-card">
        {loading && <StateBanner type="loading" />}
        {!loading && error && <StateBanner type="error" message={error} />}

        {!loading && !error && product && (
          <>
            {product.ImageURL ? (
              <ClickableImage
                src={resolveImageUrl(product.ImageURL)}
                alt={product.ProductName}
                className="public-card-image"
              />
            ) : (
              <div className="public-card-placeholder">Chưa có hình ảnh</div>
            )}

            <div className="public-card-code">{product.ProductCode}{product.CategoryName ? ` · ${product.CategoryName}` : ''}</div>
            <h1 className="public-card-title">{product.ProductName}</h1>

            <span className={`public-card-stock ${product.InStock ? 'in-stock' : 'out-of-stock'}`}>
              {product.InStock ? 'Còn hàng' : 'Tạm hết hàng'}
            </span>

            <div className="public-card-price">{Number(product.SalePrice).toLocaleString('vi-VN')} đ</div>

            {(product.Brand || product.Model || product.Unit) && (
              <div>
                {product.Brand && (
                  <div className="public-card-row"><span>Thương hiệu</span><strong>{product.Brand}</strong></div>
                )}
                {product.Model && (
                  <div className="public-card-row"><span>Model</span><strong>{product.Model}</strong></div>
                )}
                {product.Unit && (
                  <div className="public-card-row"><span>Đơn vị</span><strong>{product.Unit}</strong></div>
                )}
              </div>
            )}

            {product.Description && (
              <p className="public-card-description">{product.Description}</p>
            )}

            <div className="public-card-footer">Quét mã QR trên sản phẩm để xem trang này</div>
          </>
        )}
      </div>
    </div>
  );
}

export default PublicProduct;
