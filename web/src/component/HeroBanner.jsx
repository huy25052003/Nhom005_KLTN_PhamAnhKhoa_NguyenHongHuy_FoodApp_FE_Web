import React from "react";
import { Link } from "react-router-dom";

export default function HeroBanner() {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <h1>Kế hoạch bữa ăn hàng tuần cho lối sống lành mạnh</h1>
          <p>Trải nghiệm bữa ăn sạch tươi ngon, giàu dinh dưỡng — lên plan theo mục tiêu của bạn.</p>
          <div className="hero-actions">
            <Link to="/order" className="btn btn-primary">Đặt ngay</Link>
            <a href="https://m.me/fitfood.vn" target="_blank" rel="noreferrer" className="btn btn-ghost">Tư vấn</a>
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
  );
}
