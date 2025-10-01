import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom"; // <-- THÊM useNavigate

import { getFeaturedProducts, getCategoriesPublic } from "../../api/public.js";
import { addToCart, getCart } from "../../api/cart.js";

import { useAuth } from "../../stores/auth.js";
import { useCart } from "../../stores/cart.js";

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
  const { token } = useAuth();
  const { setCount } = useCart();
  const nav = useNavigate(); // <-- THÊM DÒNG NÀY

  useEffect(() => {
    (async () => {
      try {
        const [c, p] = await Promise.all([
          getCategoriesPublic(6),
          getFeaturedProducts(8),
        ]);
        setCats(Array.isArray(c) ? c : []);
        setFeatured(Array.isArray(p) ? p : []);
      } catch {
        setCats([]);
        setFeatured([]);
      }
    })();
  }, []);

  async function onAdd(product) {
    if (!token) {
      nav("/admin/login?redirect=/cart"); // <-- FIX: dùng nav hợp lệ
      return;
    }
    try {
      await addToCart(product.id, 1);
      const cart = await getCart();
      const items = cart?.items || cart?.cartItems || [];
      const totalQty = items.reduce((s, it) => s + (it?.quantity ?? 0), 0);
      setCount(totalQty);
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Thêm vào giỏ thất bại");
    }
  }

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <h1>Kế hoạch bữa ăn hàng tuần cho lối sống lành mạnh</h1>
            <p>Trải nghiệm bữa ăn sạch tươi ngon, giàu dinh dưỡng — lên plan theo mục tiêu của bạn.</p>
            <div className="hero-actions">
              <Link to="/order" className="btn btn-primary">Đặt ngay</Link>
              <a href="#" className="btn btn-ghost">Tư vấn</a>
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

      {/* CÁCH ĐẶT HÀNG */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">Cách đặt hàng</h2>
          <div className="grid4 howto">
            <div className="howto-item"><div className="howto-step">1</div><div>Chọn gói ăn phù hợp</div></div>
            <div className="howto-item"><div className="howto-step">2</div><div>FoodApp nấu nguyên liệu tươi</div></div>
            <div className="howto-item"><div className="howto-step">3</div><div>Giao tận nơi mỗi ngày</div></div>
            <div className="howto-item"><div className="howto-step">4</div><div>Hâm nóng & thưởng thức</div></div>
          </div>
        </div>
      </section>

      {/* GÓI TIÊU BIỂU */}
      <section className="section section-alt">
        <div className="container">
          <h2 className="section-title">Sản phẩm tiêu biểu</h2>
          <div className="grid4">
            {samplePlans.map((p, i) => (
              <div key={i} className="card plan-card">
                {p.badge && <div className="badge badge-primary">{p.badge}</div>}
                <div className="plan-name">{p.name}</div>
                <div className="plan-desc">{p.desc}</div>
                <div className="plan-price">{(p.price ?? 0).toLocaleString("vi-VN")} đ</div>
                <button className="btn btn-primary w-full">Chọn gói</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DANH MỤC NỔI BẬT */}
      {!!cats.length && (
        <section className="section">
          <div className="container">
            <h2 className="section-title">Danh mục nổi bật</h2>
            <div className="grid6">
              {cats.map((c) => (
                <div key={c.id} className="card cat-card">
                  <div className="cat-name">{c.name}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* MÓN YÊU THÍCH */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">Món được yêu thích</h2>
          <div className="grid4">
            {(featured ?? []).map((it) => (
              <div key={it.id} className="card product-card">
                <Link
                  to={`/products/${it.id}`}
                  className="product-thumb"
                  style={{ backgroundImage: `url(${it.imageUrl || "/placeholder.jpg"})` }}
                  aria-label={it.name}
                />
                <div className="product-info">
                  <Link to={`/product/${it.id}`} className="product-name">
                    {it.name}
                  </Link>
                  <div className="product-price">{formatVND(it.price)}</div>
                </div>

                <div className="card-actions">
                  <button className="btn" onClick={() => onAdd(it)}>
                    Thêm vào giỏ
                  </button>
                  <Link to={`/products/${it.id}`} className="btn btn-ghost">
                    Xem chi tiết
                  </Link>
                </div>
              </div>
            ))}
            {!featured?.length && <div className="muted">Chưa có dữ liệu sản phẩm.</div>}
          </div>
        </div>
      </section>

      {/* CAM KẾT MÔI TRƯỜNG */}
      <section className="section section-alt">
        <div className="container grid3">
          <div className="eco-card">Túi nylon sinh học tự hủy</div>
          <div className="eco-card">Tái sử dụng hộp, hoàn tiền</div>
          <div className="eco-card">Hạn chế muỗng nĩa dùng 1 lần</div>
        </div>
      </section>

      {/* ĐỐI TÁC / KHÁCH HÀNG */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">Đối tác & Khách hàng</h2>
        </div>
        <div className="container logo-row">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="logo-box card" style={{ height: 60 }} />
          ))}
        </div>
      </section>
    </>
  );
}
