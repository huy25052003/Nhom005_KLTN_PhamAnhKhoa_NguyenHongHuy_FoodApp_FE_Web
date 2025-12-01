import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast"; // Import Toast
import { getCart, updateCartItem, removeCartItem, clearCart} from "../../api/cart.js";
import { placeOrderFromCart, createCodOrderFromCart } from "../../api/orders.js";
import { useAuth } from "../../stores/auth.js";
import { useCart } from "../../stores/cart.js";
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
    // Optimistic UI: Có thể cập nhật state ngay tại đây nếu muốn mượt hơn
    await updateCartItem(item.id, next);
    await load();
  }

  async function placeOrderSimpleCOD() {
    const itemsLocal = (cart?.items || cart?.cartItems || []);
    if (!itemsLocal.length) { toast.error("Giỏ hàng trống"); return; }

    setPlacing(true);
    try {
      // Dùng hàm createCodOrderFromCart chuẩn hơn
      const order = await createCodOrderFromCart(cart); 
      toast.success(`Đặt hàng thành công! Mã đơn: ${order?.id ?? ""}`);
      setCount(0); // Reset số lượng trên header
      // Chuyển hướng sang trang thành công
      setTimeout(() => nav(`/order-success/${order?.id}`), 1000);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Đặt hàng thất bại");
    } finally {
      setPlacing(false);
    }
  }

  async function payWithPayOS() {
    const itemsLocal = (cart?.items || cart?.cartItems || []);
    if (!itemsLocal.length) { toast.error("Giỏ hàng trống"); return; }

    setPlacing(true);
    const toastId = toast.loading("Đang tạo cổng thanh toán...");
    try {
      // Tự động tạo đơn trước khi thanh toán
      const order = await createCodOrderFromCart(cart, "Thanh toán qua PayOS"); // Tận dụng hàm create order
      if (!order?.id) throw new Error("Không tạo được đơn hàng.");

      const paymentUrl = await createPaymentLink(order.id);
      if (!paymentUrl) throw new Error("Không lấy được link thanh toán.");
      
      toast.dismiss(toastId);
      window.location.href = paymentUrl;
    } catch (e) {
      toast.dismiss(toastId);
      toast.error(e?.response?.data?.message || e?.message || "Lỗi thanh toán");
      setPlacing(false);
    }
  }

  async function onRemove(item) {
    if(!confirm("Xóa sản phẩm này?")) return;
    try {
      await removeCartItem(item.id);
      toast.success("Đã xóa sản phẩm");
      await load();
    } catch {
      toast.error("Lỗi xóa sản phẩm");
    }
  }

  async function onClear() {
    if (!confirm("Xoá toàn bộ giỏ hàng?")) return;
    try {
      await clearCart();
      toast.success("Đã làm trống giỏ hàng");
      await load();
    } catch {
      toast.error("Lỗi xóa giỏ hàng");
    }
  }

  if (loading) return <div className="container section">Đang tải giỏ hàng…</div>;

  return (
    <div className="container section fade-in">
      <h1 className="h1">Giỏ hàng</h1>

      {!items.length ? (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <div className="muted" style={{marginBottom: 16}}>Giỏ hàng của bạn đang trống.</div>
          <Link className="btn btn-primary" to="/menu">Xem thực đơn ngay</Link>
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
                          <button className="btn btn-sm" onClick={() => changeQty(it, -1)}>−</button>
                          <div style={{ minWidth: 28, textAlign: "center", fontWeight: "bold" }}>{it.quantity}</div>
                          <button className="btn btn-sm" onClick={() => changeQty(it, +1)}>+</button>
                        </div>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "bold" }}>{fmt(price * (it.quantity || 0))}</td>
                      <td style={{ textAlign: "right" }}>
                        <button className="btn btn-danger btn-sm" onClick={() => onRemove(it)}>Xoá</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} style={{ textAlign: "right", fontWeight: 700 }}>Tổng cộng</td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontSize: "1.2rem", color: "var(--primary)" }}>{fmt(total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 24, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn btn-danger btn-outline" onClick={onClear}>Xoá giỏ hàng</button>
            <Link className="btn btn-ghost" to="/menu">Mua thêm</Link>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button className="btn" onClick={placeOrderSimpleCOD} disabled={placing}>
                {placing ? "Đang xử lý..." : "Đặt hàng (COD)"}
              </button>
              <button className="btn btn-primary" onClick={payWithPayOS} disabled={placing}>
                {placing ? "Đang xử lý..." : "Thanh toán PayOS"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}