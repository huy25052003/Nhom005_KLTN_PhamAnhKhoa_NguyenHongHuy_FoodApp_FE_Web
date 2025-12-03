import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../stores/auth.js";
import { getMyCart } from "../api/cart.js";
import { useCart } from "../stores/cart.js";
import { 
  FaBars, FaTimes, FaSignOutAlt, 
  FaShoppingCart, FaUser, FaUserCog, FaSearch, FaClipboardList 
} from "react-icons/fa"; // Thêm FaClipboardList

export default function SiteHeader() {
  const { token, logout, isAdmin } = useAuth();
  const { count, setCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [keyword, setKeyword] = useState("");

  const location = useLocation();
  const pathname = location.pathname;
  const nav = useNavigate();

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    let alive = true;
    async function loadCount() {
      if (!token) { setCount(0); return; }
      try {
        const data = await getMyCart();
        if (!alive) return;
        const items = data?.items || data?.cartItems || [];
        setCount(items.reduce((s, it) => s + (it?.quantity ?? 0), 0));
      } catch { if (alive) setCount(0); }
    }
    loadCount();
    return () => { alive = false; };
  }, [token, pathname, setCount]);

  const handleLogout = () => {
    logout();
    nav("/admin/login");
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (keyword.trim()) {
      nav(`/menu?q=${encodeURIComponent(keyword.trim())}`);
      setKeyword("");
    }
  };

  return (
    <header className="site-header">
      <div className="container header-inner">
        <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>

        <div className="logo" onClick={() => nav("/")} style={{cursor: 'pointer', marginRight: 20}}>
          Food<span>App</span>
        </div>

        <form className="desktop-only search-bar-header" onSubmit={handleSearch}>
            <input type="text" placeholder="Tìm món ăn..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            <button type="submit"><FaSearch /></button>
        </form>

        <nav className={`nav ${menuOpen ? "is-open" : ""}`}>
          <Link className={`nav-link ${pathname === "/" ? "active" : ""}`} to="/">Trang chủ</Link>
          <Link className={`nav-link ${pathname === "/menu" ? "active" : ""}`} to="/menu">Thực đơn</Link>
          <Link className={`nav-link ${pathname === "/favorites" ? "active" : ""}`} to="/favorites">Yêu thích</Link>
          
          <div className="mobile-only" style={{borderTop: '1px solid #eee', paddingTop: 8, marginTop: 8}}>
             {token ? (
               <>
                 <Link className="nav-link" to="/account">Tài khoản</Link>
                 <Link className="nav-link" to="/account/orders">Đơn mua</Link>
                 {isAdmin && <Link className="nav-link" to="/admin">Trang quản trị</Link>}
                 <button className="nav-link text-red" onClick={handleLogout} style={{width:'100%', textAlign:'left', background:'none', border:'none', fontSize:'1rem'}}>Đăng xuất</button>
               </>
             ) : (
               <Link className="nav-link" to="/admin/login">Đăng nhập</Link>
             )}
          </div>
        </nav>

        <div className="header-cta">
          <Link to="/checkout" className="header-icon-btn" title="Giỏ hàng">
            <FaShoppingCart />
            {count > 0 && <span className="cart-badge">{count > 99 ? '99+' : count}</span>}
          </Link>

          <div className="desktop-only" style={{display:'inline-flex', gap: 4, alignItems:'center'}}>
            {!token ? (
                <Link className="btn btn-primary btn-sm" to="/admin/login" style={{marginLeft: 8}}>Đăng nhập</Link>
            ) : (
                <>
                  {/* NÚT ĐƠN HÀNG MỚI */}
                  <Link to="/account/orders" className="header-icon-btn" title="Đơn mua">
                      <FaClipboardList />
                  </Link>

                  {isAdmin ? (
                      <button className="header-icon-btn" onClick={() => nav("/admin")} title="Trang quản trị"><FaUserCog /></button>
                  ) : (
                      <button className="header-icon-btn" onClick={() => nav("/account")} title="Tài khoản"><FaUser /></button>
                  )}
                  <button className="header-icon-btn logout" onClick={handleLogout} title="Đăng xuất"><FaSignOutAlt /></button>
                </>
            )}
          </div>
        </div>
      </div>
      {menuOpen && <div style={{position: 'fixed', inset: 0, top: 72, background: 'rgba(0,0,0,0.5)', zIndex: 40}} onClick={() => setMenuOpen(false)}></div>}
    </header>
  );
}