import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { getOrderById } from "../../api/orders.js";

const fmtVND = (n) => (Number(n || 0)).toLocaleString("vi-VN") + " đ";
const fmtDate = (s) => (s ? dayjs(s).format("DD/MM/YYYY HH:mm") : "");

export default function AdminInvoice() {
  const { id } = useParams();
  const nav = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const items = order?.items || [];
  const total = useMemo(
    () =>
      items.reduce(
        (s, it) => s + Number(it?.price || 0) * Number(it?.quantity || 0),
        0
      ),
    [items]
  );

  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const data = await getOrderById(id);
        if (!stop) setOrder(data);
      } catch (e) {
        alert(e?.response?.data?.message || e?.message || "Không tải được hoá đơn");
        nav(-1);
      } finally {
        if (!stop) setLoading(false);
      }
    })();
    return () => (stop = true);
  }, [id]);

  if (loading) return <div className="container section">Đang tải hoá đơn…</div>;
  if (!order) return null;

  const createdAt = fmtDate(order.createdAt);
  const shipping = order.shipping || {}; // nếu đã thêm ShippingInfo
  const user = order.user || {};

  return (
    <div className="invoice-page">
      {/* Thanh công cụ (không in) */}
      <div className="toolbar no-print">
        <button className="btn" onClick={() => nav(-1)}>← Quay lại</button>
        <button className="btn btn-primary" onClick={() => window.print()}>🖨️ In hoá đơn</button>
      </div>

      {/* CHỈ phần dưới id="invoice-print" được in */}
      <div id="invoice-print" className="invoice card">
        {/* Header */}
        <div className="invoice-header">
          <div>
            <h1 className="invoice-title">HÓA ĐƠN BÁN HÀNG</h1>
            <div>Mã đơn: <b>#{order.id}</b></div>
            <div>Ngày tạo: {createdAt}</div>
            <div>Trạng thái: <b>{order.status}</b></div>
          </div>
          <div className="brand">
            <div className="brand-name">FOODAPP</div>
            <div className="muted">Hotline: 0900 000 000</div>
            <div className="muted">Email: support@foodapp.local</div>
          </div>
        </div>

        {/* Khách hàng + Giao hàng */}
        <div className="grid2" style={{ gap: 16, marginTop: 16 }}>
          <div className="box">
            <div className="box-title">Khách hàng</div>
            <div>Tài khoản: <b>{user?.username}</b></div>
            {user?.profile?.fullName && <div>Họ tên: {user.profile.fullName}</div>}
          </div>
          <div className="box">
            <div className="box-title">Giao hàng</div>
            <div>Người nhận: <b>{shipping.fullName || user?.profile?.fullName || "-"}</b></div>
            <div>Điện thoại: {shipping.phone || "-"}</div>
            <div>Địa chỉ: {shipping.address || "-"}</div>
            {shipping.note && <div>Ghi chú: {shipping.note}</div>}
          </div>
        </div>

        {/* Bảng hàng hoá */}
        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 48, textAlign: "center" }}>#</th>
                <th>Sản phẩm</th>
                <th style={{ textAlign: "right", width: 120 }}>Đơn giá</th>
                <th style={{ textAlign: "center", width: 80 }}>SL</th>
                <th style={{ textAlign: "right", width: 140 }}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => {
                const p = it.product || {};
                const price = Number(it.price || p.price || 0);
                const line = price * Number(it.quantity || 0);
                return (
                  <tr key={it.id || idx}>
                    <td style={{ textAlign: "center" }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name || "-"}</div>
                      {p.description && <div className="muted small">{p.description}</div>}
                    </td>
                    <td style={{ textAlign: "right" }}>{fmtVND(price)}</td>
                    <td style={{ textAlign: "center" }}>{it.quantity}</td>
                    <td style={{ textAlign: "right" }}>{fmtVND(line)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} style={{ textAlign: "right", fontWeight: 700 }}>Tổng cộng</td>
                <td style={{ textAlign: "right", fontWeight: 700 }}>{fmtVND(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Ký tên */}
        <div className="sign-row">
          <div className="sign-col">
            <div>Người bán</div>
            <div className="sign-box" />
            <div className="muted small">Ký & ghi rõ họ tên</div>
          </div>
          <div className="sign-col">
            <div>Người mua</div>
            <div className="sign-box" />
            <div className="muted small">Ký & ghi rõ họ tên</div>
          </div>
        </div>
      </div>

      <style>{`
        .invoice-page { max-width: 900px; margin: 16px auto; padding: 0 12px; }
        .toolbar { display:flex; gap:8px; margin-bottom:12px; }
        .invoice.card { background:#fff; border:1px solid #eee; border-radius:12px; padding:20px; }
        .invoice-header { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; }
        .invoice-title { margin:0 0 4px; }
        .brand-name { font-weight:800; font-size:20px; }
        .box { border:1px dashed #ddd; border-radius:8px; padding:12px; }
        .box-title { font-weight:700; margin-bottom:8px; }
        .table { width:100%; border-collapse:collapse; }
        .table th, .table td { padding:10px; border-bottom:1px solid #eee; }
        .sign-row { display:flex; gap:24px; margin-top:28px; }
        .sign-col { flex:1; text-align:center; }
        .sign-box { margin:40px auto 8px; height:64px; border-bottom:1px dotted #aaa; width:80%; }

        /* ẨN MỌI THỨ KHI IN TRỪ #invoice-print */
        @media print {
          html, body { background:#fff; }
          /* Ẩn tất cả */
          body * { visibility: hidden !important; }
          /* Chỉ hiện vùng hoá đơn */
          #invoice-print, #invoice-print * { visibility: visible !important; }
          /* Đặt hoá đơn thành toàn trang */
          #invoice-print {
            position: absolute;
            inset: 0;
            width: auto;
            margin: 0;
            border: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
          }
          /* Ẩn thanh tool */
          .no-print { display: none !important; }
        }

        /* Tuỳ chọn: lề trang in */
        @page {
          margin: 12mm;
        }
      `}</style>
    </div>
  );
}
