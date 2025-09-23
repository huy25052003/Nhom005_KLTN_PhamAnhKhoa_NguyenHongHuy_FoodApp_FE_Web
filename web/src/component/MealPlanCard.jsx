import React from "react";

export default function MealPlanCard({ name, desc, price, badge }) {
  return (
    <div className="card plan-card">
      {badge && <div className="badge badge-primary">{badge}</div>}
      <div className="plan-name">{name}</div>
      <div className="plan-desc">{desc}</div>
      <div className="plan-price">{(price ?? 0).toLocaleString("vi-VN")} đ</div>
      <button className="btn btn-primary w-full">Chọn gói</button>
    </div>
  );
}
