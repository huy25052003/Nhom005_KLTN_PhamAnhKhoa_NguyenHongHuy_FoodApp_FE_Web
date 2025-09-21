import React, { useEffect, useMemo, useState } from "react";
import { getOrders, getOrder, updateOrderStatus } from "../../api/orders.js";

const STATUS_LIST = ["PENDING","CONFIRMED","PREPARING","SHIPPING","COMPLETED","CANCELED"];
const PAGE_SIZES = [10, 20, 50];

const formatVND = (n) => (Number(n || 0)).toLocaleString("vi-VN") + " đ";
const formatDate = (d) => {
  if (!d) return "-";
  const dt = (typeof d === "string" || typeof d === "number") ? new Date(d) : d;
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("vi-VN");
};
const calcTotal = (o) => {
  if (o?.total != null) return o.total;
  const items = o?.items || o?.orderItems || [];
  return items.reduce((s, it) => {
    const qty = it.quantity ?? it.qty ?? it.amount ?? 1;
    const price = it.price ?? it.product?.price ?? 0;
    return s + qty * price;
  }, 0);
};

function nextStatuses(current) {
  switch ((current || "").toUpperCase()) {
    case "PENDING":    return ["CONFIRMED", "CANCELED"];
    case "CONFIRMED":  return ["PREPARING", "CANCELED"];
    case "PREPARING":  return ["SHIPPING"];
    case "SHIPPING":   return ["COMPLETED"];
    default:           return [];
  }
}

