import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyOrders, cancelMyOrder } from "../../api/orders.js";

const fmtVND = (n) => (n ?? 0).toLocaleString("vi-VN") + " đ";
const fmtDT = (s) => { try { return new Date(s).toLocaleString("vi-VN"); } catch { return s || ""; } };
const calcTotal = (o) =>
  (o?.items || []).reduce((sum, it) => {
    const price = it?.price ?? it?.unitPrice ?? it?.product?.price ?? 0;
    return sum + price * (it?.quantity ?? 0);
  }, 0);

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

  if (isLoading) return <div>Đang tải đơn hàng…</div>;
  if (error) return <div>Tải đơn hàng lỗi.</div>;

  const orders = Array.isArray(data) ? data : [];

  return (
    <div className="vstack gap-2">
      {!orders.length && <div className="card">Bạn chưa có đơn nào.</div>}

      {orders.map((o) => (
        <div key={o.id} className="card">
          <div className="flex-row space-between">
            <div>
              <div className="muted">Mã đơn</div>
              <div className="h5">#{o.id}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="muted">Trạng thái</div>
              <div className="badge">{o.status}</div>
            </div>
          </div>

          <div className="muted" style={{ marginTop: 8 }}>
            Tạo lúc: {fmtDT(o.createdAt || o.createdDate || o.createdTime)}
          </div>

          <div className="vstack gap-1" style={{ marginTop: 12 }}>
            {(o.items || []).map((it) => (
              <div key={it.id} className="flex-row space-between">
                <div>
                  <div className="fw-600">{it.product?.name || `SP #${it.productId || ""}`}</div>
                  <div className="muted">x{it.quantity}</div>
                </div>
                <div className="fw-600">
                  {fmtVND((it.price ?? it.unitPrice ?? it.product?.price ?? 0) * (it.quantity ?? 0))}
                </div>
              </div>
            ))}
          </div>

          <div
            className="flex-row space-between"
            style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed #ddd" }}
          >
            <div className="fw-600">Tổng tiền</div>
            <div className="fw-700">{fmtVND(o.total ?? calcTotal(o))}</div>
          </div>

          <div className="flex-row gap-2" style={{ marginTop: 12 }}>
            {o.status === "PENDING" && (
              <button className="btn btn-danger" disabled={isPending} onClick={() => doCancel(o.id)}>
                {isPending ? "Đang huỷ..." : "Huỷ đơn"}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
