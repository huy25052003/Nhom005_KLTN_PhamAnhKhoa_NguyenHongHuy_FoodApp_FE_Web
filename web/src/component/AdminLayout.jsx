import React, { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../stores/auth";
import AdminNotifyBell from "../pages/admin/AdminNotifyBell.jsx"; // <--- 1. Import Bell

// Các icon
import {
  FaHome, FaBox, FaListAlt, FaClipboardList, FaUsers,
  FaUtensils, FaSignOutAlt, FaBars, FaChartPie, FaComments
} from "react-icons/fa";

function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSidebar, setShowSidebar] = useState(false);

  // Danh sách menu
  const menuItems = [
    { path: "/admin", label: "Tổng quan", icon: <FaHome /> }, // Sửa path khớp với index route
    { path: "/admin/products", label: "Sản phẩm", icon: <FaBox /> },
    { path: "/admin/categories", label: "Danh mục", icon: <FaListAlt /> },
    { path: "/admin/orders", label: "Đơn hàng", icon: <FaClipboardList /> },
    { path: "/admin/users", label: "Người dùng", icon: <FaUsers /> },
    { path: "/admin/analytics", label: "Thống kê", icon: <FaChartPie /> }, // Đổi icon cho hợp
    { path: "/admin/chat", label: "Hỗ trợ khách hàng", icon: <FaComments /> }, // Đổi icon cho hợp
    { path: "/admin/promotions", label: "Khuyến mãi", icon: <FaUtensils /> },
  ];

  if (user?.roles?.includes("ROLE_ADMIN")) {
    menuItems.push({ path: "/admin/kitchen", label: "Bếp", icon: <FaUtensils /> });
  }

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  const toggleSidebar = () => setShowSidebar(!showSidebar);
  const closeSidebar = () => setShowSidebar(false);

  // Lấy tiêu đề trang hiện tại (Logic khớp chính xác hơn)
  const currentItem = menuItems.find(item => {
     if (item.path === "/admin" && location.pathname === "/admin") return true;
     return item.path !== "/admin" && location.pathname.startsWith(item.path);
  });
  const pageTitle = currentItem ? currentItem.label : "Quản trị hệ thống";

  return (
    <div className="admin-layout fade-in">
      
      {/* Overlay cho mobile */}
      <div className={`sidebar-overlay ${showSidebar ? 'show' : ''}`} onClick={closeSidebar}></div>

      {/* --- SIDEBAR --- */}
      <aside className={`admin-sidebar ${showSidebar ? "show" : ""}`}>
        <div className="sidebar-brand">
          FoodApp Admin
        </div>

        <nav className="sidebar-menu">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/admin"} // Chỉ exact cho trang dashboard
              className={({ isActive }) => `menu-item ${isActive ? "active" : ""}`}
              onClick={closeSidebar}
            >
              <span className="menu-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-avatar">
            {user?.username?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="user-info">
            <span className="user-name" title={user?.fullName}>{user?.fullName || user?.username || 'Admin'}</span>
            <span className="user-role">{user?.roles?.[0] || 'Role'}</span>
          </div>
          <button onClick={handleLogout} className="btn-logout" title="Đăng xuất">
            <FaSignOutAlt />
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="admin-main">
        <header className="main-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button className="menu-toggle-btn" onClick={toggleSidebar}>
              <FaBars />
            </button>
            <h1 className="header-title">{pageTitle}</h1>
          </div>

          {/* 2. Đặt AdminNotifyBell vào đây */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
             <AdminNotifyBell />
          </div> 
        </header>

        <div className="main-content-scroll">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;