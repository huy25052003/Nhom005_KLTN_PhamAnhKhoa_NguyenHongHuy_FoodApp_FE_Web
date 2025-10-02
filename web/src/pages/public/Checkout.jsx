import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCart } from "../../api/cart.js";
import { createOrder, cartToOrderPayload } from "../../api/orders.js";
import { createPaymentLink } from "../../api/payment.js";
import { useAuth } from "../../stores/auth.js";
import { useCart } from "../../stores/cart.js";

const fmt = (n) => (Number(n || 0)).toLocaleString("vi-VN") + " đ";

export default function CheckoutPage() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const { token } = useAuth();
  const { setCount } = useCart();

  const [cart, setCart] = useState(null);
  const [method, setMethod] = useState("COD");
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    let stop = false;
    (async () => {
      if (!token) { nav("/admin/login?redirect=/checkout"); return; }
      try {
        const m = (sp.get("method") || "").toUpperCase();
        if (m === "PAYOS") setMethod("PAYOS");
        if (m === "COD") setMethod("COD");

        const c = await getCart();
        if (!stop) setCart(c);
      } finally {
        if (!stop) setLoading(false);
      }
    })();
    return () => { stop = true; };
  }, [token]);

  const items = cart?.items || cart?.cartItems || [];
  const total = useMemo(
    () => items.reduce((s, it) => s + (it?.quantity || 0) * (it?.product?.price || it?.price || 0), 0),
    [items]
  );

  async function placeOrder() {
    if (!items.length) { alert("Giỏ hàng trống."); return; }
    setPlacing(true);
    try {
      const payload = cartToOrderPayload(cart, { paymentMethod: method });
      const order = await createOrder(payload);
      if (!order?.id) throw new Error("Không tạo được đơn hàng.");

      if (method === "COD") {
        alert("Đặt hàng thành công! Bạn sẽ thanh toán khi nhận hàng.");
        setCount(0);         
        nav("/orders/my");    
        return;
      }

      const payUrl = await createPaymentLink(order.id);
      if (!payUrl) throw new Error("Không nhận được payment URL từ PayOS.");
      window.location.href = payUrl;
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Đặt hàng thất bại");
    } finally {
      setPlacing(false);
    }
  }

  if (loading) return <div className="container section">Đang tải…</div>;

  return (
    <div className="container section">
      <h1 className="h1">Thanh toán</h1>

      <div className="grid2">
        <div className="card">
          <div className="card-title">Đơn hàng</div>
          {!items.length ? (
            <div className="muted">Giỏ hàng trống.</div>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Sản phẩm</th><th style={{textAlign:"right"}}>Tạm tính</th></tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const p = it.product || {};
                  const price = p.price ?? it.price ?? 0;
                  return (
                    <tr key={it.id}>
                      <td>{p.name || it.name} × {it.quantity}</td>
                      <td style={{ textAlign: "right" }}>{fmt(price * (it.quantity || 0))}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ fontWeight: 700 }}>Tổng cộng</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(total)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        <div className="card">
          <div className="card-title">Phương thức thanh toán</div>

          <label className="radio-row">
            <input
              type="radio"
              name="pm"
              value="COD"
              checked={method === "COD"}
              onChange={() => setMethod("COD")}
            />
            <span>COD (Thanh toán khi nhận hàng)</span>
          </label>

          <label className="radio-row">
            <input
              type="radio"
              name="pm"
              value="PAYOS"
              checked={method === "PAYOS"}
              onChange={() => setMethod("PAYOS")}
            />
            <span>PayOS (Thanh toán online)</span>
          </label>

          <div style={{ marginTop: 16 }}>
            <button className="btn btn-primary" disabled={!items.length || placing} onClick={placeOrder}>
              {placing ? "Đang xử lý..." : method === "COD" ? "Đặt hàng (COD)" : "Thanh toán PayOS"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
