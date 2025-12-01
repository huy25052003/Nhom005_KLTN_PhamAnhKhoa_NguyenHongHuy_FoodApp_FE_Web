import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getCart, updateCartItem, removeCartItem, clearCart } from "../../api/cart.js";
import { placeOrder } from "../../api/orders.js";
import { createPaymentLink } from "../../api/payment.js";
import { getMyShipping } from "../../api/shipping.js";
import { previewPromotion } from "../../api/promotions.js"; 
import { useAuth } from "../../stores/auth.js";
import { useCart } from "../../stores/cart.js";
import toast from "react-hot-toast";

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
  const [promoStatus, setPromoStatus] = useState(""); 
  const [checkingCode, setCheckingCode] = useState(false);

  const isShippingValid = !!(shipping && shipping.phone && shipping.addressLine);

  // Load Cart & Shipping Info
  // Thêm tham số isBackground để tránh hiện loading quay vòng khi update nhỏ
  async function loadData(isBackground = false) {
    if (!isBackground) setLoading(true);
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
      console.error("Failed to load data", e);
      toast.error("Không thể tải dữ liệu giỏ hàng.");
    } finally {
      if (!isBackground) setLoading(false);
    }
  }

  useEffect(() => {
    const m = (sp.get("method") || "").toUpperCase();
    if (m === "PAYOS") setMethod("PAYOS");
    loadData();
  }, [token]);

  const items = cart?.items || cart?.cartItems || [];

  const subtotal = useMemo(
    () => items.reduce((s, it) => s + (it?.quantity || 0) * (it?.product?.price || it?.price || 0), 0),
    [items]
  );

  const total = Math.max(0, subtotal - discount);

  // --- HANDLERS: Cart Actions ---

  async function changeQty(item, delta) {
    if (cartActionLoading) return;
    
    const currentQty = item?.quantity || 1;
    const stock = item?.product?.stock || 0;
    const next = Math.max(1, currentQty + delta);

    // 1. CHECK TỒN KHO KHI TĂNG
    if (delta > 0 && next > stock) {
        toast.error(`Sản phẩm này chỉ còn ${stock} món.`);
        return;
    }

    setCartActionLoading(true);
    try {
      await updateCartItem(item.id, next);
      
      // 2. FIX GIẬT MÀN HÌNH: Gọi loadData với isBackground=true
      await loadData(true); 

      if (appliedCode) {
         setAppliedCode(null);
         setDiscount(0);
         setPromoMsg("Giỏ hàng thay đổi, vui lòng áp lại mã.");
         setPromoStatus("error");
         toast("Vui lòng áp dụng lại mã giảm giá", { icon: "ℹ️" });
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || "Lỗi cập nhật số lượng");
    } finally {
      setCartActionLoading(false);
    }
  }

  async function onRemove(item) {
    if (cartActionLoading) return;
    setCartActionLoading(true);
    try {
      await removeCartItem(item.id);
      await loadData(true); // Fix giật: load ngầm
      if (appliedCode) {
         setAppliedCode(null);
         setDiscount(0);
         setPromoMsg("Giỏ hàng thay đổi, vui lòng áp lại mã.");
         setPromoStatus("error");
      }
      toast.success("Đã xóa sản phẩm");
    } catch (e) {
       toast.error("Xóa sản phẩm thất bại");
    } finally {
       setCartActionLoading(false);
    }
  }

  async function onClear() {
    if (cartActionLoading || !confirm("Xoá toàn bộ giỏ hàng?")) return;
    setCartActionLoading(true);
    try {
      await clearCart();
      await loadData(true); // Fix giật: load ngầm
      setDiscount(0);
      setAppliedCode(null);
      setPromoCode("");
      setPromoMsg("");
      toast.success("Đã xóa giỏ hàng");
    } catch (e) {
       toast.error("Xóa giỏ hàng thất bại");
    } finally {
       setCartActionLoading(false);
    }
  }

  // --- HANDLERS: Promotion ---

  async function handleApplyCoupon() {
    if (!promoCode.trim()) {
        setPromoMsg("Vui lòng nhập mã.");
        setPromoStatus("error");
        return;
    }
    setCheckingCode(true);
    setPromoMsg("");
    setPromoStatus("");

    try {
      const payloadItems = items.map(it => ({
        productId: it.product?.id || it.productId,
        quantity: it.quantity
      }));
      
      const res = await previewPromotion(promoCode, payloadItems);
      
      if (res.discount > 0) {
        setDiscount(res.discount);
        setAppliedCode(res.code || promoCode);
        setPromoMsg(`Áp dụng thành công: Giảm ${fmt(res.discount)}`);
        setPromoStatus("success");
        toast.success("Áp dụng mã giảm giá thành công!");
      } else {
        setDiscount(0);
        setAppliedCode(null);
        setPromoMsg(res.message || "Mã không hợp lệ");
        setPromoStatus("error");
        toast.error(res.message || "Mã không hợp lệ");
      }
    } catch (e) {
      setDiscount(0);
      setAppliedCode(null);
      const errorMsg = e?.response?.data?.message || "Lỗi kiểm tra mã";
      setPromoMsg(errorMsg);
      setPromoStatus("error");
    } finally {
      setCheckingCode(false);
    }
  }

  // --- HANDLERS: Place Order ---

  async function handlePlaceOrder() {
    if (!items.length) { 
        toast.error("Giỏ hàng trống. Vui lòng thêm sản phẩm."); 
        return; 
    }
    if (!isShippingValid) {
      toast.error("Vui lòng nhập địa chỉ giao hàng.");
      document.querySelector('.card-shipping')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setPlacing(true);
    const loadingToast = toast.loading("Đang xử lý đơn hàng...");

    try {
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
        promoCode: appliedCode 
      };

      const order = await placeOrder(requestPayload);
      
      toast.dismiss(loadingToast); 

      if (!order?.id) throw new Error("Lỗi tạo đơn hàng.");

      if (order.paymentMethod === "COD") {
        toast.success("Đặt hàng thành công!");
        setCount(0);
        nav(`/order-success/${order.id}`);
        return;
      }

      if (order.paymentMethod === "PAYOS") {
        const payUrl = await createPaymentLink(order.id);
        if (!payUrl) throw new Error("Lỗi kết nối cổng thanh toán.");
        window.location.href = payUrl;
        return;
      }

    } catch (e) {
      toast.dismiss(loadingToast);
      const msg = e?.response?.data?.message || e?.message || "Đặt hàng thất bại";
      toast.error(msg);
    } finally {
      setPlacing(false);
    }
  }

  if (loading && !cart) return <div className="container section"><div className="loading"></div> Đang tải...</div>;

  return (
    <div className="container section fade-in">
      <h1 className="h1">Thanh toán</h1>
      <div className="grid2">
        
        {/* Cột Trái: Giỏ hàng + Mã giảm giá */}
        <div className="card card-hover">
          <div className="card-title">Giỏ hàng ({items.length} món)</div>
          
          {!items.length ? (
            <div className="muted" style={{padding: '20px 0', textAlign: 'center'}}>
                Giỏ hàng trống. <Link to="/" style={{color: 'var(--primary)', fontWeight: 600}}>Mua hàng ngay</Link>
            </div>
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
                            <Link to={`/products/${p.id}`} style={{ fontWeight: 600, color: 'inherit', textDecoration: 'none', display: 'block', marginBottom: 2 }}>
                              {p.name || it.name}
                            </Link>
                            <div className="muted" style={{fontSize: '0.8rem'}}>{fmt(price)}</div>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, border: '1px solid #eee', borderRadius: 6 }}>
                              <button className="btn btn-sm" onClick={() => changeQty(it, -1)} disabled={cartActionLoading || it.quantity <= 1} style={{padding:'2px 8px', border: 'none'}}>−</button>
                              <div style={{ minWidth: 20, textAlign: "center", fontSize:'0.9rem', fontWeight: 600 }}>{it.quantity}</div>
                              <button className="btn btn-sm" onClick={() => changeQty(it, +1)} disabled={cartActionLoading} style={{padding:'2px 8px', border: 'none'}}>+</button>
                            </div>
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 600 }}>{fmt(price * (it.quantity || 0))}</td>
                          <td style={{ textAlign: "right" }}>
                            <button 
                                className="btn btn-danger btn-sm" 
                                onClick={() => onRemove(it)} 
                                disabled={cartActionLoading}
                                style={{padding:'4px 8px', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                                title="Xóa"
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
              <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, marginTop: 16, border: '1px dashed #cbd5e1' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 8 }}>🎟️ Mã khuyến mãi</label>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input 
                        className={`input ${promoStatus === 'error' ? 'border-red-500' : promoStatus === 'success' ? 'border-green-500' : ''}`}
                        value={promoCode} 
                        onChange={e => {
                            setPromoCode(e.target.value.toUpperCase());
                            if (promoMsg) { setPromoMsg(""); setPromoStatus(""); }
                        }} 
                        placeholder="Nhập mã giảm giá"
                        disabled={!!appliedCode || checkingCode}
                        style={{ flex: 1 }}
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                    />
                    {appliedCode ? (
                        <button className="btn btn-danger" onClick={() => { setAppliedCode(null); setDiscount(0); setPromoCode(""); setPromoMsg(""); setPromoStatus(""); }}>
                            Gỡ bỏ
                        </button>
                    ) : (
                        <button className="btn btn-primary" onClick={handleApplyCoupon} disabled={checkingCode || !promoCode}>
                            {checkingCode ? "..." : "Áp dụng"}
                        </button>
                    )}
                </div>
                {promoMsg && (
                    <div style={{ 
                        fontSize: '0.85rem', marginTop: 8, fontWeight: 500,
                        color: promoStatus === 'success' ? '#16a34a' : '#dc2626',
                        display: 'flex', alignItems: 'center', gap: 4
                    }}>
                        {promoStatus === 'success' ? '✅' : '⚠️'} {promoMsg}
                    </div>
                )}
              </div>

              {/* Tổng tiền */}
              <div style={{ borderTop: '2px solid #f1f5f9', paddingTop: '1.5rem', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                 <div className="flex-row space-between">
                    <span className="muted" style={{fontSize: '1rem'}}>Tạm tính</span>
                    <span style={{fontSize: '1rem', fontWeight: 500}}>{fmt(subtotal)}</span>
                 </div>
                 {discount > 0 && (
                    <div className="flex-row space-between" style={{color: '#16a34a'}}>
                        <span style={{fontSize: '1rem'}}>Giảm giá <span style={{fontWeight: 600}}>({appliedCode})</span></span>
                        <span style={{fontSize: '1rem', fontWeight: 600}}>- {fmt(discount)}</span>
                    </div>
                 )}
                 <div className="flex-row space-between" style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: 12, color: '#0f172a' }}>
                    <span>Tổng thanh toán</span>
                    <span style={{color: 'var(--primary)'}}>{fmt(total)}</span>
                 </div>
              </div>

              <div style={{marginTop: 16, textAlign: 'right'}}>
                  <button className="btn btn-ghost btn-sm text-red" onClick={onClear} disabled={cartActionLoading} style={{fontSize: '0.85rem'}}>
                      Xoá tất cả
                  </button>
              </div>
            </>
          )}
        </div>

        {/* Cột Phải: Thông tin & Thanh toán */}
        <div className="card-shipping card card-hover" style={{ height: 'fit-content' }}>
          <div className="card-title">📍 Thông tin giao hàng</div>
          
          {loading && !shipping && <div className="muted">Đang tải...</div>}
          
          {!isShippingValid && !loading && (
            <div style={{marginBottom: 16, padding: 16, background: '#fff1f2', borderRadius: 8, border: '1px solid #fecaca'}}>
              <p style={{color: '#991b1b', marginBottom: 8, fontSize: '0.9rem'}}>Bạn chưa có địa chỉ giao hàng.</p>
              <Link to={`/account/shipping?redirect=${encodeURIComponent("/checkout")}`} className="btn btn-sm btn-primary w-full">
                + Thêm địa chỉ mới
              </Link>
            </div>
          )}
          
          {isShippingValid && (
             <div style={{ marginBottom: 20, padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{shipping.phone}</div>
                  <Link to={`/account/shipping?redirect=${encodeURIComponent("/checkout")}`} style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                    Sửa
                  </Link>
              </div>
              <div style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.5 }}>
                  {shipping.addressLine}, {shipping.city}
              </div>
              {shipping.note && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #cbd5e1', fontSize: '0.9rem', fontStyle: 'italic', color: '#64748b' }}>
                      📝 "{shipping.note}"
                  </div>
              )}
            </div>
          )}

          <hr style={{ margin: "20px 0", border: 0, borderTop: '1px solid #eee' }} />
          
          <div className="card-title">💳 Phương thức thanh toán</div>
          <div className="vstack gap-3">
            <label className="card" style={{ 
                display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', 
                border: method === "COD" ? '2px solid var(--primary)' : '1px solid var(--border)', 
                background: method === "COD" ? '#f0fdf4' : '#fff',
                padding: 16, transition: 'all 0.2s'
            }}>
                <input 
                    type="radio" 
                    name="pm" 
                    value="COD" 
                    checked={method === "COD"} 
                    onChange={() => setMethod("COD")} 
                    style={{ width: 20, height: 20, accentColor: 'var(--primary)' }}
                />
                <div>
                    <div style={{ fontWeight: 700 }}>Thanh toán khi nhận hàng (COD)</div>
                    <div className="muted" style={{ fontSize: '0.85rem' }}>Thanh toán tiền mặt cho shipper</div>
                </div>
            </label>

            <label className="card" style={{ 
                display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', 
                border: method === "PAYOS" ? '2px solid var(--primary)' : '1px solid var(--border)', 
                background: method === "PAYOS" ? '#f0fdf4' : '#fff',
                padding: 16, transition: 'all 0.2s'
            }}>
                <input 
                    type="radio" 
                    name="pm" 
                    value="PAYOS" 
                    checked={method === "PAYOS"} 
                    onChange={() => setMethod("PAYOS")} 
                    style={{ width: 20, height: 20, accentColor: 'var(--primary)' }}
                />
                <div>
                    <div style={{ fontWeight: 700 }}>Thanh toán Online (PayOS)</div>
                    <div className="muted" style={{ fontSize: '0.85rem' }}>Quét mã QR ngân hàng / Ví điện tử</div>
                </div>
            </label>
          </div>

          <div style={{ marginTop: 24 }}>
            <button
              className="btn btn-primary w-full"
              style={{ fontSize: '1.1rem', padding: '16px', fontWeight: 700, boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)' }}
              disabled={!items.length || placing || !isShippingValid || cartActionLoading || loading}
              onClick={handlePlaceOrder}
            >
              {placing ? "⏳ Đang xử lý..." : `Đặt hàng • ${fmt(total)}`}
            </button>
            
            <div style={{textAlign: 'center', marginTop: 12, fontSize: '0.8rem', color: '#94a3b8'}}>
                Bằng việc đặt hàng, bạn đồng ý với <Link to="/terms">điều khoản sử dụng</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}