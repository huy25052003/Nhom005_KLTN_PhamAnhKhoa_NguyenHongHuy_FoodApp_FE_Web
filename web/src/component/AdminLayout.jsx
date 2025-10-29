import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import AdminNotifyBell from "../pages/admin/AdminNotifyBell.jsx";

export default function AdminLayout() {
  const linkClass = ({ isActive }) => `nav-link ${isActive ? "active" : ""}`;
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-title">Admin</div>
        <NavLink to="/admin" end className={linkClass}>Tổng quan</NavLink>
        <NavLink to="/admin/products" className={linkClass}>Sản phẩm</NavLink>
        <NavLink to="/admin/categories" className={linkClass}>Danh mục</NavLink>
        <NavLink to="/admin/orders" className={linkClass}>Đơn hàng</NavLink>
        <NavLink to="/admin/analytics" className={linkClass}>Thống kê</NavLink>
        <NavLink to="/admin/users" className={linkClass}>Người dùng</NavLink>
      </aside>
      <main className="container">
        <header className="admin-header"> 
          <div className="admin-header-right">
            <AdminNotifyBell />
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}