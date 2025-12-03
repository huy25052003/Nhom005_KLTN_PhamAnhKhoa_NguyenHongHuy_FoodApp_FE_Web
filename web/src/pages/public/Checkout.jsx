import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { getCart, updateCartItem, removeCartItem } from "../../api/cart.js";
import { placeOrder } from "../../api/orders.js";
import { createPaymentLink } from "../../api/payment.js";
import { getMyShipping } from "../../api/shipping.js";
import { previewPromotion } from "../../api/promotions.js"; 
import { useAuth } from "../../stores/auth.js";
import { useCart } from "../../stores/cart.js";

// Components UI Mới (Đã tạo ở các bước trước)
import ConfirmModal from "../../component/ConfirmModal.jsx";
import LazyImage from "../../component/LazyImage.jsx";
import { FaTrash, FaShoppingCart, FaArrowRight, FaStore } from "react-icons/fa";

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
  
  // Promotion State
  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCode, setAppliedCode] = useState(null);
  const [promoMsg, setPromoMsg] = useState(""); 
  const [promoStatus, setPromoStatus] = useState("");
  const [checkingCode, setCheckingCode] = useState(false);

  // Modal State
  const [confirmState, setConfirmState] = useState({ isOpen: false, data: null });

  const isShippingValid = !!(shipping && shipping.phone && shipping.addressLine);

  async function loadData(isBackground = false) {
    if (!isBackground) setLoading(true);
    try {
      if (!token) {
        nav(`/admin/login?redirect=${encodeURIComponent("/checkout")}`);
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
      if(!isBackground) toast.error("Không thể tải dữ liệu giỏ hàng.");
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

  // --- Action Handlers ---

  async function changeQty(item, delta) {
    if (cartActionLoading) return;
    const currentQty = item?.quantity || 1;
    const stock = item?.product?.stock || 0;
    const next = Math.max(1, currentQty + delta);

    if (delta > 0 && next > stock) {
        toast.error(`Sản phẩm này chỉ còn ${stock} món.`);
        return;
    }

    setCartActionLoading(true);
    try {
      await updateCartItem(item.id, next);
      await loadData(true); 
      if (appliedCode) {
         setAppliedCode(null); setDiscount(0);
         setPromoMsg("Giỏ hàng thay đổi, vui lòng áp lại mã.");
         setPromoStatus("error");
      }
    } catch (e) {
      toast.error("Lỗi cập nhật số lượng");
    } finally {
      setCartActionLoading(false);
    }
  }

  // Mở Modal xóa
  function onRemoveClick(item) {
    if (cartActionLoading) return;
    setConfirmState({ isOpen: true, data: item });
  }

  // Xử lý xóa thật
  async function handleConfirmRemove() {
    const item = confirmState.data;
    setConfirmState({ isOpen: false, data: null });

    setCartActionLoading(true);
    try {
      await removeCartItem(item.id);
      toast.success("Đã xóa sản phẩm");
      await loadData(true);
      if (appliedCode) { setAppliedCode(null); setDiscount(0); setPromoMsg(""); }
    } catch {
       toast.error("Xóa sản phẩm thất bại");
    } finally {
       setCartActionLoading(false);
    }
  }

  async function handleApplyCoupon() {
    if (!promoCode.trim()) return toast.error("Vui lòng nhập mã giảm giá");
    setCheckingCode(true); setPromoMsg(""); setPromoStatus("");

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
        toast.success(`Đã giảm ${fmt(res.discount)}`);
      } else {
        setDiscount(0); setAppliedCode(null);
        setPromoMsg(res.message || "Mã không hợp lệ");
        setPromoStatus("error");
      }
    } catch (e) {
      setDiscount(0); setAppliedCode(null);
      setPromoMsg(e?.response?.data?.message || "Lỗi kiểm tra mã");
      setPromoStatus("error");
    } finally {
      setCheckingCode(false);
    }
  }

  async function handlePlaceOrder() {
    if (!items.length) return toast.error("Giỏ hàng trống."); 
    if (!isShippingValid) {
      toast.error("Vui lòng nhập địa chỉ giao hàng.");
      document.querySelector('.card-shipping')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setPlacing(true);
    const loadId = toast.loading("Đang tạo đơn hàng...");

    try {
      const orderItemsPayload = items.map(it => ({
        product: { id: it.product?.id || it.productId },
        quantity: it.quantity
      }));

      const requestPayload = {
        items: orderItemsPayload,
        shippingInfo: {
             phone: shipping.phone,
             addressLine: shipping.addressLine,
             city: shipping.city || "",
             note: shipping.note || ""
        },
        paymentMethod: method,
        promoCode: appliedCode 
      };

      const order = await placeOrder(requestPayload);
      toast.dismiss(loadId);

      if (!order?.id) throw new Error("Lỗi hệ thống");

      if (order.paymentMethod === "COD") {
        toast.success("Đặt hàng thành công!");
        setCount(0);
        setTimeout(() => nav(`/order-success/${order.id}`), 1000);
      } else {
        toast.loading("Chuyển sang thanh toán...", { duration: 3000 });
        const payUrl = await createPaymentLink(order.id);
        if (!payUrl) throw new Error("Lỗi cổng thanh toán");
        window.location.href = payUrl;
      }
    } catch (e) {
      toast.dismiss(loadId);
      toast.error(e?.response?.data?.message || e?.message || "Đặt hàng thất bại");
    } finally {
      setPlacing(false);
    }
  }

  if (loading && !cart) return <div className="container section text-center"><div className="loading"></div></div>;

  // === MAIN CHECKOUT UI ===
  return (
    <div className="container section fade-in">
      <h1 className="h1 mb-4">Thanh toán</h1>
      <div className="grid2">
        
        {/* Cột Trái: Danh sách món */}
        <div className="card card-hover" style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
          <div className="card-title">Đơn hàng ({items.length} món)</div>
          
          {/* START: Logic hiển thị danh sách HOẶC empty state TRONG card */}
          {items.length === 0 ? (
             <div className="flex-1 flex-col align-center justify-center py-10 text-center">
                <div style={{ fontSize: '3rem', color: '#e2e8f0', marginBottom: '1rem' }}>
                    <FaShoppingCart />
                </div>
                <p className="muted mb-4">Giỏ hàng của bạn đang trống.</p>
                <Link to="/menu" className="btn btn-primary btn-sm">
                    <FaStore /> Dạo thực đơn ngay
                </Link>
             </div>
          ) : (
            <div style={{ maxHeight: '500px', overflowY: 'auto', marginBottom: '1rem' }}>
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
                            <LazyImage src={p.imageUrl} alt={p.name} className="product-img" style={{width: 48, height: 48, borderRadius: 8}} />
                            </Link>
                        </td>
                        <td>
                            <Link to={`/products/${p.id}`} style={{ fontWeight: 600, color: 'inherit', textDecoration: 'none', display: 'block', marginBottom: 2 }}>
                            {p.name || it.name}
                            </Link>
                            <div className="muted" style={{fontSize: '0.8rem'}}>{fmt(price)}</div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                            <div className="qty-box">
                            <button onClick={() => changeQty(it, -1)} disabled={cartActionLoading || it.quantity <= 1}>−</button>
                            <input className="qty-input" value={it.quantity} readOnly />
                            <button onClick={() => changeQty(it, +1)} disabled={cartActionLoading}>+</button>
                            </div>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 600 }}>{fmt(price * (it.quantity || 0))}</td>
                        <td style={{ textAlign: "right" }}>
                            <button 
                                className="btn btn-sm btn-ghost text-red" 
                                onClick={() => onRemoveClick(it)} 
                                disabled={cartActionLoading}
                                title="Xóa"
                            >
                                <FaTrash />
                            </button>
                        </td>
                        </tr>
                    );
                    })}
                </tbody>
                </table>
            </div>
          )}
          {/* END */}

          {/* Coupon - Disable nếu không có item */}
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, marginTop: 'auto', border: '1px dashed #cbd5e1', opacity: items.length ? 1 : 0.5, pointerEvents: items.length ? 'auto' : 'none' }}>
            <label className="label">🎟️ Mã khuyến mãi</label>
            <div className="flex-row gap-2">
                <input 
                    className={`input ${promoStatus === 'error' ? 'input-error' : ''}`}
                    value={promoCode} 
                    onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoMsg(""); setPromoStatus(""); }} 
                    placeholder="Nhập mã giảm giá"
                    disabled={!!appliedCode || checkingCode}
                />
                {appliedCode ? (
                    <button className="btn btn-danger" onClick={() => { setAppliedCode(null); setDiscount(0); setPromoCode(""); setPromoMsg(""); }}>Gỡ</button>
                ) : (
                    <button className="btn btn-primary" onClick={handleApplyCoupon} disabled={checkingCode || !promoCode}>Áp dụng</button>
                )}
            </div>
            {promoMsg && <div className={`mt-2 font-bold text-sm ${promoStatus==='success' ? 'text-green-600' : 'text-red'}`}>{promoMsg}</div>}
          </div>

          {/* Totals */}
          <div className="vstack gap-2 mt-4 pt-4 border-top">
             <div className="flex-row space-between">
                <span className="muted">Tạm tính</span>
                <span>{fmt(subtotal)}</span>
             </div>
             {discount > 0 && (
                <div className="flex-row space-between text-green-600">
                    <span>Giảm giá ({appliedCode})</span>
                    <span className="fw-bold">- {fmt(discount)}</span>
                </div>
             )}
             <div className="flex-row space-between" style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: 8 }}>
                <span>Tổng cộng</span>
                <span className="text-primary">{fmt(total)}</span>
             </div>
          </div>
        </div>

        {/* Cột Phải: Shipping & Payment */}
        <div className="vstack gap-3">
            <div className="card-shipping card card-hover">
              <div className="card-title">📍 Thông tin giao hàng</div>
              
              {!isShippingValid ? (
                <div className="bg-red-50 p-3 rounded border border-red-200 text-red text-center">
                  <p className="mb-2">Bạn chưa có địa chỉ giao hàng.</p>
                  <Link to={`/account?redirect=${encodeURIComponent("/checkout")}`} className="btn btn-sm btn-primary">+ Thêm địa chỉ</Link>
                </div>
              ) : (
                 <div className="bg-gray-50 p-3 rounded border border-gray-200">
                  <div className="flex-row space-between mb-2">
                      <span className="fw-bold">{shipping.phone}</span>
                      <Link to={`/account?redirect=${encodeURIComponent("/checkout")}`} className="text-primary text-sm font-bold">Sửa</Link>
                  </div>
                  <div className="text-sm text-gray-600">{shipping.addressLine}, {shipping.city}</div>
                  {shipping.note && <div className="text-sm text-gray-500 italic mt-2">Note: {shipping.note}</div>}
                </div>
              )}
            </div>

            <div className="card card-hover">
                <div className="card-title">💳 Thanh toán</div>
                <div className="vstack gap-3">
                    <label className={`card p-3 border cursor-pointer ${method==='COD'?'border-green-500 bg-green-50':''}`} onClick={()=>setMethod('COD')}>
                        <div className="flex-row gap-3">
                            <input type="radio" name="pm" checked={method==='COD'} readOnly className="accent-green-600 w-5 h-5" />
                            <div>
                                <div className="fw-bold">Thanh toán khi nhận hàng (COD)</div>
                                <div className="text-sm muted">Thanh toán tiền mặt cho shipper</div>
                            </div>
                        </div>
                    </label>
                    <label className={`card p-3 border cursor-pointer ${method==='PAYOS'?'border-green-500 bg-green-50':''}`} onClick={()=>setMethod('PAYOS')}>
                        <div className="flex-row gap-3">
                            <input type="radio" name="pm" checked={method==='PAYOS'} readOnly className="accent-green-600 w-5 h-5" />
                            <div>
                                <div className="fw-bold">Thanh toán Online (PayOS)</div>
                                <div className="text-sm muted">Quét mã QR ngân hàng / Ví điện tử</div>
                            </div>
                        </div>
                    </label>
                </div>
                
                <button
                  className="btn btn-primary w-full mt-4 py-3 text-lg shadow-lg"
                  disabled={!items.length || placing || !isShippingValid || cartActionLoading || loading}
                  onClick={handlePlaceOrder}
                >
                  {placing ? "Đang xử lý..." : `Đặt hàng • ${fmt(total)}`}
                </button>
                <div className="text-center mt-2 text-sm muted">
                    Bằng việc đặt hàng, bạn đồng ý với <Link to="/terms">điều khoản sử dụng</Link>
                </div>
            </div>
        </div>
      </div>

      {/* MODAL XÁC NHẬN XÓA */}
      <ConfirmModal 
        isOpen={confirmState.isOpen}
        title="Xóa sản phẩm?"
        message={`Bạn có chắc muốn xóa "${confirmState.data?.product?.name}" khỏi đơn hàng?`}
        confirmText="Xóa ngay"
        isDanger={true}
        onConfirm={handleConfirmRemove}
        onCancel={() => setConfirmState({ isOpen: false, data: null })}
      />
    </div>
  );
}