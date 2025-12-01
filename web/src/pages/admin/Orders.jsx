import React, { useEffect, useMemo, useState } from "react";
import { getOrders, getOrder, updateOrderStatus } from "../../api/orders.js";
import { Link } from 'react-router-dom';
import toast from "react-hot-toast";

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
      toast.error(e?.response?.data?.message || e?.message || "Tải danh sách đơn thất bại");
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
      toast.error(e?.response?.data?.message || e?.message || "Không tải được chi tiết đơn");
    }
  }

  async function doUpdateStatus(orderId, status) {
    setUpdating(true);
    const tId = toast.loading("Đang cập nhật...");
    try {
      await updateOrderStatus(orderId, status);
      await load();
      if (viewing?.id === orderId) {
        const full = await getOrder(orderId);
        setViewing(full);
      }
      toast.success("Cập nhật trạng thái thành công", { id: tId });
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Cập nhật thất bại", { id: tId });
    } finally {
      setUpdating(false);
    }
  }

  const sumPageTotal = filtered.reduce((s, o) => s + calcTotal(o), 0);

  return (
    <div className="page-orders">
      <h1 className="h1">Quản lý Đơn hàng</h1>

      <div className="card" style={{ marginBottom: 12, padding: 12 }}>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          <input className="input" placeholder="Tìm (mã đơn / tên / SĐT)"
                 value={q} onChange={(e)=>{ setQ(e.target.value); }} style={{ flex: 1, minWidth: 200 }} />
          <select className="select" value={statusFilter} onChange={(e)=> setStatusFilter(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn btn-ghost" onClick={load}>↻</button>
        </div>
      </div>

      {/* --- DESKTOP TABLE VIEW --- */}
      <div className="card desktop-only" style={{ overflow:"hidden", padding: 0 }}>
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
                <td>{o.user?.username || o.customerName || "-"}</td>
                <td>{o.user?.phone || o.phone || "-"}</td>
                <td>{formatDate(o.createdAt)}</td>
                <td>{formatVND(calcTotal(o))}</td>
                <td><span className={`badge ${o.status}`}>{o.status}</span></td>
                <td style={{ whiteSpace:"nowrap" }}>
                  <button className="btn btn-sm btn-ghost" onClick={()=> openDetail(o)}>Xem</button>
                  {nextStatuses(o.status).map(ns => (
                    <button key={ns} className="btn btn-sm btn-primary" style={{marginLeft: 4}}
                            disabled={updating} onClick={()=> doUpdateStatus(o.id, ns)}>
                      {ns === 'CONFIRMED' ? 'Duyệt' : ns}
                    </button>
                  ))}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={7}><div className="muted" style={{ padding:16, textAlign:"center" }}>Không có dữ liệu</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- MOBILE CARD VIEW --- */}
      <div className="mobile-only vstack gap-3">
        {loading ? <div className="muted text-center">Đang tải...</div> : 
         filtered.length === 0 ? <div className="muted text-center">Không có đơn hàng nào</div> :
         filtered.map(o => (
          <div key={o.id} className="order-card-mobile">
            <div className="row">
              <span className="label">Mã đơn:</span>
              <span className="val">#{o.id}</span>
            </div>
            <div className="row">
              <span className="label">Ngày đặt:</span>
              <span className="val">{formatDate(o.createdAt)}</span>
            </div>
            <div className="row">
              <span className="label">Khách hàng:</span>
              <span className="val">{o.user?.username || "Khách"}</span>
            </div>
            <div className="row">
              <span className="label">Tổng tiền:</span>
              <span className="val" style={{color: 'var(--primary)'}}>{formatVND(calcTotal(o))}</span>
            </div>
            <div className="row">
              <span className="label">Trạng thái:</span>
              <span className={`badge ${o.status}`}>{o.status}</span>
            </div>
            <div className="actions">
              <button className="btn btn-sm btn-ghost" onClick={()=> openDetail(o)}>Chi tiết</button>
              {nextStatuses(o.status).map(ns => (
                <button key={ns} className="btn btn-sm btn-primary"
                        disabled={updating} onClick={()=> doUpdateStatus(o.id, ns)}>
                  {ns === 'CONFIRMED' ? 'Duyệt đơn' : ns}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="pagination" style={{ marginTop:16, justifyContent: 'center' }}>
        <button className="btn" disabled={page<=0} onClick={()=> setPage(p=>p-1)}>← Trước</button>
        <span>Trang {page+1}/{Math.max(1, data.totalPages)}</span>
        <button className="btn" disabled={page>=Math.max(1, data.totalPages)-1} onClick={()=> setPage(p=>p+1)}>Sau →</button>
      </div>

      {viewing && (
        <div className="modal-backdrop" onClick={(e)=>{ if(e.target===e.currentTarget) setViewing(null); }}>
          <div className="modal">
            <div className="card-title">Chi tiết đơn #{viewing.id}</div>
            
            <div className="vstack gap-2" style={{marginBottom: 16, fontSize: '0.9rem'}}>
               <div className="flex-row space-between">
                 <span className="muted">Người đặt:</span>
                 <b>{viewing.user?.username}</b>
               </div>
               <div className="flex-row space-between">
                 <span className="muted">SĐT:</span>
                 <b>{viewing.shipping?.phone || viewing.user?.phone}</b>
               </div>
               <div className="flex-row space-between">
                 <span className="muted">Địa chỉ:</span>
                 <b style={{textAlign:'right', maxWidth: '60%'}}>{viewing.shipping?.addressLine}</b>
               </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              <table className="table">
                <thead>
                  <tr><th>Món</th><th className="text-center">SL</th><th className="text-right">Tiền</th></tr>
                </thead>
                <tbody>
                  {(viewing.items || []).map((it, idx) => (
                    <tr key={idx}>
                      <td>{it.product?.name}</td>
                      <td className="text-center">{it.quantity}</td>
                      <td className="text-right">{formatVND(it.price * it.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-actions" style={{borderTop: '1px solid #eee', paddingTop: 12}}>
              <Link className="btn btn-sm btn-ghost" to={`/admin/orders/${viewing.id}/invoice`} target="_blank">In Hoá Đơn</Link>
              <button className="btn btn-primary" onClick={()=> setViewing(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}