export default function OrdersPage() {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("");
  const [q, setQ] = useState(""); 
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ content: [], number: 0, size: 10, totalPages: 1, totalElements: 0 });

  const [viewing, setViewing] = useState(null); 
  const [updating, setUpdating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await getOrders(page, size);
      setData(res);
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Tải danh sách đơn thất bại");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [page, size]);

  const filtered = useMemo(() => {
    let list = data.content || [];
    if (statusFilter) {
      list = list.filter(o => (o.status || "").toUpperCase() === statusFilter);
    }
    const t = q.trim().toLowerCase();
    if (t) {
      list = list.filter(o => {
        const idStr = String(o.id || "").toLowerCase();
        const username = (o.user?.username || o.customerName || o.username || "").toLowerCase();
        const phone = (o.user?.phone || o.phone || "").toLowerCase();
        return idStr.includes(t) || username.includes(t) || phone.includes(t);
      });
    }
    return list;
  }, [data.content, statusFilter, q]);

  async function openDetail(order) {
    try {
      const full = await getOrder(order.id);
      setViewing(full);
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Không tải được chi tiết đơn");
    }
  }

  async function doUpdateStatus(orderId, status) {
    setUpdating(true);
    try {
      await updateOrderStatus(orderId, status);
      await load();
      if (viewing?.id === orderId) {
        const full = await getOrder(orderId);
        setViewing(full);
      }
      alert("Cập nhật trạng thái thành công");
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Cập nhật trạng thái thất bại");
    } finally {
      setUpdating(false);
    }
  }

  const totalFiltered = filtered.length;
  const sumPageTotal = filtered.reduce((s, o) => s + calcTotal(o), 0);

  return (
    <div className="page-orders">
      <h1 className="h1">Quản lý Đơn hàng</h1>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
        <input className="input" placeholder="Tìm (mã đơn / tên / SĐT)"
               value={q} onChange={(e)=>{ setQ(e.target.value); }} />
        <select className="select" value={statusFilter} onChange={(e)=> setStatusFilter(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="select" value={size} onChange={(e)=> { setSize(Number(e.target.value)); setPage(0); }}>
          {PAGE_SIZES.map(s => <option key={s} value={s}>{s}/trang</option>)}
        </select>
        <button className="btn" onClick={load}>↻ Làm mới</button>
        <span className="muted" style={{ marginLeft:"auto" }}>
          Trang {data.number+1}/{Math.max(1, data.totalPages)} • Hiển thị: {filtered.length}/{data.content?.length||0} • Tổng trang này: {formatVND(sumPageTotal)}
        </span>
      </div>

      <div className="card" style={{ overflow:"hidden", marginTop:12 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Khách</th>
              <th>SĐT</th>
              <th>Thời gian</th>
              <th>Tổng tiền</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><div style={{ padding:16 }}>Đang tải…</div></td></tr>
            ) : filtered.length ? filtered.map(o => (
              <tr key={o.id}>
                <td>#{o.id}</td>
                <td>{o.user?.username || o.customerName || o.username || "-"}</td>
                <td>{o.user?.phone || o.phone || "-"}</td>
                <td>{formatDate(o.createdAt || o.createdDate || o.createdTime)}</td>
                <td>{formatVND(calcTotal(o))}</td>
                <td>
                  <span className="badge">{(o.status || "PENDING").toUpperCase()}</span>
                </td>
                <td style={{ whiteSpace:"nowrap" }}>
                  <button className="btn" onClick={()=> openDetail(o)} style={{ marginRight:8 }}>Xem</button>
                  {nextStatuses(o.status).length > 0 && (
                    <div style={{ display:"inline-flex", gap:6 }}>
                      {nextStatuses(o.status).map(ns => (
                        <button key={ns} className="btn btn-primary"
                                disabled={updating}
                                onClick={()=> doUpdateStatus(o.id, ns)}>
                          {ns}
                        </button>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={7}><div className="muted" style={{ padding:16, textAlign:"center" }}>Không có dữ liệu</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination" style={{ marginTop:8 }}>
        <button className="btn" disabled={page<=0} onClick={()=> setPage(p=>p-1)}>← Trước</button>
        <span>Trang {page+1}/{Math.max(1, data.totalPages)}</span>
        <button className="btn" disabled={page>=Math.max(1, data.totalPages)-1} onClick={()=> setPage(p=>p+1)}>Sau →</button>
        <span className="muted" style={{ marginLeft:"auto" }}>Tổng đơn: {data.totalElements ?? "-"}</span>
      </div>

      {viewing && (
        <div className="modal-backdrop" onClick={(e)=>{ if(e.target===e.currentTarget) setViewing(null); }}>
          <div className="modal">
            <div className="card-title">Đơn #{viewing.id}</div>
            <div className="muted" style={{ marginBottom:8 }}>
              Khách: {viewing.user?.username || viewing.customerName || "-"} • SĐT: {viewing.user?.phone || viewing.phone || "-"} •
              Thời gian: {formatDate(viewing.createdAt || viewing.createdDate || viewing.createdTime)}
            </div>

            <div className="card" style={{ overflow:"hidden" }}>
              <table className="table">
                <thead>
                  <tr><th>Sản phẩm</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr>
                </thead>
                <tbody>
                  {(viewing.items || viewing.orderItems || []).map((it, idx) => {
                    const name = it.product?.name || it.name || `#${idx+1}`;
                    const qty  = it.quantity ?? it.qty ?? it.amount ?? 1;
                    const price = it.price ?? it.product?.price ?? 0;
                    return (
                      <tr key={idx}>
                        <td>{name}</td>
                        <td>{qty}</td>
                        <td>{formatVND(price)}</td>
                        <td>{formatVND(price * qty)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} style={{ textAlign:"right" }}><b>Tổng:</b></td>
                    <td><b>{formatVND(calcTotal(viewing))}</b></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div style={{ display:"flex", gap:8, marginTop:12 }}>
              <span>Trạng thái hiện tại:</span>
              <span className="badge">{(viewing.status || "PENDING").toUpperCase()}</span>
              <div style={{ marginLeft:"auto" }}>
                {nextStatuses(viewing.status).map(ns => (
                  <button key={ns} className="btn btn-primary" disabled={updating}
                          onClick={()=> doUpdateStatus(viewing.id, ns)} style={{ marginLeft:6 }}>
                    Chuyển → {ns}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn" onClick={()=> setViewing(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
