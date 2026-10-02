import React, { useEffect, useState, useCallback } from 'react';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import Toast from '../../components/ui/Toast.jsx';
import StateBanner from '../../components/ui/StateBanner.jsx';
import ImageUploadField from '../../components/ui/ImageUploadField.jsx';
import QRCodeModal from '../../components/ui/QRCodeModal.jsx';
import ClickableImage from '../../components/ui/ClickableImage.jsx';
import { resolveImageUrl } from '../../utils/imageUrl.js';
import { getCategories } from '../../services/category.service.js';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../../services/product.service.js';

// Lưu ý: KHÔNG có productCode trong form nữa — mã sản phẩm do hệ thống tự
// sinh (SP001, SP002...) khi tạo mới, người dùng không tự nhập.
const EMPTY_FORM = {
  productName: '',
  categoryId: '',
  brand: '',
  model: '',
  importPrice: 0,
  salePrice: 0,
  quantity: 0,
  minStock: 0,
  unit: 'Cái',
  description: '',
  imageUrl: '',
  location: '',
};

function ProductForm({ initial, categories, onSubmit, onCancel, isEdit }) {
  const [form, setForm] = useState(initial);

  const handleChange = (field) => (e) => {
    const value = e.target.type === 'number' ? e.target.value : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form className="entity-form" onSubmit={handleSubmit}>
      {isEdit && (
        <label>
          Mã sản phẩm
          <input value={form.productCode} disabled />
        </label>
      )}
      <label>
        Tên sản phẩm *
        <input value={form.productName} onChange={handleChange('productName')} required />
      </label>

      <ImageUploadField
        target="products"
        label="Hình ảnh sản phẩm"
        value={form.imageUrl}
        onChange={(url) => setForm((prev) => ({ ...prev, imageUrl: url }))}
      />

      <div className="form-row">
        <label>
          Danh mục
          <select value={form.categoryId || ''} onChange={handleChange('categoryId')}>
            <option value="">-- Chọn danh mục --</option>
            {categories.map((c) => (
              <option key={c.CategoryID} value={c.CategoryID}>{c.CategoryName}</option>
            ))}
          </select>
        </label>
        <label>
          Đơn vị tính
          <input value={form.unit} onChange={handleChange('unit')} />
        </label>
      </div>
      <div className="form-row">
        <label>
          Thương hiệu
          <input value={form.brand} onChange={handleChange('brand')} />
        </label>
        <label>
          Model / Dòng xe phù hợp
          <input placeholder="VD: Wave, Air Blade, Universal (dùng chung)..." value={form.model} onChange={handleChange('model')} />
        </label>
      </div>
      <div className="form-row">
        <label>
          Giá nhập
          <input type="number" min="0" value={form.importPrice} onChange={handleChange('importPrice')} />
        </label>
        <label>
          Giá bán
          <input type="number" min="0" value={form.salePrice} onChange={handleChange('salePrice')} />
        </label>
      </div>
      <div className="form-row">
        {!isEdit && (
          <label>
            Số lượng tồn ban đầu
            <input type="number" min="0" value={form.quantity} onChange={handleChange('quantity')} />
          </label>
        )}
        <label>
          Mức tồn tối thiểu
          <input type="number" min="0" value={form.minStock} onChange={handleChange('minStock')} />
        </label>
      </div>
      <div className="form-row">
        <label>
          Vị trí trong kho
          <input placeholder="VD: Kệ A1 (không bắt buộc)" value={form.location} onChange={handleChange('location')} />
        </label>
      </div>
      <label>
        Mô tả
        <textarea rows="2" value={form.description} onChange={handleChange('description')} />
      </label>
      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>Hủy</button>
        <button type="submit" className="btn-primary">{isEdit ? 'Cập nhật' : 'Thêm mới'}</button>
      </div>
    </form>
  );
}

