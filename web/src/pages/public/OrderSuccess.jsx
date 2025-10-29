import React from "react";
import { useParams, Link } from "react-router-dom";

export default function OrderSuccessPage() {
  const { id } = useParams();
  return (
    <div className="container section fade-in">
      <div className="card card-hover" style={{ textAlign: "center" }}>
        <h2>Đặt hàng thành công! ✅</h2>
        <p>Mã đơn: <b>{id || "—"}</b>. Cảm ơn bạn đã đặt hàng.</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: '1rem' }}>
          <Link className="btn" to="/">Về trang chủ</Link>
          <Link className="btn btn-primary" to="/account/orders">Xem đơn hàng</Link>
        </div>
      </div>
    </div>
  );
}