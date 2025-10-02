import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getCategoryProducts, getCategoriesPublic } from "../../api/public.js";
import { addToCart, getCart } from "../../api/cart.js";
import { useAuth } from "../../stores/auth.js";
import { useCart } from "../../stores/cart.js";

const formatVND = (n) => (Number(n || 0)).toLocaleString("vi-VN") + " đ";

export default function CategoryProductsPage() {
  const { categoryId } = useParams();
  const [catName, setCatName] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const { token } = useAuth();
  const { setCount } = useCart();

  useEffect(() => {
    let stop = false;
    (async () => {
      setLoading(true);
      try {
        const [cats, products] = await Promise.all([
          getCategoriesPublic(100).catch(() => []),
          getCategoryProducts(categoryId, 80),
        ]);
        if (!stop) {
          setItems(Array.isArray(products) ? products : []);
          const cat = (cats || []).find((c) => String(c.id) === String(categoryId));
          setCatName(cat?.name || `Danh mục #${categoryId}`);
        }
      } finally {
        if (!stop) setLoading(false);
      }
    })();
    return () => { stop = true; };
  }, [categoryId]);

  async function onAdd(p) {
    if (!token) {
      window.location.href = "/admin/login?redirect=/cart";
      return;
    }
    await addToCart(p.id, 1);
    const cart = await getCart();
    const items = cart?.items || cart?.cartItems || [];
    const totalQty = items.reduce((s, it) => s + (it?.quantity ?? 0), 0);
    setCount(totalQty);
  }

  return (
    <div className="container section">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 className="h1" style={{ margin: 0 }}>{catName}</h1>
        <Link to="/" className="btn btn-ghost" style={{ marginLeft: "auto" }}>← Về trang chủ</Link>
      </div>

      <div className="grid4" style={{ marginTop: 16 }}>
        {loading ? (
          <div className="muted">Đang tải…</div>
        ) : items.length ? (
          items.map((it) => (
            <div key={it.id} className="card product-card">
              <Link to={`/products/${it.id}`}>
                <img
                  className="product-img"
                  src={it.imageUrl || "/placeholder.jpg"}
                  alt={it.name}
                  style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 8 }}
                  loading="lazy"
                />
              </Link>
              <div className="product-info">
                <Link to={`/products/${it.id}`} className="product-name">
                  {it.name}
                </Link>
                <div className="product-price">{formatVND(it.price)}</div>
              </div>
              <div className="card-actions">
                <button className="btn" onClick={() => onAdd(it)}>Thêm vào giỏ</button>
                <Link to={`/products/${it.id}`} className="btn btn-ghost">Xem chi tiết</Link>
              </div>
            </div>
          ))
        ) : (
          <div className="muted">Chưa có sản phẩm trong danh mục này.</div>
        )}
      </div>
    </div>
  );
}
