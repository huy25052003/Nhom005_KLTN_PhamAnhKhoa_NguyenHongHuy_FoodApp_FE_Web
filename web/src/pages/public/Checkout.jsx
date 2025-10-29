import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getCart, updateCartItem, removeCartItem, clearCart } from "../../api/cart.js";
import { placeOrder } from "../../api/orders.js";
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
  const [promoCode, setPromoCode] = useState("");
  const [cartActionLoading, setCartActionLoading] = useState(false);
  const [shipping, setShipping] = useState(null);
  const isShippingValid = !!(shipping && shipping.phone && shipping.addressLine);

  async function loadData() {
    setLoading(true);
    try {
      if (!token) {
        nav(`/admin/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
        return;
      }
      const [c, s] = await Promise.all([
        getCart(),
        getMyShipping().catch(() => null),
      ]);
      setCart(c);
      setShipping(s);
      const items = c?.items || c?.cartItems || [];
      const totalQty = items.reduce((sum, it) => sum + (it?.quantity ?? 0), 0);
      setCount(totalQty);
    } catch (e) {
      console.error("Failed to load cart/shipping", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const m = (sp.get("method") || "").toUpperCase();
    if (m === "PAYOS") setMethod("PAYOS");
    if (m === "COD") setMethod("COD");
    loadData();
  }, [token, nav, sp]);

  const items = cart?.items || cart?.cartItems || [];
  const total = useMemo(
    () => items.reduce((s, it) => s + (it?.quantity || 0) * (it?.product?.price || it?.price || 0), 0),
    [items]
  );

  async function changeQty(item, delta) {
    if (cartActionLoading) return;
    const next = Math.max(1, (item?.quantity || 1) + delta);
    setCartActionLoading(true);
    try {
      await updateCartItem(item.id, next);
      await loadData();
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Cập nhật số lượng thất bại");
    } finally {
      setCartActionLoading(false);
    }
  }

  async function onRemove(item) {
    if (cartActionLoading) return;
    setCartActionLoading(true);
    try {
      await removeCartItem(item.id);
      await loadData();
    } catch (e) {
       alert(e?.response?.data?.message || e?.message || "Xóa sản phẩm thất bại");
    } finally {
       setCartActionLoading(false);
    }
  }

  async function onClear() {
    if (cartActionLoading || !confirm("Xoá toàn bộ giỏ hàng?")) return;
    setCartActionLoading(true);
    try {
      await clearCart();
      await loadData();
    } catch (e) {
       alert(e?.response?.data?.message || e?.message || "Xóa giỏ hàng thất bại");
    } finally {
       setCartActionLoading(false);
    }
  }

  async function handlePlaceOrder() {
     if (!items.length) { alert("Giỏ hàng trống."); return; }
    if (!isShippingValid) {
      alert("Vui lòng nhập thông tin giao hàng trước khi đặt.");
      nav(`/account/shipping?redirect=${encodeURIComponent("/checkout")}`);
      return;
    }
    setPlacing(true);
    try {
      const orderItemsPayload = items.map(it => ({
        product: { id: it.product?.id },
        quantity: it.quantity
      }));
      const shippingInfoPayload = {
         phone: shipping.phone,
         addressLine: shipping.addressLine,
         city: shipping.city || "",
         note: shipping.note || ""
      };
      const requestPayload = {
        items: orderItemsPayload,
        shippingInfo: shippingInfoPayload,
        paymentMethod: method,
        promoCode: promoCode.trim() || null
      };
      const order = await placeOrder(requestPayload);
      if (!order?.id) throw new Error("Không tạo được đơn hàng.");

      if (order.paymentMethod === "COD") {
        alert("Đặt hàng thành công! Bạn sẽ thanh toán khi nhận hàng.");
        setCount(0);
        nav(`/order-success/${order.id}`);
        return;
      }
      if (order.paymentMethod === "PAYOS") {
        try { sessionStorage.setItem("lastPayOrderId", String(order.id)); } catch {}
        const payUrl = await createPaymentLink(order.id);
        if (!payUrl) throw new Error("Không nhận được payment URL từ PayOS.");
        window.location.href = payUrl;
        return;
      }
      alert("Phương thức thanh toán không hợp lệ.");
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Đặt hàng thất bại");
    } finally {
      setPlacing(false);
    }
  }

  if (loading && !cart) return <div className="container section">Đang tải trang thanh toán…</div>;

  return (
    <div className="container section fade-in">
      <h1 className="h1">Giỏ hàng & Thanh toán</h1>
      <div className="grid2">
        <div className="card card-hover">
          <div className="card-title">Giỏ hàng của bạn</div>
          {loading && <div>Đang cập nhật giỏ hàng...</div>}
          {!items.length ? (
            <div className="muted">Giỏ hàng trống. <Link to="/">Mua hàng</Link></div>
          ) : (
            <>
              <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '1rem' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 72 }}></th>
                      <th>Sản phẩm</th>
                      <th style={{ textAlign: "right" }}>Giá</th>
                      <th style={{ textAlign: "center" }}>Số lượng</th>
                      <th style={{ textAlign: "right" }}>Thành tiền</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => {
                      const p = it.product || {};
                      const price = p.price ?? it.price ?? 0;
                      return (
                        <tr key={it.id}>
                          <td>
                            <Link to={`/products/${p.id}`}>
                              <div
                                style={{
                                  width: 56, height: 56, borderRadius: 8,
                                  background: `#f4f4f4 url(${p.imageUrl || "/placeholder.jpg"}) center/cover no-repeat`
                                }}
                              />
                            </Link>
                          </td>
                          <td>
                            <Link to={`/products/${p.id}`} style={{ fontWeight: 600, color: 'inherit', textDecoration: 'none' }}>{p.name || it.name}</Link>
                            {p.category?.name && <div className="muted">{p.category.name}</div>}
                          </td>
                          <td style={{ textAlign: "right" }}>{fmt(price)}</td>
                          <td style={{ textAlign: "center" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                              <button className="btn" onClick={() => changeQty(it, -1)} disabled={cartActionLoading || it.quantity <= 1}>−</button>
                              <div style={{ minWidth: 28, textAlign: "center" }}>{it.quantity}</div>
                              <button className="btn" onClick={() => changeQty(it, +1)} disabled={cartActionLoading}>+</button>
                            </div>
                          </td>
                          <td style={{ textAlign: "right" }}>{fmt(price * (it.quantity || 0))}</td>
                          <td style={{ textAlign: "right" }}>
                            <button className="btn btn-danger" onClick={() => onRemove(it)} disabled={cartActionLoading}>Xoá</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ borderTop: '1px solid #eee', paddingTop: '1rem', marginTop: '1rem' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: '1rem' }}>
                    <span>Tổng cộng</span>
                    <span>{fmt(total)}</span>
                  </div>
                 <div style={{ marginBottom: '1rem' }}>
                    <label htmlFor="promoCode" style={{ marginRight: '8px', fontWeight: 600 }}>Mã giảm giá:</label>
                    <input
                      id="promoCode"
                      className="input"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Nhập mã (nếu có)"
                      style={{ width: 'auto', display: 'inline-block', marginRight: '8px' }}
                    />
                  </div>
                  <button className="btn btn-danger" onClick={onClear} disabled={cartActionLoading}>Xoá toàn bộ giỏ hàng</button>
              </div>
            </>
          )}
        </div>
        <div className="card card-hover">
          <div className="card-title">Thông tin giao hàng</div>
          {loading && !shipping && <div>Đang tải thông tin...</div>}
          {!isShippingValid && !loading && (
            <div className="muted">
              Chưa có thông tin giao hàng.{" "}
              <Link className="btn" to={`/account/shipping?redirect=${encodeURIComponent("/checkout")}`}>
                Nhập thông tin giao hàng
              </Link>
            </div>
          )}
          {isShippingValid && (
             <div style={{ lineHeight: 1.6 }}>
              <div><b>Điện thoại:</b> {shipping.phone}</div>
              <div><b>Địa chỉ:</b> {shipping.addressLine}</div>
              {shipping.city ? <div><b>Tỉnh/Thành:</b> {shipping.city}</div> : null}
              {shipping.note ? <div><b>Ghi chú:</b> {shipping.note}</div> : null}
              <div style={{ marginTop: 8 }}>
                <Link className="btn btn-ghost" to={`/account/shipping?redirect=${encodeURIComponent("/checkout")}`}>
                  Sửa thông tin giao hàng
                </Link>
              </div>
            </div>
          )}
          <hr style={{ margin: "16px 0", opacity: 0.15 }} />
          <div className="card-title" style={{ marginTop: 0 }}>Phương thức thanh toán</div>
          <label className="radio-row" style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <input
              type="radio"
              name="pm"
              value="COD"
              checked={method === "COD"}
              onChange={() => setMethod("COD")}
              style={{ marginRight: '8px' }}
            />
            <span>COD (Thanh toán khi nhận hàng)</span>
          </label>
          <label className="radio-row" style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="radio"
              name="pm"
              value="PAYOS"
              checked={method === "PAYOS"}
              onChange={() => setMethod("PAYOS")}
              style={{ marginRight: '8px' }}
            />
            <span>PayOS (Thanh toán online)</span>
          </label>
          <div style={{ marginTop: 16 }}>
            <button
              className="btn btn-primary w-full"
              disabled={!items.length || placing || !isShippingValid || cartActionLoading || loading}
              onClick={handlePlaceOrder}
              title={!isShippingValid ? "Vui lòng nhập thông tin giao hàng" : !items.length ? "Giỏ hàng trống" : ""}
            >
              {placing ? "Đang xử lý..." : method === "COD" ? "Đặt hàng (COD)" : "Tiếp tục với PayOS"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}