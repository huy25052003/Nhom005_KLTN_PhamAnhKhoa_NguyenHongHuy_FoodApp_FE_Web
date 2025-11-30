import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getKitchenOrders } from "../../api/orders.js";
import http from "../../lib/http"; 
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { useAuth } from "../../stores/auth.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
const WS_URL = API_BASE_URL.replace("/api", "") + "/ws";
// Fix: Tạo Audio object ngoài component để tránh lỗi autoplay policy nếu có thể
const notificationAudio = typeof Audio !== "undefined" ? new Audio('/notification.mp3') : null;

export default function KitchenDashboard() {
  const qc = useQueryClient();
  const { token, username } = useAuth(); 
  
  // State lọc theo món (Focus Mode)
  const [filterProductId, setFilterProductId] = useState(null);

  // 1. Lấy dữ liệu Đơn hàng
  const { data: orders = [] } = useQuery({
    queryKey: ["kitchenOrders"],
    queryFn: getKitchenOrders,
    refetchInterval: 10000, 
  });

  // 2. API gọi khi bấm nút (Nhận / Xong)
  const { mutate: updateItem } = useMutation({
    mutationFn: ({ itemId, status }) => 
      http.put(`/kitchen/items/${itemId}/status`, null, { params: { status } }),
    onError: (e) => alert(e?.response?.data?.message || "Lỗi cập nhật"),
  });

  // 3. Tính toán REAL-TIME
  const { aggregated, displayOrders } = useMemo(() => {
    const aggMap = {};
    const activeOrders = [];

    // Chỉ quan tâm đơn CHƯA XONG HẾT và chưa bị Hủy
    const relevantOrders = orders.filter(o => ['CONFIRMED', 'PREPARING'].includes(o.status));

    relevantOrders.forEach(order => {
        let orderHasTargetItem = false;
        let hasActiveItems = false; // Check xem đơn còn món nào chưa xong không

        order.items.forEach(item => {
            if (item.status === 'DONE') return; 
            hasActiveItems = true;

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

        // Chỉ hiển thị đơn nếu còn món chưa xong và thỏa mãn bộ lọc
        if (hasActiveItems && (!filterProductId || orderHasTargetItem)) {
            activeOrders.push(order);
        }
    });

    return { 
        aggregated: Object.values(aggMap), 
        displayOrders: activeOrders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) 
    };
  }, [orders, filterProductId]);

  // 4. SOCKET LISTENER
  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
      onConnect: () => {
        client.subscribe("/topic/kitchen/new-order", () => {
           notificationAudio?.play().catch(()=>{});
           qc.invalidateQueries(["kitchenOrders"]); 
        });
        client.subscribe("/topic/kitchen/update", () => {
           qc.invalidateQueries(["kitchenOrders"]); 
        });
      },
    });
    client.activate();
    return () => client.deactivate();
  }, [token, qc]);

  return (
    <div className="fade-in">
      
      {/* --- KHU VỰC 1: BẢNG TỔNG HỢP (AGGREGATED) --- */}
      <div className="kds-header-card">
        <div className="flex-row space-between align-center">
            <h3 className="h3" style={{margin:0, color: 'var(--secondary)'}}>🔥 Tổng hợp món cần làm</h3>
            {filterProductId && (
                <button className="btn btn-danger btn-sm" onClick={() => setFilterProductId(null)}>
                    ✕ Bỏ lọc
                </button>
            )}
        </div>
        
        <div className="agg-list">
            {aggregated.length === 0 ? <div className="muted" style={{padding: '10px 0'}}>Hiện tại không có món nào cần làm.</div> :
             aggregated.map(agg => {
                const isActive = String(filterProductId) === String(agg.id);
                return (
                <button 
                    key={agg.id}
                    className={`agg-chip ${isActive ? 'active' : ''}`}
                    onClick={() => setFilterProductId(isActive ? null : agg.id)}
                >
                    <div className="vstack" style={{flex: 1, alignItems: 'flex-start'}}>
                        <span className="agg-name">{agg.name}</span>
                        {agg.cooking > 0 && <span className="agg-sub">Đang nấu: {agg.cooking}</span>}
                    </div>
                    <span className="agg-count">{agg.total}</span>
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
                    <div className="ticket-time">
                      {new Date(order.createdAt).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                      {' • '} 
                      {order.user?.username || 'Khách'}
                    </div>
                </div>
                <div className="status-dot" title={order.status}></div>
            </div>

            <div className="ticket-body">
                {order.items.map(item => {
                    if (item.status === 'DONE') return null; // Ẩn món xong

                    const isTarget = String(item.product?.id) === String(filterProductId);
                    const isMine = item.chef?.username === username;
                    // const isTaken = item.status === 'COOKING' && item.chef;

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
                                        <span className="locker" title={`Đang nấu bởi ${item.chef?.username}`}>
                                          🔒 {item.chef?.username}
                                        </span>
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
    </div>
  );
}