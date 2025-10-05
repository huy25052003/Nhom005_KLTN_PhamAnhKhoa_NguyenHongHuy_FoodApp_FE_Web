import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../stores/auth.js";
import { getMyCart } from "../api/cart.js";

export default function SiteHeader() {
  const { token, logout, isAdmin } = useAuth();
  const [count, setCount] = useState(0);

  const location = useLocation();
  const pathname = location.pathname;
  const nav = useNavigate();

  useEffect(() => {
    let alive = true;
    async function loadCount() {
      if (!token) { setCount(0); return; }
      try {
        const data = await getMyCart();
        if (!alive) return;
        const items = data?.items || data?.cartItems || [];
        setCount(items.reduce((s, it) => s + (it?.quantity ?? 0), 0));
      } catch {
        if (alive) setCount(0);
      }
    }
    loadCount();
    return () => { alive = false; };
  }, [token, pathname]);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <div className="logo">Food<span>App</span></div>

        <nav className="nav">
          <Link className={`nav-link ${pathname === "/" ? "active" : ""}`} to="/">Trang chủ</Link>
          <Link className={`nav-link ${pathname === "/cart" ? "active" : ""}`} to="/cart">
            Giỏ hàng {count > 0 && <span className="badge">{count}</span>}
          </Link>
        </nav>

        <div className="header-cta">
          {!token ? (
            <>
              <Link className="btn btn-ghost" to="/admin/login">Đăng nhập</Link>
              <Link className="btn" to="/register">Đăng ký</Link>
            </>
          ) : (
            <>
              {isAdmin ? (
                <button className="btn" onClick={() => nav("/admin")}>Admin</button>
              ) : (
                <>
                <button className="btn btn-ghost" onClick={() => nav("/account/shipping")}>Thông tin giao hàng</button>
                <button className="btn btn-ghost" onClick={() => nav("/account/orders")}>Đơn hàng</button>
                <button className="icon-btn" title="Tài khoản" onClick={() => nav("/account")}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M20 21a8 8 0 0 0-16 0"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </button>
                </>
              )}
              <button className="btn" onClick={logout}>Đăng xuất</button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
