import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCart, updateCartItem, removeCartItem, clearCart} from "../../api/cart.js";
import { placeOrderFromCart } from "../../api/orders.js";
import { useAuth } from "../../stores/auth.js";
import { useCart } from "../../stores/cart.js";
import { createCodOrderFromCart } from "../../api/orders.js";
import { createPaymentLink } from "../../api/payment.js";

const fmt = (n) => (Number(n || 0)).toLocaleString("vi-VN") + " đ";

export default function CartPage() {
  const { token } = useAuth();
  const { setCount } = useCart();
  const nav = useNavigate();
  const [placing, setPlacing] = useState(false);
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const c = await getCart();
      setCart(c);
      const items = c?.items || c?.cartItems || [];
      setCount(items.reduce((s, it) => s + (it?.quantity || 0), 0));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) { nav("/admin/login?redirect=/cart"); return; }
    load();
  }, [token]);

  const items = cart?.items || cart?.cartItems || [];
  const total = useMemo(
    () => items.reduce((s, it) => s + (it?.quantity || 0) * (it?.product?.price || it?.price || 0), 0),
    [items]
  );

  async function changeQty(item, delta) {
    const next = Math.max(1, (item?.quantity || 1) + delta);
    await updateCartItem(item.id, next);
    await load();
  }

  async function placeOrderSimpleCOD() {
    const itemsLocal = (cart?.items || cart?.cartItems || []);
    if (!itemsLocal.length) { alert("Giỏ hàng trống"); return; }

    setPlacing(true);
    try {
      const order = await placeOrderFromCart(cart); 
      alert(`Đặt hàng (COD) thành công! Mã đơn: ${order?.id ?? ""}`);
      await clearCart();
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Đặt hàng thất bại");
    } finally {
      setPlacing(false);
    }
  }
    async function placeOrderSimpleCOD() {
      const items = (cart?.items || cart?.cartItems || []);
      if (!items.length) { alert("Giỏ hàng trống"); return; }
      setPlacing(true);
      try {
        const order = await createCodOrderFromCart(cart);
        alert(`Đặt hàng thành công! Mã đơn: ${order?.id ?? ""}`);
      } catch (e) {
        alert(e?.response?.data?.message || e?.message || "Đặt hàng thất bại");
      } finally {
        setPlacing(false);
      }
    }
  async function payWithPayOS() {
    const itemsLocal = (cart?.items || cart?.cartItems || []);
    if (!itemsLocal.length) { alert("Giỏ hàng trống"); return; }

    setPlacing(true);
    try {
      const order = await placeOrderFromCart(cart);
      if (!order?.id) throw new Error("Không lấy được mã đơn hàng.");

      const paymentUrl = await createPaymentLink(order.id);
      if (!paymentUrl) throw new Error("Không tạo được link thanh toán PayOS.");
      window.location.href = paymentUrl;
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Thanh toán PayOS thất bại");
    } finally {
      setPlacing(false);
    }
  }

  async function onRemove(item) {
    await removeCartItem(item.id);
    await load();
  }

  async function onClear() {
    if (!confirm("Xoá toàn bộ giỏ hàng?")) return;
    await clearCart();
    await load();
  }

  if (loading) return <div className="container section">Đang tải giỏ hàng…</div>;

  return (
    <div className="container section">
      <h1 className="h1">Giỏ hàng</h1>

      {!items.length ? (
        <div className="card" style={{ padding: 16 }}>
          <div className="muted">Giỏ hàng trống.</div>
          <div style={{ marginTop: 12 }}>
            <Link className="btn" to="/">Tiếp tục mua hàng</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="card" style={{ overflow: "hidden" }}>
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
                        <div
                          style={{
                            width: 56, height: 56, borderRadius: 8,
                            background: `#f4f4f4 url(${p.imageUrl || "/placeholder.jpg"}) center/cover no-repeat`
                          }}
                        />
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.name || it.name}</div>
                        {p.category?.name && <div className="muted">{p.category.name}</div>}
                      </td>
                      <td style={{ textAlign: "right" }}>{fmt(price)}</td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          <button className="btn" onClick={() => changeQty(it, -1)}>−</button>
                          <div style={{ minWidth: 28, textAlign: "center" }}>{it.quantity}</div>
                          <button className="btn" onClick={() => changeQty(it, +1)}>+</button>
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>{fmt(price * (it.quantity || 0))}</td>
                      <td style={{ textAlign: "right" }}>
                        <button className="btn btn-danger" onClick={() => onRemove(it)}>Xoá</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} style={{ textAlign: "right", fontWeight: 700 }}>Tổng cộng</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
            <button className="btn btn-danger" onClick={onClear}>Xoá giỏ hàng</button>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button className="btn" onClick={placeOrderSimpleCOD} disabled={placing}>
                {placing ? "Đang đặt..." : "Đặt hàng (COD)"}
              </button>
              <button className="btn btn-primary" onClick={payWithPayOS} disabled={placing}>
                {placing ? "Đang chuyển PayOS..." : "Thanh toán PayOS"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
