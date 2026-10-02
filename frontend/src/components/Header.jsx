import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../services/auth.service.js';
import { useTheme } from '../contexts/ThemeContext.jsx';

function Header({ onToggleMenu }) {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="hamburger-btn" onClick={onToggleMenu} aria-label="Mở menu">☰</button>
        <div className="header-title">Tổng quan</div>
      </div>
      <div className="header-user">
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
          title={theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        {user ? (
          <>
            <span className="header-user-info">
              {user.fullName} <em>({user.roleName})</em>
            </span>
            <button className="logout-btn" onClick={handleLogout}>Đăng xuất</button>
          </>
        ) : (
          <span>Xin chào 👋</span>
        )}
      </div>
    </header>
  );
}

export default Header;
