import React, { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../stores/auth";
// Các icon giữ nguyên
import {
  FaHome, FaBox, FaListAlt, FaClipboardList, FaUsers,
  FaUtensils, FaSignOutAlt, FaBars // Thêm icon FaBars cho nút menu
} from "react-icons/fa";

function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSidebar, setShowSidebar] = useState(false); // State điều khiển menu mobile

  // Danh sách menu (Giữ nguyên data của bạn)
  const menuItems = [
    { path: "/admin/", label: "Tổng quan", icon: <FaHome /> },
    { path: "/admin/products", label: "Sản phẩm", icon: <FaBox /> },
    { path: "/admin/categories", label: "Danh mục", icon: <FaListAlt /> },
    { path: "/admin/orders", label: "Đơn hàng", icon: <FaClipboardList /> },
    { path: "/admin/users", label: "Người dùng", icon: <FaUsers /> },
    { path: "/admin/analytics", label: "Thống kê", icon: <FaUsers /> },
    { path: "/admin/chat", label: "Hỗ trợ khách hàng", icon: <FaUsers /> },

  ];

  if (user?.roles?.includes("ROLE_ADMIN")) {
    menuItems.push({ path: "/admin/kitchen", label: "Bếp", icon: <FaUtensils /> });
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Hàm toggle và đóng sidebar
  const toggleSidebar = () => setShowSidebar(!showSidebar);
  const closeSidebar = () => setShowSidebar(false);

  // Lấy tiêu đề trang hiện tại
  const currentItem = menuItems.find(item => item.path === location.pathname || location.pathname.startsWith(item.path + '/'));
  const pageTitle = currentItem ? currentItem.label : "Quản trị hệ thống";

  return (
    // Áp dụng class layout mới
    <div className="admin-layout fade-in">
      
      {/* Overlay cho mobile khi mở menu */}
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
              // Class active sẽ tự động được NavLink thêm vào
              className="menu-item"
              onClick={closeSidebar} // Đóng menu khi click chọn trang (trên mobile)
            >
              <span className="menu-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {/* Avatar chữ cái đầu */}
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

      {/* --- MAIN CONTENT AREA --- */}
      <main className="admin-main">
        {/* Header của phần nội dung */}
        <header className="main-header">
          {/* Nút mở menu trên mobile */}
          <button className="menu-toggle-btn" onClick={toggleSidebar}>
            <FaBars />
          </button>
          {/* Tiêu đề trang */}
          <h1 className="header-title">{pageTitle}</h1>
          {/* (Có thể thêm phần thông báo, profile dropdown ở đây sau này) */}
          <div style={{width: 24}}></div> 
        </header>

        {/* Khu vực nội dung chính có thanh cuộn riêng */}
        <div className="main-content-scroll">
          {/* Nội dung các trang con sẽ render ở đây */}
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;