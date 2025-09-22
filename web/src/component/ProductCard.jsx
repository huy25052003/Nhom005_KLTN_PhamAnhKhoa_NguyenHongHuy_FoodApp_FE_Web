import React from "react";

const fmtVND = (n) => (Number(n ?? 0)).toLocaleString("vi-VN") + " đ";

export default function ProductCard({ p }) {
  const img = p?.imageUrl || p?.thumbnail || "";
  const catName = p?.category?.name || p?.categoryName || "";
  const stock = p?.stock ?? null;

  return (
    <div className="card product-card">
      <div className="thumb">
        {img ? (
          <img src={img} alt={p?.name} />
        ) : (
          <div className="thumb-fallback">No Image</div>
        )}
      </div>
      <div className="product-body">
        <div className="product-name" title={p?.name}>{p?.name}</div>
        {catName && <div className="muted small">{catName}</div>}
        <div className="product-bottom">
          <div className="price">{fmtVND(p?.price)}</div>
          {stock !== null && <div className="badge">{stock} tồn</div>}
        </div>
      </div>
    </div>
  );
}
