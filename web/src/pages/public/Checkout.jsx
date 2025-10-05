import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getCart } from "../../api/cart.js";
import { createOrder, cartToOrderPayload } from "../../api/orders.js";
import { createPaymentLink } from "../../api/payment.js";
import { getMyShipping } from "../../api/shipping.js";
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

  // Shipping info
  const [shipping, setShipping] = useState(null);
  const isShippingValid = !!(shipping && shipping.phone && shipping.addressLine);

  useEffect(() => {
    let stop = false;
    (async () => {
      if (!token) { nav("/admin/login?redirect=/checkout"); return; }
      try {
        const m = (sp.get("method") || "").toUpperCase();
        if (m === "PAYOS") setMethod("PAYOS");
        if (m === "COD") setMethod("COD");

        // Load cart & shipping song song
        const [c, s] = await Promise.all([
          getCart(),
          getMyShipping().catch(() => null),
        ]);
        if (!stop) {
          setCart(c);
          setShipping(s);
        }
      } finally {
        if (!stop) setLoading(false);
      }
    })();
    return () => { stop = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const items = cart?.items || cart?.cartItems || [];
  const total = useMemo(
    () => items.reduce((s, it) => s + (it?.quantity || 0) * (it?.product?.price || it?.price || 0), 0),
    [items]
  );

  async function placeOrder() {
    if (!items.length) { alert("Giỏ hàng trống."); return; }
    if (!isShippingValid) {
      alert("Vui lòng nhập thông tin giao hàng trước khi đặt.");
      nav(`/account/shipping?redirect=${encodeURIComponent("/checkout")}`);
      return;
    }

    setPlacing(true);
    try {
      // Gửi kèm shippingId nếu BE hỗ trợ (an toàn: BE bỏ qua nếu không dùng)
      const payload = cartToOrderPayload(cart, {
        paymentMethod: method,
        shippingId: shipping?.id || null,
      });

      const order = await createOrder(payload);
      if (!order?.id) throw new Error("Không tạo được đơn hàng.");

      if (method === "COD") {
        alert("Đặt hàng thành công! Bạn sẽ thanh toán khi nhận hàng.");
        setCount(0);
        nav("/orders/my");
        return;
      }

      // PAYOS
      // Lưu orderId để trang PaymentResult có thể kiểm tra polling
      try { sessionStorage.setItem("lastPayOrderId", String(order.id)); } catch {}
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
        {/* Đơn hàng */}
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

        {/* Thông tin giao hàng + phương thức thanh toán */}
        <div className="card">
          <div className="card-title">Thông tin giao hàng</div>

          {!isShippingValid ? (
            <div className="muted">
              Chưa có thông tin giao hàng.{" "}
              <Link className="btn" to={`/account/shipping?redirect=${encodeURIComponent("/checkout")}`}>
                Nhập thông tin giao hàng
              </Link>
            </div>
          ) : (
            <div style={{ lineHeight: 1.6 }}>
              <div><b>Điện thoại:</b> {shipping.phone}</div>
              <div><b>Địa chỉ:</b> {shipping.addressLine}</div>
              {shipping.city ? <div><b>Tỉnh/Thành:</b> {shipping.city}</div> : null}
              <div style={{ marginTop: 8 }}>
                <Link className="btn btn-ghost" to={`/account/shipping?redirect=${encodeURIComponent("/checkout")}`}>
                  Sửa thông tin giao hàng
                </Link>
              </div>
            </div>
          )}

          <hr style={{ margin: "16px 0", opacity: 0.15 }} />

          <div className="card-title" style={{ marginTop: 0 }}>Phương thức thanh toán</div>
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
            <button
              className="btn btn-primary"
              disabled={!items.length || placing || !isShippingValid}
              onClick={placeOrder}
              title={!isShippingValid ? "Vui lòng nhập thông tin giao hàng trước" : ""}
            >
              {placing ? "Đang xử lý..." : method === "COD" ? "Đặt hàng (COD)" : "Thanh toán PayOS"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
