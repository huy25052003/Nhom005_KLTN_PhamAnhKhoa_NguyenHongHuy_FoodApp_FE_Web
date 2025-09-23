import React, { useEffect, useState } from "react";
import { getFeaturedProducts, getCategoriesPublic } from "../../api/public.js";
import HeroBanner from "../../component/HeroBanner.jsx";
import MealPlanCard from "../../component/MealPlanCard.jsx";
import ProductCard from "../../component/ProductCard.jsx";

const samplePlans = [
  { name: "Gói FIT 3 Trưa - Tối", desc: "Best seller", price: 650000, badge: "Best seller" },
  { name: "Gói FULL 3 bữa/ngày", desc: "Giữ cân healthy", price: 825000 },
  { name: "Gói SLIM Không tinh bột", desc: "Gấp đôi rau", price: 600000 },
  { name: "Gói MEAT Tăng cơ", desc: "Thêm 1.5x thịt", price: 950000 },
];

export default function HomePage() {
  const [cats, setCats] = useState([]);
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [c, p] = await Promise.all([
          getCategoriesPublic(6),
          getFeaturedProducts(8),
        ]);
        setCats(c);
        setFeatured(p);
      } catch {
        setCats([]);
        setFeatured([]);
      }
    })();
  }, []);

  return (
    <>
      <HeroBanner />

      <section className="section">
        <div className="container">
          <h2 className="section-title">Cách đặt hàng</h2>
          <div className="grid4 howto">
            <div className="howto-item"><div className="howto-step">1</div><div>Chọn gói ăn<br/>phù hợp</div></div>
            <div className="howto-item"><div className="howto-step">2</div><div>FoodApp nấu<br/>nguyên liệu tươi</div></div>
            <div className="howto-item"><div className="howto-step">3</div><div>Giao tận nơi<br/>mỗi ngày</div></div>
            <div className="howto-item"><div className="howto-step">4</div><div>Hâm nóng &<br/>thưởng thức</div></div>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <h2 className="section-title">Sản phẩm tiêu biểu</h2>
          <div className="grid4">
            {samplePlans.map((p, i) => <MealPlanCard key={i} {...p} />)}
          </div>
        </div>
      </section>

      {cats?.length > 0 && (
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

      <section className="section">
        <div className="container">
          <h2 className="section-title">Món được yêu thích</h2>
          <div className="grid4">
            {(featured?.length ? featured : []).map(it => (
              <ProductCard key={it.id} name={it.name} price={it.price} imageUrl={it.imageUrl} />
            ))}
            {!featured?.length && <div className="muted">Chưa có dữ liệu sản phẩm.</div>}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container grid3">
          <div className="eco-card">Túi nylon sinh học tự hủy</div>
          <div className="eco-card">Tái sử dụng hộp, hoàn tiền</div>
          <div className="eco-card">Hạn chế muỗng nĩa dùng 1 lần</div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">Đối tác & Khách hàng</h2>
          <div className="logo-row">
            {Array.from({ length: 10 }).map((_, i) => <div key={i} className="logo-box" />)}
          </div>
        </div>
      </section>
    </>
  );
}
