import React, { useEffect, useState } from "react";
import { getCart, updateCartItem, removeCartItem, clearCart } from "../../api/cart.js";
import { placeOrderFromCart } from "../../api/orders.js";
import { useAuth } from "../../stores/auth.js";
import { useCart } from "../../stores/cart.js";
import { useNavigate } from "react-router-dom";

export default function CartPage() {
  const { token } = useAuth();
  const { setCount } = useCart();
  const nav = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await getCart();
      setCart(data);
      const items = data?.items || data?.cartItems || [];
      const totalQty = items.reduce((s, it) => s + (it.quantity ?? 0), 0);
      setCount(totalQty);
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Tải giỏ hàng thất bại");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const items = cart?.items || cart?.cartItems || [];

  function unitPrice(it) {
    return (it.price ?? it.product?.price ?? 0);
  }
  function linePrice(it) {
    return unitPrice(it) * (it.quantity ?? 0);
  }
  const total = items.reduce((s, it) => s + linePrice(it), 0);

  async function changeQty(it, delta) {
    const id = it.id ?? it.itemId;
    const next = Math.max(1, (it.quantity ?? 1) + delta);
    await updateCartItem(id, next);
    await load();
  }
  async function remove(it) {
    const id = it.id ?? it.itemId;
    await removeCartItem(id);
    await load();
  }
  async function clearAll() {
    await clearCart();
    await load();
  }
  async function checkoutCOD() {
    if (!token) {
      alert("Vui lòng đăng nhập để thanh toán COD");
      return;
    }
    if (!items.length) {
      alert("Giỏ hàng trống");
      return;
    }
    try {
      const order = await placeOrderFromCart(cart);
      await clearCart();
      setCount(0);
      nav(`/order-success/${order.id ?? ""}`);
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Đặt hàng thất bại");
    }
  }

  return (
    <div className="container section">
      <h1 className="section-title">Giỏ hàng</h1>

      {loading && <div className="muted">Đang tải…</div>}

      {!loading && !items.length && <div>Giỏ hàng trống.</div>}

      {!!items.length && (
        <div className="grid3" style={{ alignItems: "start" }}>
          <div className="card" style={{ gridColumn: "span 2" }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}></th>
                  <th>Sản phẩm</th>
                  <th>Giá</th>
                  <th style={{ width: 150 }}>Số lượng</th>
                  <th>Tổng</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id ?? it.itemId}>
                    <td><div className="product-thumb" style={{ height: 44 }} /></td>
                    <td>{it.product?.name || it.name}</td>
                    <td>{unitPrice(it).toLocaleString("vi-VN")} đ</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <button className="btn" onClick={() => changeQty(it, -1)}>-</button>
                        <div>{it.quantity ?? 1}</div>
                        <button className="btn" onClick={() => changeQty(it, +1)}>+</button>
                      </div>
                    </td>
                    <td>{linePrice(it).toLocaleString("vi-VN")} đ</td>
                    <td><button className="btn" onClick={() => remove(it)}>Xoá</button></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
              <button className="btn" onClick={clearAll}>Xoá hết</button>
              <div />
            </div>
          </div>

          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div>Tạm tính</div>
              <div>{total.toLocaleString("vi-VN")} đ</div>
            </div>
            <div className="muted" style={{ marginBottom: 12 }}>Phí ship tính khi xác nhận.</div>
            <button className="btn btn-primary w-full" onClick={checkoutCOD}>Đặt hàng (COD)</button>
            <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
              Thanh toán khi nhận hàng (COD). Nhân viên sẽ liên hệ xác nhận đơn.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
