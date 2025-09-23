import React from "react";
import { Link, NavLink } from "react-router-dom";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="logo">FOOD<span>APP</span></Link>
        <nav className="nav">
          <NavLink to="/products" className="nav-link">Thực đơn</NavLink>
          <NavLink to="/party" className="nav-link">Đặt tiệc</NavLink>
          <NavLink to="/order" className="nav-link">Đặt hàng</NavLink>
          <NavLink to="/blog" className="nav-link">Tin tức</NavLink>
          <NavLink to="/faqs" className="nav-link">FAQs</NavLink>
        </nav>
        <div className="header-cta">
          <Link to="/register" className="btn btn-ghost">Đăng ký</Link>
          <Link to="/admin/login" className="btn btn-primary">Đăng nhập</Link>
        </div>
      </div>
    </header>
  );
}
