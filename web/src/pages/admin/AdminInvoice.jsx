import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { getOrderById } from "../../api/orders.js";

const fmtVND = (n) => (Number(n || 0)).toLocaleString("vi-VN") + " đ";
const fmtDate = (s) => (s ? dayjs(s).format("DD/MM/YYYY") : "");
const fmtTime = (s) => (s ? dayjs(s).format("HH:mm") : "");

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
  }, [id, nav]);

  if (loading) return <div className="container section">Đang tải hoá đơn…</div>;
  if (!order) return null;

  const orderDateTime = order.createdAt ? dayjs(order.createdAt) : null;
  const shipping = order.shipping || {};
  const user = order.user || {};

  return (
    <div className="invoice-page">
      <div className="toolbar no-print">
        <button className="btn" onClick={() => nav(-1)}>← Quay lại</button>
        <button className="btn btn-primary" onClick={() => window.print()}>🖨️ In hoá đơn</button>
      </div>

      <div id="invoice-print" className="invoice-container card">
        <div className="invoice-header-new">
          <div className="brand-name-new">FOODAPP</div>
          <div className="brand-address">Địa chỉ: TP.HCM</div>
        </div>

        <h1 className="invoice-title-new">Hóa Đơn Thanh Toán</h1>
        <div className="invoice-status">Trạng thái: <span className={`badge ${order.status}`}>{order.status}</span></div>

        <div className="invoice-details-grid">
          <div className="invoice-col-1">
            <div><strong>Số hóa đơn:</strong> #{order.id}</div>
            <div><strong>Ngày đặt:</strong> {orderDateTime ? fmtDate(orderDateTime) : "-"}</div>
            <div><strong>Giờ đặt:</strong> {orderDateTime ? fmtTime(orderDateTime) : "-"}</div>
          </div>
          <div className="invoice-col-2">
            <div><strong>Điện thoại:</strong> {shipping.phone || "-"}</div>
            <div><strong>Địa chỉ:</strong> {shipping.addressLine || shipping.address || "-"}</div>
            <div><strong>Thành phố:</strong> {shipping.city || "-"}</div>
          </div>
        </div>

        <div className="table-wrap" style={{ marginTop: '1.5rem' }}>
          <table className="table invoice-table">
            <thead>
              <tr>
                <th style={{ width: '5%' }}>STT</th>
                <th>Sản phẩm</th>
                <th style={{ width: '10%', textAlign: 'center' }}>SL</th>
                <th style={{ width: '20%', textAlign: 'right' }}>Đơn giá</th>
                <th style={{ width: '20%', textAlign: 'right' }}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => {
                const p = it.product || {};
                const price = Number(it.price || p.price || 0);
                const lineTotal = price * Number(it.quantity || 0);
                return (
                  <tr key={it.id || idx}>
                    <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                    <td>{p.name || "-"}</td>
                    <td style={{ textAlign: 'center' }}>{it.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{fmtVND(price)}</td>
                    <td style={{ textAlign: 'right' }}>{fmtVND(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="total-label">Tổng tiền cần thanh toán</td>
                <td className="total-amount">{fmtVND(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="invoice-footer">
          Cảm ơn quý khách và hẹn gặp lại!
        </div>
      </div>

      <style>{`
        .invoice-page { max-width: 800px; margin: 16px auto; padding: 0 12px; font-family: 'Arial', sans-serif; color: #333; }
        .toolbar { display:flex; gap:8px; margin-bottom:12px; }
        .invoice-container.card { background:#fff; border:1px solid #eee; border-radius: 8px; padding: 25px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
        .invoice-header-new { text-align: center; margin-bottom: 15px; }
        .brand-name-new { font-size: 1.8rem; font-weight: bold; color: var(--primary); margin-bottom: 4px; }
        .brand-address { font-size: 0.9rem; color: #555; }
        .invoice-title-new { font-size: 1.5rem; text-align: center; margin: 15px 0 5px 0; font-weight: 600; }
        .invoice-status { text-align: center; margin-bottom: 20px; font-size: 0.95rem;}
        .invoice-status .badge { font-size: 0.8rem; padding: 3px 8px; }
        .invoice-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; padding: 15px; border-top: 1px solid #eee; border-bottom: 1px solid #eee; font-size: 0.9rem; line-height: 1.6; }
        .invoice-col-1, .invoice-col-2 { }
        .invoice-details-grid div { margin-bottom: 3px; }
        .invoice-details-grid strong { color: #000; margin-right: 5px; }
        .table-wrap { width: 100%; margin-top: 1.5rem; }
        .invoice-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
        .invoice-table th, .invoice-table td { padding: 10px; border-bottom: 1px solid #eee; text-align: left; }
        .invoice-table th { background-color: #f8f8f8; font-weight: 600; color: #444; }
        .invoice-table tbody tr:last-child td { border-bottom: 1px solid #ddd; }
        .invoice-table tfoot td { border-bottom: none; font-weight: bold; padding-top: 15px; }
        .total-label { text-align: right; padding-right: 10px; color: #000; }
        .total-amount { text-align: right; font-size: 1.1rem; color: var(--primary); }
        .invoice-footer { text-align: center; margin-top: 30px; font-style: italic; color: #777; font-size: 0.9rem; }
        @media print {
          html, body { background:#fff; font-size: 10pt; }
          .invoice-page { max-width: 100%; margin: 0; padding: 0; }
          body * { visibility: hidden !important; }
          #invoice-print, #invoice-print * { visibility: visible !important; }
          #invoice-print { position: absolute; inset: 0; width: auto; margin: 0; border: none !important; box-shadow: none !important; border-radius: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .invoice-details-grid { grid-template-columns: 1fr 1fr; }
          .invoice-table th, .invoice-table td { padding: 8px; }
        }
        @page { margin: 10mm; }
      `}</style>
    </div>
  );
}