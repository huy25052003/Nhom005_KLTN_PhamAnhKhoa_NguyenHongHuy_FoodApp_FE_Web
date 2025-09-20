import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllProducts } from "../../api/products";
import { getOrders, updateOrderStatus } from "../../api/orders";
import { useAuth } from "../../stores/auth";

const STATUS_COLORS = {
  PENDING: "badge pending",
  PREPARING: "badge preparing",
  DELIVERING: "badge delivering",
  DONE: "badge done",
  CANCELLED: "badge cancelled",
};

const formatVND = (n) => (n ?? 0).toLocaleString("vi-VN") + " đ";

export default function Dashboard() {
  const { logout } = useAuth();
  const qc = useQueryClient();

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ["products", "all"],
    queryFn: getAllProducts,
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
  const totalProducts = Array.isArray(products) ? products.length : 0;

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

      <div className="form-grid" style={{ marginBottom: 12 }}>
        <div className="card">
          <div className="muted">Sản phẩm</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>
            {loadingProducts ? "…" : totalProducts}
          </div>
        </div>
        <div className="card">
          <div className="muted">Tổng đơn hàng</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>
            {loadingOrders ? "…" : totalOrders}
          </div>
        </div>
        <div className="card">
          <div className="muted">Doanh thu (5 đơn gần đây)</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>
            {loadingOrders ? "…" : formatVND(recentRevenue)}
          </div>
        </div>
        <div className="card">
          <div className="muted">Tài khoản</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={logout}>Đăng xuất</button>
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
                <td>{o.id}</td>
                <td>{o.user?.username || o.customerName || "-"}</td>
                <td>{new Date(o.createdAt ?? o.created_date ?? Date.now()).toLocaleString("vi-VN")}</td>
                <td><span className={STATUS_COLORS[o.status] || "badge"}>{o.status}</span></td>
                <td>{formatVND(o.total ?? o.amount ?? o.totalPrice ?? 0)}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="btn" disabled={savingStatus} onClick={() => mutateStatus({ id: o.id, status: "PREPARING" })}>Chuẩn bị</button>{" "}
                  <button className="btn" disabled={savingStatus} onClick={() => mutateStatus({ id: o.id, status: "DELIVERING" })}>Giao</button>{" "}
                  <button className="btn" disabled={savingStatus} onClick={() => mutateStatus({ id: o.id, status: "DONE" })}>Hoàn tất</button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6}><div style={{ padding: 16 }} className="muted">Chưa có đơn hàng</div></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
