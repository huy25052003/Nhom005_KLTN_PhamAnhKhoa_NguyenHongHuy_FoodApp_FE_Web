import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyOrders, cancelMyOrder } from "../../api/orders.js";
import { Link } from "react-router-dom";

const fmtVND = (n) => (n ?? 0).toLocaleString("vi-VN") + " đ";
const fmtDT = (s) => { try { return new Date(s).toLocaleString("vi-VN"); } catch { return s || ""; } };
const calcTotal = (o) =>
  (o?.items || []).reduce((sum, it) => {
    const price = it?.price ?? it?.unitPrice ?? it?.product?.price ?? 0;
    return sum + price * (it?.quantity ?? 0);
  }, 0);

function OrderItemRow({ item }) {
  const product = item?.product || {};
  const price = item?.price ?? product?.price ?? 0;
  const lineTotal = price * (item?.quantity ?? 0);

  return (
    <div className="order-item-row">
      <div className="item-image">
        <Link to={`/products/${product.id}`}>
          <img
            src={product.imageUrl || "/placeholder.jpg"}
            alt={product.name || 'Sản phẩm'}
            onError={(e) => { e.currentTarget.src = "/placeholder.jpg"; }}
          />
        </Link>
      </div>
      <div className="item-details">
        <Link to={`/products/${product.id}`} className="item-name">{product.name || `Sản phẩm #${item.productId || ""}`}</Link>
        <div className="muted">x {item.quantity}</div>
      </div>
      <div className="item-price">{fmtVND(lineTotal)}</div>
    </div>
  );
}

export default function AccountOrdersPage() {
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-orders"],
    queryFn: getMyOrders,
  });

  const { mutate: doCancel, isPending } = useMutation({
    mutationFn: (id) => cancelMyOrder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-orders"] }),
    onError: (e) => alert(e?.response?.data?.error || e?.message || "Huỷ đơn thất bại"),
  });

  if (isLoading) return <div className="container section">Đang tải đơn hàng…</div>;
  if (error) return <div className="container section">Tải đơn hàng lỗi.</div>;

  const orders = Array.isArray(data) ? data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)) : [];

  return (
    <div className="vstack gap-3 fade-in">
      {!orders.length && (
        <div className="card">
          Bạn chưa có đơn nào. <Link to="/" className="btn btn-primary" style={{marginLeft: '1rem'}}>Bắt đầu mua sắm</Link>
        </div>
      )}

      {orders.map((o) => (
        <div key={o.id} className="card order-card-layout card-hover">
          <div className="order-header">
            <div className="order-info">
              <span className="order-id">Đơn hàng #{o.id}</span>
              <span className="order-date muted">{fmtDT(o.createdAt || o.createdDate || o.createdTime)}</span>
            </div>
            <div className="order-status-total">
               <span className={`badge ${o.status}`}>{o.status}</span>
               <span className="order-grand-total">{fmtVND(o.total ?? calcTotal(o))}</span>
            </div>
          </div>

          <div className="order-items-list vstack gap-1">
            {(o.items || []).map((it) => (
              <OrderItemRow key={it.id} item={it} />
            ))}
          </div>

          <div className="order-actions">
            {o.status === "PENDING" && (
              <button className="btn btn-danger" disabled={isPending} onClick={() => { if(confirm('Bạn chắc chắn muốn huỷ đơn hàng này?')) doCancel(o.id) }}>
                {isPending ? "Đang huỷ..." : "Huỷ đơn"}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}