import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import KitchenNotifyBell from "../pages/kitchen/KitchenNotifyBell.jsx";
import { useAuth } from "../stores/auth.js";

export default function KitchenLayout() {
  const { logout, isAdmin, username } = useAuth();
  const nav = useNavigate();

  const handleLogout = () => {
    logout();
    nav('/admin/login');
  };

  return (
    <div className="admin-layout">
      {/* 1. SIDEBAR */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          KITCHEN
        </div>

        <nav className="sidebar-menu">
          <NavLink to="/kitchen" end className={({ isActive }) => `menu-item ${isActive ? "active" : ""}`}>
            <span className="menu-icon">🍳</span> Đơn hàng (KDS)
          </NavLink>
          
          {isAdmin && (
            <>
              <div style={{ margin: '16px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}></div>
              <NavLink to="/admin" className="menu-item">
                <span className="menu-icon">📊</span> Về trang Admin
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-avatar">
            {(username || "C").charAt(0).toUpperCase()}
          </div>
          <div className="user-info">
            <span className="user-name">{username || "Bếp"}</span>
            <span className="user-role">Đầu bếp</span>
          </div>
          <button onClick={handleLogout} className="btn-logout" title="Đăng xuất">
            ⏻
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT */}
      <main className="admin-main">
        <header className="main-header">
          <h2 className="header-title">Màn hình bếp</h2>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <KitchenNotifyBell />
          </div>
        </header>

        <div className="main-content-scroll">
          <Outlet />
        </div>
      </main>
    </div>
  );
}