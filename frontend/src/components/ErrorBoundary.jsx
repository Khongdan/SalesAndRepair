import React from 'react';

/**
 * Error Boundary cấp cao nhất — bắt lỗi render không mong muốn ở bất kỳ
 * component con nào, hiển thị Error state thân thiện thay vì màn hình trắng.
 * Đây là lưới an toàn cuối cùng; lỗi API vẫn được từng trang tự xử lý bằng
 * StateBanner type="error" như thường lệ.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Lỗi giao diện không mong muốn:', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h1>Đã có lỗi xảy ra</h1>
          <p>Ứng dụng gặp sự cố không mong muốn. Vui lòng thử tải lại trang.</p>
          <button className="btn-primary" onClick={this.handleReload}>Về trang chủ</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
