import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getOrderById } from "../../api/orders.js";
import { clearCart, getCart } from "../../api/cart.js";
import { useCart } from "../../stores/cart.js";

const OK_ORDER_STATUSES = ["PAID", "CONFIRMED", "PREPARING", "DELIVERING", "DONE"];
const BAD_ORDER_STATUSES = ["CANCELLED", "CANCELED", "FAILED"];

export default function PaymentResultPage() {
  const [sp] = useSearchParams();
  const { setCount } = useCart();

  const [state, setState] = useState({
    loading: true,
    msg: "Đang kiểm tra thanh toán…",
    orderId: null,
    status: null,
    hintOk: false, // gợi ý ok từ query (code/status)
  });

  const timer = useRef(null);

  useEffect(() => {
    const orderId = sp.get("orderId") || sp.get("orderCode") || sp.get("o");
    const code = (sp.get("code") || "").toUpperCase();         // "00" = ok
    const qStatus = (sp.get("status") || "").toUpperCase();    // PayOS có thể trả "PAID"
    const canceled = (sp.get("cancel") || sp.get("canceled")) === "1" || (sp.get("cancel") === "true");

    // Không có orderId -> không xác định
    if (!orderId) {
      setState({ loading: false, msg: "Không xác định được đơn vừa thanh toán.", orderId: null, status: null, hintOk: false });
      return;
    }

    // Nếu query nói cancel/hủy -> báo luôn
    if (canceled) {
      setState({
        loading: false,
        msg: "Bạn đã huỷ thanh toán.",
        orderId,
        status: "CANCELED",
        hintOk: false,
      });
      return;
    }

    // Gợi ý thành công ngay nếu PayOS trả code/status tốt,
    // đồng thời vẫn polling để đồng bộ trạng thái đơn từ BE.
    const queryLooksOk = code === "00" || qStatus === "PAID" || qStatus === "SUCCESS";

    setState({
      loading: true,
      msg: queryLooksOk
        ? "Thanh toán thành công. Đang xác nhận đơn hàng…"
        : "Đang kiểm tra thanh toán…",
      orderId,
      status: queryLooksOk ? "PAID" : null,
      hintOk: queryLooksOk,
    });

    let stopped = false;
    let tries = 0;

    async function poll() {
      if (stopped) return;
      tries++;

      try {
        const order = await getOrderById(orderId);
        const st = (order?.status || "").toUpperCase();

        // Nếu BE đã đổi sang các trạng thái OK -> clear giỏ, kết thúc
        if (OK_ORDER_STATUSES.includes(st)) {
          try {
            await clearCart();
            const c = await getCart();
            const items = c?.items || c?.cartItems || [];
            setCount(items.reduce((s, it) => s + (it?.quantity || 0), 0));
          } catch { /* ignore */ }

          setState({
            loading: false,
            msg: "Thanh toán thành công!",
            orderId,
            status: st,
            hintOk: true,
          });
          return;
        }

        // Nếu BE trả trạng thái xấu -> báo lỗi
        if (BAD_ORDER_STATUSES.includes(st)) {
          setState({
            loading: false,
            msg: "Thanh toán không thành công hoặc đã huỷ.",
            orderId,
            status: st,
            hintOk: false,
          });
          return;
        }

        // Vẫn PENDING: tiếp tục chờ thêm
        if (tries >= 40) {
          setState({
            loading: false,
            msg: "Đang chờ xác nhận thanh toán. Vui lòng xem lại 'Đơn của tôi' sau ít phút.",
            orderId,
            status: st || "PENDING",
            hintOk: state.hintOk || queryLooksOk,
          });
          return;
        }

        timer.current = setTimeout(poll, 1500);
      } catch (e) {
        // Gặp lỗi tạm thời -> thử lại vài lần
        if (tries >= 8) {
          setState({
            loading: false,
            msg: e?.response?.data?.message || e?.message || "Không kiểm tra được trạng thái đơn.",
            orderId,
            status: null,
            hintOk: state.hintOk || queryLooksOk,
          });
          return;
        }
        timer.current = setTimeout(poll, 1500);
      }
    }

    poll();
    return () => { stopped = true; if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ok =
    state.hintOk || OK_ORDER_STATUSES.includes((state.status || "").toUpperCase());

  if (state.loading) {
    return (
      <div className="container section">
        <h1 className="h1">{state.hintOk ? "✅ Đã thanh toán — đang xác nhận" : "⏳ Đang kiểm tra thanh toán"}</h1>
        <p>{state.msg}</p>
        {state.orderId && <p>Mã đơn: <b>{state.orderId}</b></p>}
      </div>
    );
  }

  return (
    <div className="container section">
      <h1 className="h1">{ok ? "✅ Thanh toán thành công" : "❌ Thanh toán chưa thành công"}</h1>
      <p>{state.msg}</p>
      {state.orderId && <p>Mã đơn: <b>{state.orderId}</b></p>}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Link className="btn" to="/orders/my">Xem đơn của tôi</Link>
        <Link className="btn btn-ghost" to="/">Về trang chủ</Link>
      </div>
    </div>
  );
}
