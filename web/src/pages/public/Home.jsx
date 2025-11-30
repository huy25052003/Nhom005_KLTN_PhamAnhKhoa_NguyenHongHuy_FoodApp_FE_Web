import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getFeaturedProducts, getCategoriesPublic } from "../../api/public.js";
import { addToCart, getCart } from "../../api/cart.js";
import { toggleFavorite, getFavoriteStat } from "../../api/favorites.js";
import { useAuth } from "../../stores/auth.js";
import { useCart } from "../../stores/cart.js";
import { useChatStore } from "../../stores/chatStore.js";

const samplePlans = [
  { name: "Gói FIT 3 Trưa - Tối", desc: "Best seller", price: 650000, badge: "Best seller" },
  { name: "Gói FULL 3 bữa/ngày", desc: "Giữ cân healthy", price: 825000 },
  { name: "Gói SLIM Không tinh bột", desc: "Gấp đôi rau", price: 600000 },
  { name: "Gói MEAT Tăng cơ", desc: "Thêm 1.5x thịt", price: 950000 },
];
const formatVND = (n) => (n ?? 0).toLocaleString("vi-VN") + " đ";

export default function HomePage() {
  const [cats, setCats] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [favMap, setFavMap] = useState({});
  const { token } = useAuth();
  const { setCount } = useCart();
  const nav = useNavigate();
  const { open } = useChatStore();

  useEffect(() => {
    (async () => {
      try {
        const [c, p] = await Promise.all([getCategoriesPublic(6), getFeaturedProducts(8)]);
        setCats(Array.isArray(c) ? c : []);
        setFeatured(Array.isArray(p) ? p : []);
      } catch {
        setCats([]);
        setFeatured([]);
      }
    })();
  }, []);

  useEffect(() => {
    let stop = false;
    (async () => {
      if (!token || !featured?.length) return;
      try {
        const entries = await Promise.all(
          featured.map(async (p) => {
            try {
              const stat = await getFavoriteStat(p.id);
              return [p.id, !!stat?.favorite];
            } catch {
              return [p.id, false];
            }
          })
        );
        if (!stop) setFavMap(Object.fromEntries(entries));
      } catch {}
    })();
    return () => {
      stop = true;
    };
  }, [token, featured]);

  async function onAdd(product) {
    if (!token) {
      nav("/admin/login?redirect=/cart");
      return;
    }
    try {
      await addToCart(product.id, 1);
      const cart = await getCart();
      const items = cart?.items || cart?.cartItems || [];
      const totalQty = items.reduce((s, it) => s + (it?.quantity ?? 0), 0);
      setCount(totalQty);
      console.log("Đã thêm vào giỏ:", product.name);
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Thêm vào giỏ thất bại");
    }
  }

  async function onToggleFavorite(productId) {
    if (!token) {
      nav("/admin/login?redirect=/");
      return;
    }
    try {
      const { favorite } = await toggleFavorite(productId);
      setFavMap((m) => ({ ...m, [productId]: !!favorite }));
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Không cập nhật được yêu thích");
    }
  }

  return (
    <>
      <section className="hero fade-in">
        <div className="container hero-grid">
          <div className="hero-copy">
            <h1>Kế hoạch bữa ăn hàng tuần cho lối sống lành mạnh</h1>
            <p>Trải nghiệm bữa ăn sạch tươi ngon, giàu dinh dưỡng — lên plan theo mục tiêu của bạn.</p>
            <div className="hero-actions">
              <Link to="/order" className="btn btn-primary">Đặt ngay</Link>
              <button onClick={open} className="btn btn-ghost">
                Tư vấn
              </button>
            </div>
            <ul className="hero-usps">
              <li>Giao tận nơi mỗi ngày</li>
              <li>Thực đơn đa dạng 100+ món</li>
              <li>Tuỳ chỉnh theo mục tiêu (giảm cân / tăng cơ / eat clean)</li>
            </ul>
          </div>
          <div className="hero-visual">
            <div className="hero-image" />
          </div>
        </div>
      </section>

      <section className="section fade-in">
        <div className="container">
          <h2 className="section-title">Cách đặt hàng</h2>
          <div className="grid4 howto">
            <div className="howto-item card-hover"><div className="howto-step">1</div><div>Chọn gói ăn phù hợp</div></div>
            <div className="howto-item card-hover"><div className="howto-step">2</div><div>FoodApp nấu nguyên liệu tươi</div></div>
            <div className="howto-item card-hover"><div className="howto-step">3</div><div>Giao tận nơi mỗi ngày</div></div>
            <div className="howto-item card-hover"><div className="howto-step">4</div><div>Hâm nóng & thưởng thức</div></div>
          </div>
        </div>
      </section>

      <section className="section section-alt fade-in">
        <div className="container">
          <h2 className="section-title">Sản phẩm tiêu biểu</h2>
          <div className="grid4">
            {samplePlans.map((p, i) => (
              <div key={i} className="card plan-card card-hover">
                {p.badge && <div className="badge badge-primary">{p.badge}</div>}
                <div className="plan-name">{p.name}</div>
                <div className="plan-desc">{p.desc}</div>
                <div className="plan-price">{formatVND(p.price)}</div>
                <button className="btn btn-primary w-full">Chọn gói</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {!!cats.length && (
        <section className="section fade-in">
          <div className="container">
            <h2 className="section-title">Danh mục nổi bật</h2>
            <div className="grid6">
              {cats.map((c) => (
                <Link
                  key={c.id}
                  to={`/categories/${c.id}`}
                  className="card cat-card card-hover"
                >
                  <div className="cat-name">{c.name}</div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section fade-in">
        <div className="container">
          <h2 className="section-title">Món được yêu thích</h2>
          <div className="grid4">
            {(featured ?? []).map((it) => {
              const isFav = !!favMap[it.id];
              return (
                <div key={it.id} className="card product-card card-hover" style={{ position: "relative" }}>
                  <button
                    type="button"
                    className="icon-heart"
                    onClick={() => onToggleFavorite(it.id)}
                    title={isFav ? "Bỏ yêu thích" : "Thêm yêu thích"}
                    style={{
                      position: "absolute", top: 12, right: 12,
                      width: 36, height: 36, borderRadius: 18,
                      border: "1px solid #eee", background: "rgba(255,255,255,0.8)",
                      display: "grid", placeItems: "center", cursor: "pointer", zIndex: 2,
                      transition: 'transform 0.2s ease',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <span style={{ color: isFav ? "crimson" : "#999", fontSize: 18 }}>
                      {isFav ? "♥" : "♡"}
                    </span>
                  </button>

                  <Link to={`/products/${it.id}`} aria-label={it.name}>
                    <div className="product-thumb-wrapper">
                      <img
                        className="product-img"
                        src={it.imageUrl || "/placeholder.jpg"}
                        alt={it.name}
                        style={{
                           width: "100%", height: 180, objectFit: "cover", borderRadius: 8,
                           display: 'block', transition: 'transform 0.3s ease'
                        }}
                        loading="lazy"
                      />
                    </div>
                  </Link>

                  <div className="product-info">
                    <Link to={`/products/${it.id}`} className="product-name">
                      {it.name}
                    </Link>
                    <div className="product-price">{formatVND(it.price)}</div>
                  </div>

                  <div className="card-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => onAdd(it)}>
                      Thêm vào giỏ
                    </button>
                    <Link to={`/products/${it.id}`} className="btn btn-outline btn-sm">
                      Xem chi tiết
                    </Link>
                  </div>
                </div>
              );
            })}
            {!featured?.length && <div className="muted">Chưa có dữ liệu sản phẩm.</div>}
          </div>
        </div>
      </section>

      <section className="section section-alt fade-in">
        <div className="container grid3">
          <div className="eco-card card-hover">Túi nylon sinh học tự hủy</div>
          <div className="eco-card card-hover">Tái sử dụng hộp, hoàn tiền</div>
          <div className="eco-card card-hover">Hạn chế muỗng nĩa dùng 1 lần</div>
        </div>
      </section>

      <section className="section fade-in">
        <div className="container">
          <h2 className="section-title">Đối tác & Khách hàng</h2>
        </div>
        <div className="container logo-row">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="logo-box card card-hover" style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <span className="muted">LOGO {i+1}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}