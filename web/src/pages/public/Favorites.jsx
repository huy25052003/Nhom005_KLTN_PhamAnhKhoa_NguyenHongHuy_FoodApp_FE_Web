import React, { useEffect, useState } from "react";
import { getMyFavorites } from "../../api/favorites.js";
import { useAuth } from "../../stores/auth.js";
import { Link, useNavigate } from "react-router-dom";

const fmt = (n) => (Number(n || 0)).toLocaleString("vi-VN") + " đ";

export default function FavoritesPage() {
  const { token } = useAuth();
  const nav = useNavigate();
  const [page, setPage] = useState(0);
  const [size] = useState(12);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { nav("/admin/login?redirect=/favorites"); return; }
    (async () => {
      setLoading(true);
      try {
        const res = await getMyFavorites(page, size);
        setData(res);
      } finally { setLoading(false); }
    })();
  }, [token, page, size]);

  if (loading) return <div className="container section">Đang tải…</div>;

  const items = data?.content || [];
  const totalPages = Math.max(1, data?.totalPages || 1);

  return (
    <div className="container section">
      <h1 className="h1">Sản phẩm yêu thích</h1>

      {!items.length ? (
        <div className="card" style={{ padding: 16 }}>
          <div className="muted">Chưa có sản phẩm yêu thích.</div>
          <div style={{ marginTop: 12 }}>
            <Link className="btn" to="/">Về trang chủ</Link>
          </div>
        </div>
      ) : (
        <div className="grid4">
          {items.map(p => (
            <div key={p.id} className="card product-card">
              <Link
                to={`/products/${p.id}`}
                className="product-thumb"
                style={{ backgroundImage: `url(${p.imageUrl || "/placeholder.jpg"})` }}
              />
              <div className="product-info">
                <Link to={`/products/${p.id}`} className="product-name">{p.name}</Link>
                <div className="product-price">{fmt(p.price)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pagination" style={{ marginTop: 12 }}>
        <button className="btn" disabled={page <= 0} onClick={() => setPage(p => p - 1)}>← Trước</button>
        <span>Trang {page + 1}/{totalPages}</span>
        <button className="btn" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>Sau →</button>
      </div>
    </div>
  );
}
