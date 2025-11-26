import React, { useEffect, useRef, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getKitchenOrders } from "../../api/orders.js";
import http from "../../lib/http"; 
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { useAuth } from "../../stores/auth.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
const WS_URL = API_BASE_URL.replace("/api", "") + "/ws";
const notificationAudio = new Audio('/notification.mp3');

export default function KitchenDashboard() {
  const qc = useQueryClient();
  const { token, username } = useAuth(); // Lấy user hiện tại để biết món nào "Của mình"
  
  // State lọc theo món (Focus Mode)
  const [filterProductId, setFilterProductId] = useState(null);

  // 1. Lấy dữ liệu Đơn hàng (Polling dự phòng mỗi 10s)
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["kitchenOrders"],
    queryFn: getKitchenOrders,
    refetchInterval: 10000, 
  });

  // 2. API gọi khi bấm nút (Nhận / Xong)
  const { mutate: updateItem } = useMutation({
    mutationFn: ({ itemId, status }) => 
      http.put(`/kitchen/items/${itemId}/status`, null, { params: { status } }),
    // Không cần onSuccess invalidate ngay vì Socket sẽ làm việc đó
    onError: (e) => alert(e?.response?.data?.message || "Lỗi cập nhật"),
  });

  // 3. Tính toán REAL-TIME: Bảng Tổng Hợp & Danh sách hiển thị
  // (Chạy lại ngay lập tức mỗi khi `orders` thay đổi)
  const { aggregated, displayOrders } = useMemo(() => {
    const aggMap = {};
    const activeOrders = [];

    // Chỉ quan tâm đơn CHƯA XONG HẾT
    const relevantOrders = orders.filter(o => ['CONFIRMED', 'PREPARING'].includes(o.status));

    relevantOrders.forEach(order => {
        let orderHasTargetItem = false;

        order.items.forEach(item => {
            if (item.status === 'DONE') return; // Bỏ qua món đã xong

            // Tính tổng hợp (Aggregated)
            const pid = item.product?.id;
            if (!aggMap[pid]) aggMap[pid] = { 
                id: pid, 
                name: item.product?.name, 
                total: 0, 
                cooking: 0 
            };
            
            aggMap[pid].total += item.quantity;
            if (item.status === 'COOKING') aggMap[pid].cooking += item.quantity;

            // Kiểm tra bộ lọc
            if (String(pid) === String(filterProductId)) orderHasTargetItem = true;
        });

        // Logic lọc đơn hàng hiển thị bên dưới
        if (!filterProductId || orderHasTargetItem) {
            activeOrders.push(order);
        }
    });

    return { 
        aggregated: Object.values(aggMap), 
        displayOrders: activeOrders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) 
    };
  }, [orders, filterProductId]);

  // 4. SOCKET LISTENER (Cốt lõi Real-time)
  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
      onConnect: () => {
        // Nghe tin Đơn mới
        client.subscribe("/topic/kitchen/new-order", () => {
           notificationAudio.play().catch(()=>{});
           qc.invalidateQueries(["kitchenOrders"]); // Reload data
        });
        
        // Nghe tin Cập nhật trạng thái (từ bếp khác)
        client.subscribe("/topic/kitchen/update", () => {
           qc.invalidateQueries(["kitchenOrders"]); // Reload data ngay lập tức
        });
      },
    });
    client.activate();
    return () => client.deactivate();
  }, [token, qc]);

  return (
    <div className="page-kitchen fade-in">
      
      {/* --- KHU VỰC 1: BẢNG TỔNG HỢP (AGGREGATED) --- */}
      <div className="kds-header-card">
        <div className="flex-row space-between">
            <h2 className="h3" style={{margin:0}}>👨‍🍳 Bếp Tổng (KDS Real-time)</h2>
            {filterProductId && (
                <button className="btn btn-danger btn-small" onClick={() => setFilterProductId(null)}>
                    ✕ Bỏ lọc
                </button>
            )}
        </div>
        
        <div className="agg-list">
            {aggregated.length === 0 ? <div className="muted">Hết đơn!</div> :
             aggregated.map(agg => {
                const isActive = String(filterProductId) === String(agg.id);
                return (
                <button 
                    key={agg.id}
                    className={`agg-chip ${isActive ? 'active' : ''}`}
                    onClick={() => setFilterProductId(isActive ? null : agg.id)}
                >
                    <span className="agg-name">{agg.name}</span>
                    <div className="flex-col" style={{alignItems:'flex-end', lineHeight:1}}>
                        <span className="agg-count">{agg.total}</span>
                        {agg.cooking > 0 && <span className="agg-sub">Đang làm: {agg.cooking}</span>}
                    </div>
                </button>
            )})}
        </div>
      </div>

      {/* --- KHU VỰC 2: DANH SÁCH THẺ ĐƠN --- */}
      <div className="kds-tickets-grid">
        {displayOrders.map(order => (
          <div key={order.id} className={`ticket-card ${order.status}`}>
            
            <div className="ticket-header">
                <div>
                    <div className="ticket-id">#{order.id}</div>
                    <div className="ticket-time">{new Date(order.createdAt).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</div>
                </div>
                <div className={`status-dot ${order.status}`}></div>
            </div>

            <div className="ticket-body">
                {order.items.map(item => {
                    if (item.status === 'DONE') return null; // Ẩn món xong

                    const isTarget = String(item.product?.id) === String(filterProductId);
                    const isMine = item.chef?.username === username;
                    const isTaken = item.status === 'COOKING' && item.chef;

                    return (
                        <div key={item.id} className={`ticket-item ${isTarget ? 'highlight' : ''} ${item.status}`}>
                            <div className="item-info">
                                <span className="qty">{item.quantity}</span>
                                <span className="name">{item.product?.name}</span>
                            </div>
                            
                            {/* NÚT BẤM HÀNH ĐỘNG */}
                            <div className="item-action">
                                {item.status === 'PENDING' ? (
                                    <button className="btn-act start" onClick={() => updateItem({itemId: item.id, status: 'COOKING'})}>
                                        Nhận
                                    </button>
                                ) : (
                                    // Đang COOKING
                                    isMine ? (
                                        <button className="btn-act finish" onClick={() => updateItem({itemId: item.id, status: 'DONE'})}>
                                            Xong
                                        </button>
                                    ) : (
                                        <span className="locker">🔒 {item.chef?.username}</span>
                                    )
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .page-kitchen { padding: 16px; background: #f1f5f9; min-height: 100vh; }
        
        /* Header */
        .kds-header-card { 
            background: #fff; padding: 16px; border-radius: 12px; margin-bottom: 20px; 
            border: 2px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .agg-list { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
        .agg-chip {
            border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px 12px; border-radius: 8px;
            display: flex; align-items: center; gap: 10px; cursor: pointer; text-align:left;
        }
        .agg-chip.active { background: #22c55e; color: #fff; border-color: #16a34a; }
        .agg-chip.active .agg-count { background: rgba(255,255,255,0.2); color: #fff; }
        .agg-chip.active .agg-sub { color: #dcfce7; }

        .agg-name { font-weight: 600; font-size: 0.95rem; }
        .agg-count { font-weight: 800; font-size: 1.2rem; background: #e2e8f0; padding: 2px 8px; border-radius: 4px; color: #0f172a; }
        .agg-sub { font-size: 0.7rem; color: #ea580c; font-weight: 700; margin-top: 2px; }

        /* Grid Tickets */
        .kds-tickets-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        .ticket-card {
            background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.05);
            border-top: 5px solid #94a3b8; display: flex; flex-direction: column;
        }
        .ticket-card.PREPARING { border-top-color: #f59e0b; } /* Cam: Đang làm */
        
        .ticket-header {
            padding: 10px 12px; background: #f8fafc; border-bottom: 1px solid #eee;
            display: flex; justify-content: space-between; align-items: center;
        }
        .ticket-id { font-weight: 800; font-size: 1.1rem; color: #334155; }
        
        .ticket-item {
            padding: 10px 12px; border-bottom: 1px dashed #eee; display: flex; justify-content: space-between; align-items: center;
        }
        .ticket-item.highlight { background: #dcfce7; }
        .ticket-item.COOKING { background: #fff7ed; }
        
        .item-info { display: flex; gap: 8px; align-items: center; flex: 1; }
        .qty { font-weight: 800; font-size: 1.1rem; min-width: 24px; }
        .name { font-weight: 600; color: #0f172a; }
        
        .btn-act { border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 0.8rem; }
        .btn-act.start { background: #e2e8f0; color: #334155; }
        .btn-act.finish { background: #22c55e; color: #fff; }
        
        .locker { font-size: 0.75rem; color: #f59e0b; font-weight: 700; background: #fffbeb; padding: 4px 8px; border-radius: 4px; border: 1px solid #fcd34d; }
      `}</style>
    </div>
  );
}