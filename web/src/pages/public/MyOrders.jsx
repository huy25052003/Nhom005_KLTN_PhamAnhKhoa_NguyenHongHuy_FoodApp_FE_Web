import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyOrders, cancelMyOrder } from "../../api/orders.js";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import ConfirmModal from "../../component/ConfirmModal.jsx";

const fmtVND = (n) => (n ?? 0).toLocaleString("vi-VN") + " đ";
const fmtDT = (s) => {
  try {
    return new Date(s).toLocaleString("vi-VN", {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return s || ""; }
};

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
        <Link to={`/products/${product.id}`} className="item-name">
          {product.name || `Sản phẩm #${item.productId || ""}`}
        </Link>
        <div className="muted">x {item.quantity}</div>
      </div>
      <div className="item-price">{fmtVND(lineTotal)}</div>
    </div>
  );
}

const TABS = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'PENDING', label: 'Chờ xác nhận' },
  { id: 'CONFIRMED', label: 'Đang xử lý' }, // Gộp CONFIRMED + PREPARING
  { id: 'DELIVERING', label: 'Đang giao' },
  { id: 'DONE', label: 'Hoàn thành' },
  { id: 'CANCELLED', label: 'Đã huỷ' },
];

export default function AccountOrdersPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('ALL');
  const [cancelId, setCancelId] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-orders"],
    queryFn: getMyOrders,
  });

  const { mutate: doCancel, isPending } = useMutation({
    mutationFn: (id) => cancelMyOrder(id),
    onSuccess: () => {
      toast.success("Đã huỷ đơn hàng");
      qc.invalidateQueries({ queryKey: ["my-orders"] });
      setCancelId(null);
    },
    onError: (e) => {
      toast.error(e?.response?.data?.message || "Huỷ đơn thất bại");
      setCancelId(null);
    },
  });

  const orders = useMemo(() => {
    if (!Array.isArray(data)) return [];
    let list = [...data].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    
    if (activeTab !== 'ALL') {
      list = list.filter(o => {
        const s = (o.status || "").toUpperCase();
        if (activeTab === 'CONFIRMED') return s === 'CONFIRMED' || s === 'PREPARING';
        return s === activeTab;
      });
    }
    return list;
  }, [data, activeTab]);

  if (isLoading) return <div className="container section"><div className="loading"></div> Đang tải...</div>;
  if (error) return <div className="container section">Lỗi tải dữ liệu.</div>;

  return (
    <div className="container section fade-in">
      <h1 className="h1 mb-4">Lịch sử đơn hàng</h1>

      {/* TABS */}
      <div className="account-tabs" style={{ overflowX: 'auto', paddingBottom: 4 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`btn btn-sm ${activeTab === tab.id ? 'active' : 'btn-outline'}`}
            onClick={() => setActiveTab(tab.id)}
            style={{ whiteSpace: 'nowrap' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="vstack gap-3 mt-3">
        {!orders.length ? (
          <div className="card text-center py-5">
            <div className="muted mb-3">Chưa có đơn hàng nào ở mục này.</div>
            <Link to="/menu" className="btn btn-primary">Đặt món ngay</Link>
          </div>
        ) : (
          orders.map((o) => (
            <div key={o.id} className="card order-card-layout card-hover">
              <div className="order-header">
                <div className="order-info">
                  <span className="order-id">Đơn hàng #{o.id}</span>
                  <span className="order-date muted">{fmtDT(o.createdAt)}</span>
                </div>
                <div className="order-status-total">
                   <span className={`badge ${o.status}`}>{o.status}</span>
                   <span className="order-grand-total">{fmtVND(o.total ?? calcTotal(o))}</span>
                </div>
              </div>

              <div className="order-items-list vstack gap-1">
                {(o.items || []).map((it) => <OrderItemRow key={it.id} item={it} />)}
              </div>

              <div className="order-actions">
                {/* 1. Nút Mua Lại (Luôn hiện để tiện đặt lại) */}
                <Link to={`/products/${o.items?.[0]?.product?.id || ''}`} className="btn btn-ghost btn-sm">
                  Mua lại
                </Link>

                {/* 2. Nút Đánh Giá (Chỉ hiện khi DONE) */}
                {o.status === "DONE" && (
                   <Link to={`/products/${o.items?.[0]?.product?.id || ''}`} className="btn btn-outline btn-sm">
                     Đánh giá
                   </Link>
                )}

                {/* 3. Nút Huỷ Đơn (Chỉ hiện khi PENDING) */}
                {o.status === "PENDING" && (
                  <button className="btn btn-danger btn-sm" disabled={isPending} onClick={() => setCancelId(o.id)}>
                    Huỷ đơn
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={!!cancelId}
        title="Huỷ đơn hàng?"
        message="Hành động này không thể hoàn tác."
        confirmText={isPending ? "Đang huỷ..." : "Đồng ý huỷ"}
        isDanger={true}
        onConfirm={() => doCancel(cancelId)}
        onCancel={() => setCancelId(null)}
      />
    </div>
  );
}