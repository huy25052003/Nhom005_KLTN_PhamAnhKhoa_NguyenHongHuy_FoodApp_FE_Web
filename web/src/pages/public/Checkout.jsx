import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getCart, updateCartItem, removeCartItem, clearCart } from "../../api/cart.js";
import { placeOrder } from "../../api/orders.js";
import { createPaymentLink } from "../../api/payment.js";
import { getMyShipping } from "../../api/shipping.js";
import { previewPromotion } from "../../api/promotions.js"; 
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
  const [cartActionLoading, setCartActionLoading] = useState(false);

  const [shipping, setShipping] = useState(null);
  
  // --- PROMOTION STATE ---
  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCode, setAppliedCode] = useState(null);
  const [promoMsg, setPromoMsg] = useState("");
  const [checkingCode, setCheckingCode] = useState(false);

  const isShippingValid = !!(shipping && shipping.phone && shipping.addressLine);

  // Load Cart & Shipping Info
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
      
      // Update global cart count
      const items = c?.items || c?.cartItems || [];
      const totalQty = items.reduce((sum, it) => sum + (it?.quantity ?? 0), 0);
      setCount(totalQty);

    } catch (e) {
      console.error("Failed to load data", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const m = (sp.get("method") || "").toUpperCase();
    if (m === "PAYOS") setMethod("PAYOS");
    loadData();
  }, [token]);

  const items = cart?.items || cart?.cartItems || [];

  // Tính tổng tiền
  const subtotal = useMemo(
    () => items.reduce((s, it) => s + (it?.quantity || 0) * (it?.product?.price || it?.price || 0), 0),
    [items]
  );

  // Tổng cuối cùng sau khi giảm giá
  const total = Math.max(0, subtotal - discount);

  // --- HANDLERS: Cart Actions ---

  async function changeQty(item, delta) {
    if (cartActionLoading) return;
    const next = Math.max(1, (item?.quantity || 1) + delta);
    setCartActionLoading(true);
    try {
      await updateCartItem(item.id, next);
      await loadData();
      // Reset promotion khi giỏ hàng thay đổi
      if (appliedCode) {
         setAppliedCode(null);
         setDiscount(0);
         setPromoMsg("Giỏ hàng thay đổi, vui lòng áp lại mã.");
      }
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
      if (appliedCode) {
         setAppliedCode(null);
         setDiscount(0);
         setPromoMsg("Giỏ hàng thay đổi, vui lòng áp lại mã.");
      }
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
      setDiscount(0);
      setAppliedCode(null);
      setPromoCode("");
    } catch (e) {
       alert(e?.response?.data?.message || e?.message || "Xóa giỏ hàng thất bại");
    } finally {
       setCartActionLoading(false);
    }
  }

  // --- HANDLERS: Promotion ---

  async function handleApplyCoupon() {
    if (!promoCode.trim()) return;
    setCheckingCode(true);
    setPromoMsg("");
    try {
      const payloadItems = items.map(it => ({
        productId: it.product?.id || it.productId,
        quantity: it.quantity
      }));
      
      const res = await previewPromotion(promoCode, payloadItems);
      
      if (res.discount > 0) {
        setDiscount(res.discount);
        setAppliedCode(res.code || promoCode);
        setPromoMsg(`✅ Áp dụng thành công: -${fmt(res.discount)}`);
      } else {
        setDiscount(0);
        setAppliedCode(null);
        setPromoMsg(`⚠️ ${res.message || "Mã không hợp lệ"}`);
      }
    } catch (e) {
      console.error(e);
      setDiscount(0);
      setAppliedCode(null);
      setPromoMsg("❌ Lỗi kiểm tra mã: " + (e?.response?.data?.message || e.message));
    } finally {
      setCheckingCode(false);
    }
  }

  // --- HANDLERS: Place Order ---

  async function handlePlaceOrder() {
    if (!items.length) { alert("Giỏ hàng trống."); return; }
    if (!isShippingValid) {
      alert("Vui lòng nhập thông tin giao hàng trước khi đặt.");
      nav(`/account/shipping?redirect=${encodeURIComponent("/checkout")}`);
      return;
    }

    setPlacing(true);
    try {
      // Payload chuẩn bị cho Backend
      const orderItemsPayload = items.map(it => ({
        product: { id: it.product?.id || it.productId },
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
        promoCode: appliedCode // Gửi mã giảm giá đã áp dụng
      };

      const order = await placeOrder(requestPayload);
      if (!order?.id) throw new Error("Không tạo được đơn hàng.");

      // 1. Thanh toán COD
      if (order.paymentMethod === "COD") {
        // alert(`Đặt hàng thành công! Mã đơn: ${order.id}`);
        setCount(0);
        nav(`/order-success/${order.id}`);
        return;
      }

      // 2. Thanh toán PayOS
      if (order.paymentMethod === "PAYOS") {
        const payUrl = await createPaymentLink(order.id);
        if (!payUrl) throw new Error("Không nhận được link thanh toán từ PayOS.");
        window.location.href = payUrl;
        return;
      }

      alert("Phương thức thanh toán không xác định.");

    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || e?.message || "Đặt hàng thất bại");
    } finally {
      setPlacing(false);
    }
  }

  if (loading && !cart) return <div className="container section">Đang tải trang thanh toán…</div>;

  return (
    <div className="container section fade-in">
      <h1 className="h1">Thanh toán</h1>
      <div className="grid2">
        
        {/* Cột Trái: Giỏ hàng + Mã giảm giá */}
        <div className="card card-hover">
          <div className="card-title">Giỏ hàng của bạn</div>
          
          {!items.length ? (
            <div className="muted">Giỏ hàng trống. <Link to="/">Mua hàng ngay</Link></div>
          ) : (
            <>
              <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '1rem' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}></th>
                      <th>Sản phẩm</th>
                      <th style={{ textAlign: "center" }}>SL</th>
                      <th style={{ textAlign: "right" }}>Thành tiền</th>
                      <th style={{ width: 40 }}></th>
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
                                  width: 48, height: 48, borderRadius: 8,
                                  background: `#f4f4f4 url(${p.imageUrl || "/placeholder.jpg"}) center/cover no-repeat`
                                }}
                              />
                            </Link>
                          </td>
                          <td>
                            <Link to={`/products/${p.id}`} style={{ fontWeight: 600, color: 'inherit', textDecoration: 'none' }}>
                              {p.name || it.name}
                            </Link>
                            <div className="muted" style={{fontSize: '0.8rem'}}>{fmt(price)}</div>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <button className="btn btn-sm" onClick={() => changeQty(it, -1)} disabled={cartActionLoading || it.quantity <= 1} style={{padding:'2px 8px'}}>−</button>
                              <div style={{ minWidth: 20, textAlign: "center", fontSize:'0.9rem' }}>{it.quantity}</div>
                              <button className="btn btn-sm" onClick={() => changeQty(it, +1)} disabled={cartActionLoading} style={{padding:'2px 8px'}}>+</button>
                            </div>
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 500 }}>{fmt(price * (it.quantity || 0))}</td>
                          <td style={{ textAlign: "right" }}>
                            <button 
                                className="btn btn-danger btn-sm" 
                                onClick={() => onRemove(it)} 
                                disabled={cartActionLoading}
                                style={{padding:'4px 8px'}}
                            >
                                ×
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mã giảm giá */}
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginTop: 16 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Mã khuyến mãi</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <input 
                        className="input" 
                        value={promoCode} 
                        onChange={e => setPromoCode(e.target.value.toUpperCase())} 
                        placeholder="Nhập mã giảm giá"
                        disabled={!!appliedCode}
                        style={{ flex: 1 }}
                    />
                    {appliedCode ? (
                        <button className="btn btn-danger" onClick={() => { setAppliedCode(null); setDiscount(0); setPromoCode(""); setPromoMsg(""); }}>
                            Gỡ
                        </button>
                    ) : (
                        <button className="btn btn-primary" onClick={handleApplyCoupon} disabled={checkingCode || !promoCode}>
                            {checkingCode ? "..." : "Áp dụng"}
                        </button>
                    )}
                </div>
                {promoMsg && (
                    <div style={{ fontSize: '0.85rem', marginTop: 6, color: appliedCode ? 'green' : '#dc2626' }}>
                        {promoMsg}
                    </div>
                )}
              </div>

              {/* Tổng tiền */}
              <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '1rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                 <div className="flex-row space-between">
                    <span className="muted">Tạm tính</span>
                    <span>{fmt(subtotal)}</span>
                 </div>
                 {discount > 0 && (
                    <div className="flex-row space-between" style={{color: 'var(--primary)'}}>
                        <span>Giảm giá ({appliedCode})</span>
                        <span>- {fmt(discount)}</span>
                    </div>
                 )}
                 <div className="flex-row space-between" style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: 8, color: '#0f172a' }}>
                    <span>Tổng cộng</span>
                    <span>{fmt(total)}</span>
                 </div>
              </div>

              <div style={{marginTop: 16, textAlign: 'right'}}>
                  <button className="btn btn-outline btn-sm text-red" onClick={onClear} disabled={cartActionLoading}>
                      Xoá giỏ hàng
                  </button>
              </div>
            </>
          )}
        </div>

        {/* Cột Phải: Thông tin & Thanh toán */}
        <div className="card card-hover" style={{ height: 'fit-content' }}>
          <div className="card-title">Thông tin giao hàng</div>
          
          {loading && !shipping && <div className="muted">Đang tải...</div>}
          
          {!isShippingValid && !loading && (
            <div className="muted" style={{marginBottom: 16}}>
              Bạn chưa có thông tin giao hàng.{" "}
              <Link to={`/account/shipping?redirect=${encodeURIComponent("/checkout")}`} style={{color: 'var(--primary)', fontWeight: 600}}>
                Thêm ngay
              </Link>
            </div>
          )}
          
          {isShippingValid && (
             <div style={{ marginBottom: 16, padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: '0.9rem' }}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{shipping.phone}</div>
              <div style={{ color: '#475569' }}>{shipping.addressLine}</div>
              {shipping.city && <div style={{ color: '#475569' }}>{shipping.city}</div>}
              {shipping.note && <div style={{ color: '#475569', fontStyle: 'italic', marginTop: 4 }}>" {shipping.note} "</div>}
              <div style={{ marginTop: 8, textAlign: 'right' }}>
                <Link to={`/account/shipping?redirect=${encodeURIComponent("/checkout")}`} style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none' }}>
                  Chỉnh sửa
                </Link>
              </div>
            </div>
          )}

          <hr style={{ margin: "16px 0", border: 0, borderTop: '1px solid #eee' }} />
          
          <div className="card-title">Phương thức thanh toán</div>
          <div className="vstack gap-2">
            <label className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', border: method === "COD" ? '1px solid var(--primary)' : '1px solid var(--border)', padding: 12 }}>
                <input 
                    type="radio" 
                    name="pm" 
                    value="COD" 
                    checked={method === "COD"} 
                    onChange={() => setMethod("COD")} 
                    style={{ width: 18, height: 18 }}
                />
                <div>
                    <div style={{ fontWeight: 600 }}>Thanh toán khi nhận hàng (COD)</div>
                    <div className="muted" style={{ fontSize: '0.8rem' }}>Trả tiền mặt cho shipper</div>
                </div>
            </label>

            <label className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', border: method === "PAYOS" ? '1px solid var(--primary)' : '1px solid var(--border)', padding: 12 }}>
                <input 
                    type="radio" 
                    name="pm" 
                    value="PAYOS" 
                    checked={method === "PAYOS"} 
                    onChange={() => setMethod("PAYOS")} 
                    style={{ width: 18, height: 18 }}
                />
                <div>
                    <div style={{ fontWeight: 600 }}>Thanh toán Online (PayOS)</div>
                    <div className="muted" style={{ fontSize: '0.8rem' }}>Quét mã QR qua App ngân hàng</div>
                </div>
            </label>
          </div>

          <div style={{ marginTop: 24 }}>
            <button
              className="btn btn-primary w-full"
              style={{ fontSize: '1.1rem', padding: '14px' }}
              disabled={!items.length || placing || !isShippingValid || cartActionLoading || loading}
              onClick={handlePlaceOrder}
            >
              {placing ? "Đang xử lý..." : `Đặt hàng • ${fmt(total)}`}
            </button>
            
            {!isShippingValid && items.length > 0 && (
                <div style={{ textAlign: 'center', marginTop: 8, fontSize: '0.8rem', color: '#dc2626' }}>
                    * Vui lòng nhập địa chỉ giao hàng
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}