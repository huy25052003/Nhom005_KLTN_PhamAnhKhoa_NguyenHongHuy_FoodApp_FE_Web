import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllProducts } from "../../api/products";
import { getOrders, updateOrderStatus } from "../../api/orders";
import { useAuth } from "../../stores/auth";
import { Link } from "react-router-dom";

const STATUS_COLORS = {
  PENDING: "badge pending",
  CONFIRMED: "badge confirmed",
  PREPARING: "badge preparing",
  DELIVERING: "badge delivering",
  DONE: "badge done",
  COMPLETED: "badge done",
  CANCELED: "badge cancelled",
  CANCELLED: "badge cancelled",
};

const formatVND = (n) => (n ?? 0).toLocaleString("vi-VN") + " đ";
const formatDate = (d) => {
  if (!d) return "-";
  try { return new Date(d).toLocaleString("vi-VN"); } catch { return String(d); }
};

function nextStatuses(current) {
  switch ((current || "").toUpperCase()) {
    case "PENDING":    return ["CONFIRMED", "CANCELED"];
    case "CONFIRMED":  return ["PREPARING", "CANCELED"];
    case "PREPARING":  return ["DELIVERING"];
    case "DELIVERING": return ["DONE"];
    default:           return [];
  }
}

export default function Dashboard() {
  const { logout } = useAuth();
  const qc = useQueryClient();

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ["products", "all"],
    queryFn: getAllProducts,
  });

  const { data: firstPageProductsData } = useQuery({
    queryKey: ["products", { page: 0, size: 10 }],
    queryFn: () => getAllProducts(),
  });

  const { data: ordersData, isLoading: loadingOrders } = useQuery({
    queryKey: ["orders", { page: 0, size: 5 }],
    queryFn: () => getOrders(0, 5),
  });

  const ordersPage = ordersData && typeof ordersData === "object" && "content" in ordersData
    ? ordersData
    : { content: Array.isArray(ordersData) ? ordersData : [], totalElements: Array.isArray(ordersData) ? ordersData.length : (ordersData?.totalElements ?? 0) };

  const recentOrders = ordersPage.content ?? [];
  const totalOrders = ordersPage.totalElements ?? recentOrders.length;
  const totalProducts = Array.isArray(productsData) ? productsData.length : 0;

  const recentRevenue = recentOrders.reduce((sum, o) => {
    const t = o.total ?? o.amount ?? o.totalPrice ?? 0;
    return sum + (typeof t === "number" ? t : 0);
  }, 0);

  const { mutate: mutateStatus, isPending: savingStatus } = useMutation({
    mutationFn: ({ id, status }) => updateOrderStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e) => {
      alert(e?.response?.data?.message || e?.message || "Cập nhật trạng thái thất bại");
    },
  });

  return (
    <div className="page-dashboard">
      <h1 className="h1">Tổng quan</h1>

      <div className="grid4" style={{ marginBottom: 12 }}>
        <div className="card stat">
          <div className="muted">Tổng sản phẩm</div>
          <div className="stat-number">
            {loadingProducts ? "…" : totalProducts}
          </div>
           <Link to="/admin/products" className="muted" style={{marginTop: '8px', display:'block'}}>Xem chi tiết →</Link>
        </div>
        <div className="card stat">
          <div className="muted">Tổng đơn hàng</div>
          <div className="stat-number">
            {loadingOrders ? "…" : totalOrders}
          </div>
           <Link to="/admin/orders" className="muted" style={{marginTop: '8px', display:'block'}}>Xem chi tiết →</Link>
        </div>
        <div className="card stat">
          <div className="muted">Doanh thu (5 đơn gần nhất)</div>
          <div className="stat-number">
            {loadingOrders ? "…" : formatVND(recentRevenue)}
          </div>
           <Link to="/admin/analytics" className="muted" style={{marginTop: '8px', display:'block'}}>Xem thống kê →</Link>
        </div>
        <div className="card stat">
          <div className="muted">Tài khoản</div>
          <div style={{ display: "flex", gap: 8, marginTop: '8px' }}>
            <button className="btn btn-danger" onClick={logout}>Đăng xuất</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <div className="card-title">Đơn hàng gần đây</div>
        <table className="table">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Khách</th>
              <th>Ngày</th>
              <th>Trạng thái</th>
              <th>Tổng</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loadingOrders ? (
              <tr><td colSpan={6}><div style={{ padding: 16 }}>Đang tải...</div></td></tr>
            ) : recentOrders.length ? recentOrders.map(o => (
              <tr key={o.id}>
                <td><Link to={`/admin/orders/${o.id}/invoice`} target="_blank">#{o.id}</Link></td>
                <td>{o.user?.username || o.customerName || "-"}</td>
                <td>{formatDate(o.createdAt ?? o.created_date)}</td>
                <td><span className={STATUS_COLORS[o.status] || "badge"}>{o.status}</span></td>
                <td>{formatVND(o.total ?? o.amount ?? 0)}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                   {nextStatuses(o.status).map(ns => (
                     <button
                       key={ns}
                       className={`btn ${ns === 'CANCELED' ? 'btn-danger' : 'btn-primary'}`}
                       disabled={savingStatus}
                       onClick={() => mutateStatus({ id: o.id, status: ns })}
                       style={{ marginLeft: '6px' }}
                      >
                       {ns === 'CONFIRMED' ? 'Xác nhận' :
                        ns === 'PREPARING' ? 'Chuẩn bị' :
                        ns === 'DELIVERING' ? 'Giao hàng' :
                        ns === 'DONE' ? 'Hoàn tất' :
                        ns === 'CANCELED' ? 'Hủy đơn' : ns}
                     </button>
                   ))}
                   <Link to={`/admin/orders/${o.id}/invoice`} target="_blank" className="btn btn-ghost" style={{ marginLeft: '6px' }}>Xem/In</Link>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6}><div style={{ padding: 16 }} className="muted text-center">Chưa có đơn hàng</div></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}