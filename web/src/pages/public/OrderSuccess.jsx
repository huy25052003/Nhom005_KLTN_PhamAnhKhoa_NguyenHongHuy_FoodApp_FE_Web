import React from "react";
import { useParams, Link } from "react-router-dom";

export default function OrderSuccessPage() {
  const { id } = useParams();
  return (
    <div className="container section">
      <div className="card" style={{ textAlign: "center" }}>
        <h2>Đặt hàng thành công!</h2>
        <p>Mã đơn: <b>{id || "—"}</b>. Cảm ơn bạn đã đặt hàng.</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <Link className="btn" to="/">Về trang chủ</Link>
          <Link className="btn btn-primary" to="/cart">Xem giỏ hàng</Link>
        </div>
      </div>
    </div>
  );
}
