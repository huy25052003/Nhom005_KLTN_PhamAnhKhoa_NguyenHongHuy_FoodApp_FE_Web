import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function AdminLayout({ children }) {
  const { pathname } = useLocation();
  const Item = ({ to, label }) => (
    <Link to={to} className={`nav-link ${pathname.startsWith(to) ? "active" : ""}`}>
      {label}
    </Link>
  );

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-title">🍜 Admin</div>
        <Item to="/admin" label="Tổng quan" />
        <Item to="/admin/products" label="Sản phẩm" />
      </aside>
      <main className="container">{children}</main>
    </div>
  );
}
