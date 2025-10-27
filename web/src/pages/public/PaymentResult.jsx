import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { getOrderById } from "../../api/orders.js";
import { clearCart, getCart } from "../../api/cart.js";
import { useCart } from "../../stores/cart.js";

const OK_ORDER_STATUSES = ["PAID", "CONFIRMED", "PREPARING", "DELIVERING", "DONE"];
const BAD_ORDER_STATUSES = ["CANCELLED", "CANCELED", "FAILED"];

export default function PaymentResultPage() {
  const [sp] = useSearchParams();
  const { setCount } = useCart();
  const nav = useNavigate();

  const [state, setState] = useState({
    loading: true,
    msg: "Đang kiểm tra thanh toán…",
    orderId: null,
    status: null,
    hintOk: false,
    error: null,
  });

  const timer = useRef(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;
    const orderId = sp.get("orderId") || sp.get("orderCode") || sp.get("o");
    const code = (sp.get("code") || "").toUpperCase();
    const qStatus = (sp.get("status") || "").toUpperCase();
    const canceled = (sp.get("cancel") || sp.get("canceled")) === "1" || sp.get("cancel") === "true";

    if (!orderId) {
      setState({ loading: false, msg: "Không xác định được đơn hàng.", orderId: null, status: null, hintOk: false, error: null });
      return;
    }

    if (canceled) {
      setState({ loading: false, msg: "Bạn đã huỷ thanh toán.", orderId, status: "CANCELED", hintOk: false, error: null });
      return;
    }

    const queryLooksOk = code === "00" || qStatus === "PAID" || qStatus === "SUCCESS";

    setState(prev => ({
      ...prev,
      loading: true,
      msg: queryLooksOk ? "Thanh toán thành công. Đang xác nhận đơn hàng…" : "Đang kiểm tra trạng thái đơn hàng…",
      orderId,
      status: queryLooksOk ? "PAID" : null,
      hintOk: queryLooksOk,
      error: null,
    }));

    let tries = 0;
    const MAX_TRIES = 20;
    const POLL_INTERVAL = 2000;

    async function poll() {
      if (stoppedRef.current) return;
      tries++;

      try {
        const order = await getOrderById(orderId);
        const currentBEStatus = (order?.status || "").toUpperCase();

        if (stoppedRef.current) return;

        if (OK_ORDER_STATUSES.includes(currentBEStatus)) {
          setState({ loading: false, msg: "Đặt hàng và thanh toán thành công!", orderId, status: currentBEStatus, hintOk: true, error: null });
          try {
            await clearCart();
            setCount(0);
          } catch (cartError) {
            console.warn("Lỗi khi xóa giỏ hàng:", cartError);
          }
          setTimeout(() => nav(`/order-success/${orderId}`, { replace: true }), 1000);
          return;
        }

        if (BAD_ORDER_STATUSES.includes(currentBEStatus)) {
          setState({ loading: false, msg: "Thanh toán không thành công hoặc đơn hàng đã bị huỷ.", orderId, status: currentBEStatus, hintOk: false, error: null });
          return;
        }

        if (tries >= MAX_TRIES) {
          setState({ loading: false, msg: "Đang chờ xác nhận thanh toán. Vui lòng kiểm tra 'Đơn hàng của tôi' sau.", orderId, status: currentBEStatus || "PENDING", hintOk: queryLooksOk, error: null });
          return;
        }

        timer.current = setTimeout(poll, POLL_INTERVAL);

      } catch (e) {
         if (stoppedRef.current) return;
        console.error("Lỗi polling trạng thái đơn hàng:", e);
        if (tries >= 5) {
          setState({
            loading: false,
            msg: "Không thể kiểm tra trạng thái đơn hàng lúc này. Vui lòng kiểm tra lại sau.",
            orderId,
            status: null,
            hintOk: queryLooksOk,
            error: e?.message || "Lỗi không xác định",
          });
          return;
        }
        timer.current = setTimeout(poll, POLL_INTERVAL * 2);
      }
    }

    poll();

    return () => {
      stoppedRef.current = true;
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [sp, nav, setCount]);

  const finalOk = OK_ORDER_STATUSES.includes((state.status || "").toUpperCase()) || (state.status === null && state.hintOk && !state.error);

  if (state.loading) {
    return (
      <div className="container section">
        <h1 className="h1">{state.hintOk ? "✅ Đã thanh toán — Đang xác nhận đơn hàng" : "⏳ Đang kiểm tra trạng thái"}</h1>
        <p>{state.msg}</p>
        {state.orderId && <p>Mã đơn: <b>#{state.orderId}</b></p>}
      </div>
    );
  }

  return (
    <div className="container section">
      <h1 className="h1">{finalOk ? "✅ Thanh toán thành công" : "⚠️ Có lỗi xảy ra"}</h1>
      <p>{state.msg}</p>
      {state.orderId && <p>Mã đơn: <b>#{state.orderId}</b></p>}
      {state.error && <p style={{ color: 'red' }}>Chi tiết lỗi: {state.error}</p>}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Link className="btn btn-primary" to="/account/orders">Xem đơn hàng của tôi</Link>
        <Link className="btn btn-ghost" to="/">Về trang chủ</Link>
      </div>
    </div>
  );
}