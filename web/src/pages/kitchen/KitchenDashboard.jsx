import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getKitchenOrders } from "../../api/orders.js";
import http from "../../lib/http"; 
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { useAuth } from "../../stores/auth.js";

// Lấy trực tiếp từ env
const WS_URL = import.meta.env.VITE_WS_URL;

export default function KitchenDashboard() {
  const qc = useQueryClient();
  const { token, username } = useAuth(); 
  const [filterProductId, setFilterProductId] = useState(null);

  // 1. Lấy dữ liệu (Polling dự phòng 10s)
  const { data: orders = [] } = useQuery({
    queryKey: ["kitchenOrders"],
    queryFn: getKitchenOrders,
    refetchInterval: 10000, 
  });

  // 2. Xử lý update món ăn
  const { mutate: updateItem } = useMutation({
    mutationFn: ({ itemId, status }) => 
      http.put(`/kitchen/items/${itemId}/status`, null, { params: { status } }),
    onError: (e) => alert(e?.response?.data?.message || "Lỗi cập nhật"),
  });

  // 3. Socket Listener
  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
      onConnect: () => {
        client.subscribe("/topic/kitchen/new-order", () => {
           qc.invalidateQueries(["kitchenOrders"]); 
        });
        
        client.subscribe("/topic/kitchen/update", () => {
           qc.invalidateQueries(["kitchenOrders"]); 
        });
      },
      debug: () => {},
    });
    client.activate();
    return () => client.deactivate();
  }, [token, qc]);

  // 4. Logic hiển thị
  const { aggregated, displayOrders } = useMemo(() => {
    const aggMap = {};
    const activeOrders = [];
    const relevantOrders = orders.filter(o => ['CONFIRMED', 'PREPARING'].includes(o.status));

    relevantOrders.forEach(order => {
        let orderHasTargetItem = false;
        let hasActiveItems = false; 

        order.items.forEach(item => {
            if (item.status === 'DONE') return; 
            hasActiveItems = true;

            const pid = item.product?.id;
            if (!aggMap[pid]) aggMap[pid] = { id: pid, name: item.product?.name, total: 0, cooking: 0 };
            
            aggMap[pid].total += item.quantity;
            if (item.status === 'COOKING') aggMap[pid].cooking += item.quantity;

            if (String(pid) === String(filterProductId)) orderHasTargetItem = true;
        });

        if (hasActiveItems && (!filterProductId || orderHasTargetItem)) {
            activeOrders.push(order);
        }
    });

    return { 
        aggregated: Object.values(aggMap), 
        displayOrders: activeOrders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) 
    };
  }, [orders, filterProductId]);

  return (
    <div className="fade-in">
      {/* Header Tổng hợp */}
      <div className="kds-header-card">
        <div className="flex-row space-between align-center">
            <h3 className="h3" style={{margin:0, color: 'var(--secondary)'}}>🔥 Tổng hợp món cần làm</h3>
            {filterProductId && (
                <button className="btn btn-danger btn-sm" onClick={() => setFilterProductId(null)}>✕ Bỏ lọc</button>
            )}
        </div>
        <div className="agg-list">
            {aggregated.length === 0 ? <div className="muted" style={{padding: '10px 0'}}>Hết đơn!</div> :
             aggregated.map(agg => (
                <button key={agg.id} className={`agg-chip ${String(filterProductId) === String(agg.id) ? 'active' : ''}`}
                    onClick={() => setFilterProductId(String(filterProductId) === String(agg.id) ? null : agg.id)}>
                    <div className="vstack" style={{flex: 1, alignItems: 'flex-start'}}>
                        <span className="agg-name">{agg.name}</span>
                        {agg.cooking > 0 && <span className="agg-sub">Đang nấu: {agg.cooking}</span>}
                    </div>
                    <span className="agg-count">{agg.total}</span>
                </button>
            ))}
        </div>
      </div>

      {/* Grid Tickets */}
      <div className="kds-tickets-grid">
        {displayOrders.map(order => (
          <div key={order.id} className={`ticket-card ${order.status}`}>
            <div className="ticket-header">
                <div>
                    <div className="ticket-id">#{order.id}</div>
                    <div className="ticket-time">
                      {new Date(order.createdAt).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})} • {order.user?.username || 'Khách'}
                    </div>
                </div>
                <div className="status-dot" title={order.status}></div>
            </div>
            <div className="ticket-body">
                {order.items.map(item => {
                    if (item.status === 'DONE') return null;
                    const isTarget = String(item.product?.id) === String(filterProductId);
                    const isMine = item.chef?.username === username;
                    return (
                        <div key={item.id} className={`ticket-item ${isTarget ? 'highlight' : ''} ${item.status}`}>
                            <div className="item-info">
                                <span className="qty">{item.quantity}</span>
                                <span className="name">{item.product?.name}</span>
                            </div>
                            <div className="item-action">
                                {item.status === 'PENDING' ? (
                                    <button className="btn-act start" onClick={() => updateItem({itemId: item.id, status: 'COOKING'})}>Nhận</button>
                                ) : (
                                    isMine ? (
                                        <button className="btn-act finish" onClick={() => updateItem({itemId: item.id, status: 'DONE'})}>Xong</button>
                                    ) : (
                                        <span className="locker" title={item.chef?.username}>🔒 {item.chef?.username}</span>
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