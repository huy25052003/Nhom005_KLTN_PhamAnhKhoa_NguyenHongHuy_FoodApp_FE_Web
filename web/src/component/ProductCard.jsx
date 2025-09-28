import React from "react";

export default function ProductCard({ name, price, imageUrl, onAdd }) {
  return (
    <div className="card product-card">
      <div className="product-thumb" style={{ backgroundImage:`url(${imageUrl || "/placeholder.jpg"})` }} />
      <div className="product-info">
        <div className="product-name">{name}</div>
        <div className="product-price">{(price ?? 0).toLocaleString("vi-VN")} đ</div>
      </div>
      <button className="btn btn-ghost w-full" onClick={onAdd}>Thêm vào giỏ</button>
    </div>
  );
}
