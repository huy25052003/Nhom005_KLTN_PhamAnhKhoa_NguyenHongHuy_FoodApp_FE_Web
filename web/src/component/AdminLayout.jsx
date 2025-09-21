import React from "react";
import { NavLink, Outlet } from "react-router-dom";

export default function AdminLayout() {
  const linkClass = ({ isActive }) => `nav-link ${isActive ? "active" : ""}`;
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-title">🍜 Admin</div>
        <NavLink to="/admin" end className={linkClass}>Tổng quan</NavLink>
        <NavLink to="/admin/products" className={linkClass}>Sản phẩm</NavLink>
        <NavLink to="/admin/categories" className={linkClass}>Danh mục</NavLink>
      </aside>
      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}