function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [qrProduct, setQrProduct] = useState(null);
  const [toast, setToast] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getProducts({
        page,
        pageSize,
        search,
        categoryId: categoryFilter || undefined,
      });
      setProducts(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err?.response?.data?.message || 'Không thể tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter]);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleSubmit = async (form) => {
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.ProductID, form);
        setToast({ type: 'success', message: 'Cập nhật sản phẩm thành công' });
      } else {
        await createProduct(form);
        setToast({ type: 'success', message: 'Thêm sản phẩm thành công' });
      }
      setShowForm(false);
      loadData();
    } catch (err) {
      setToast({ type: 'error', message: err?.response?.data?.message || 'Có lỗi xảy ra' });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProduct(deletingProduct.ProductID);
      setToast({ type: 'success', message: 'Đã ngừng kinh doanh sản phẩm' });
      setDeletingProduct(null);
      loadData();
    } catch (err) {
      setToast({ type: 'error', message: err?.response?.data?.message || 'Có lỗi xảy ra' });
      setDeletingProduct(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Sản phẩm</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--color-muted)' }}>
            Danh sách dùng chung cho cả hàng bán và linh kiện sửa chữa — bán hàng và sửa chữa đều lấy từ đây.
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ Thêm sản phẩm</button>
      </div>

      <div className="filter-bar">
        <input
          placeholder="Tìm theo tên hoặc mã sản phẩm..."
          value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value); }}
        />
        <select value={categoryFilter} onChange={(e) => { setPage(1); setCategoryFilter(e.target.value); }}>
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => (
            <option key={c.CategoryID} value={c.CategoryID}>{c.CategoryName}</option>
          ))}
        </select>
      </div>

      {loading && <StateBanner type="loading" />}
      {!loading && error && <StateBanner type="error" message={error} />}
      {!loading && !error && products.length === 0 && <StateBanner type="empty" />}

      {!loading && !error && products.length > 0 && (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th></th>
                <th>Mã SP</th>
                <th>Tên sản phẩm</th>
                <th>Danh mục</th>
                <th>Giá bán</th>
                <th>Tồn kho</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.ProductID}>
                  <td>
                    {p.ImageURL
                      ? <ClickableImage src={resolveImageUrl(p.ImageURL)} alt={p.ProductName} className="product-thumb" />
                      : <span className="image-upload-placeholder" style={{ width: 36, height: 36, fontSize: 9 }}>—</span>}
                  </td>
                  <td>{p.ProductCode}</td>
                  <td>{p.ProductName}</td>
                  <td>{p.CategoryName || '—'}</td>
                  <td>{Number(p.SalePrice).toLocaleString('vi-VN')} đ</td>
                  <td className={p.Quantity <= p.MinStock ? 'low-stock' : ''}>{p.Quantity}</td>
                  <td><span className={`badge badge-${p.Status}`}>{p.Status}</span></td>
                  <td className="table-actions">
                    <button className="btn-link" onClick={() => setQrProduct(p)}>Mã QR</button>
                    <button className="btn-link" onClick={() => openEdit(p)}>Sửa</button>
                    <button className="btn-link btn-link-danger" onClick={() => setDeletingProduct(p)}>Xóa</button>
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
        <Modal title={editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm'} onClose={() => setShowForm(false)} width={560}>
          <ProductForm
            initial={editingProduct ? {
              productCode: editingProduct.ProductCode,
              productName: editingProduct.ProductName,
              categoryId: editingProduct.CategoryID || '',
              brand: editingProduct.Brand || '',
              model: editingProduct.Model || '',
              importPrice: editingProduct.ImportPrice,
              salePrice: editingProduct.SalePrice,
              quantity: editingProduct.Quantity,
              minStock: editingProduct.MinStock,
              unit: editingProduct.Unit,
              description: editingProduct.Description || '',
              imageUrl: editingProduct.ImageURL || '',
              location: editingProduct.Location || '',
            } : EMPTY_FORM}
            categories={categories}
            isEdit={!!editingProduct}
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
          />
        </Modal>
      )}

      {deletingProduct && (
        <ConfirmDialog
          message={`Bạn có chắc muốn ngừng kinh doanh sản phẩm "${deletingProduct.ProductName}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingProduct(null)}
        />
      )}

      {qrProduct && (
        <QRCodeModal
          itemType="products"
          code={qrProduct.ProductCode}
          name={qrProduct.ProductName}
          onClose={() => setQrProduct(null)}
        />
      )}

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}

export default Products;
