import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import KitchenNotifyBell from "../pages/kitchen/KitchenNotifyBell.jsx";
import { useAuth } from "../stores/auth.js";

export default function KitchenLayout() {
  const linkClass = ({ isActive }) => `nav-link ${isActive ? "active" : ""}`;
  const { logout, isAdmin } = useAuth();
  const nav = useNavigate();

  const handleLogout = () => {
    logout();
    nav('/admin/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-title">Kitchen</div>
        <NavLink to="/kitchen" end className={linkClass}>
          Đơn hàng Bếp
        </NavLink>
        
        {isAdmin && (
          <>
            <hr style={{margin: '12px 0', border: 'none', borderTop: '1px solid var(--border)'}} />
            <NavLink to="/admin" className={linkClass}>
              ← Về Admin
            </NavLink>
          </>
        )}
      </aside>
      <main className="container">
        <header className="admin-header"> 
          <div className="admin-header-right">
            <KitchenNotifyBell />
            
            <button 
                className="btn btn-danger" 
                style={{marginLeft: '12px'}}
                onClick={handleLogout}
            >
              Đăng xuất
            </button>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}