import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getKitchenOrders } from "../../api/orders.js";
import http from "../../lib/http"; 
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { useAuth } from "../../stores/auth.js";
import { FaPlay, FaCheck, FaUtensils, FaClock } from "react-icons/fa";

const WS_URL = import.meta.env.VITE_WS_URL;

export default function KitchenDashboard() {
  const qc = useQueryClient();
  const { token, username } = useAuth(); 
  const [filterProductId, setFilterProductId] = useState(null);

  // 1. Fetch dữ liệu
  const { data: orders = [] } = useQuery({
    queryKey: ["kitchenOrders"],
    queryFn: getKitchenOrders,
    refetchInterval: 5000, 
  });

  // 2. Mutation
  const { mutate: updateItem } = useMutation({
    mutationFn: ({ itemId, status }) => 
      http.put(`/kitchen/items/${itemId}/status`, null, { params: { status } }),
    onError: (e) => alert(e?.response?.data?.message || "Lỗi cập nhật"),
  });

  const { mutate: claimOrder, isPending: claiming } = useMutation({
    mutationFn: (orderId) => http.post(`/kitchen/orders/${orderId}/claim`),
    onSuccess: () => qc.invalidateQueries(["kitchenOrders"]),
    onError: (e) => alert(e?.response?.data?.message || "Lỗi nhận đơn"),
  });

  // 3. Socket
  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
      onConnect: () => {
        client.subscribe("/topic/kitchen/new-order", () => qc.invalidateQueries(["kitchenOrders"]));
        client.subscribe("/topic/kitchen/update", () => qc.invalidateQueries(["kitchenOrders"]));
      },
    });
    client.activate();
    return () => client.deactivate();
  }, [token, qc]);

  // 4. Logic hiển thị
  const { aggregated, displayOrders } = useMemo(() => {
    const aggMap = {};
    
    // --- SỬA ĐỔI QUAN TRỌNG: BỎ PENDING ---
    // Chỉ lấy CONFIRMED (để nhận) và PREPARING (đang làm)
    const relevantOrders = orders.filter(o => ['CONFIRMED', 'PREPARING'].includes(o.status));
    
    // Sắp xếp: Cũ nhất lên đầu
    const sortedOrders = relevantOrders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    sortedOrders.forEach(order => {
        order.items.forEach(item => {
            if (item.status === 'DONE') return; 
            
            // Chỉ tính tổng vào header khi món ĐANG NẤU (COOKING) - tức là đã nhận đơn
            if (item.status === 'COOKING') {
                const pid = item.product?.id;
                if (!aggMap[pid]) aggMap[pid] = { id: pid, name: item.product?.name, total: 0 };
                aggMap[pid].total += item.quantity;
            }
        });
    });

    const finalOrders = filterProductId 
        ? sortedOrders.filter(o => o.items.some(i => String(i.product?.id) === String(filterProductId) && i.status === 'COOKING'))
        : sortedOrders;

    return { aggregated: Object.values(aggMap), displayOrders: finalOrders };
  }, [orders, filterProductId]);

  return (
    <div className="fade-in">
      {/* Header Tổng hợp */}
      <div className="kds-header-card">
        <div className="flex-row space-between align-center">
            <h3 className="h3" style={{margin:0, color: 'var(--secondary)', display:'flex', alignItems:'center', gap:8}}>
                <FaUtensils /> Đang thực hiện
            </h3>
            {filterProductId && (
                <button className="btn btn-danger btn-sm" onClick={() => setFilterProductId(null)}>✕ Hiện tất cả</button>
            )}
        </div>
        <div className="agg-list">
            {aggregated.length === 0 ? 
                <div className="muted" style={{padding: '10px 0', fontStyle:'italic'}}>Chưa có món đang nấu.</div> :
                aggregated.map(agg => (
                <button key={agg.id} className={`agg-chip ${String(filterProductId) === String(agg.id) ? 'active' : ''}`}
                    onClick={() => setFilterProductId(String(filterProductId) === String(agg.id) ? null : agg.id)}>
                    <span className="agg-name">{agg.name}</span>
                    <span className="agg-count">{agg.total}</span>
                </button>
            ))}
        </div>
      </div>

      <div className="kds-tickets-grid">
        {displayOrders.length === 0 ? (
            <div className="muted text-center w-full" style={{gridColumn: '1/-1', padding: 40}}>
                Hiện không có đơn hàng cần xử lý.
            </div>
        ) : (
            displayOrders.map(order => {
                // Điều kiện hiện nút nhận: Đơn có món chưa nhận (PENDING)
                // Vì đã lọc bỏ đơn PENDING ở trên, nên ở đây chủ yếu check cho đơn CONFIRMED
                const canClaim = order.items.some(i => i.status === 'PENDING');
                
                return (
                  <div key={order.id} className={`ticket-card ${order.status}`}>
                    
                    {/* --- HEADER TICKET --- */}
                    <div className="ticket-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        
                        <div style={{ flex: 1 }}>
                            <div className="ticket-id" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                #{order.id}
                                
                                {/* --- NÚT NHẬN ĐƠN (BÊN PHẢI ID) --- */}
                                {canClaim && (
                                    <button 
                                        className="btn btn-primary btn-sm" 
                                        style={{
                                            padding: '4px 10px', fontSize: '0.75rem', 
                                            background: '#2563eb', border: 'none', 
                                            borderRadius: '20px', 
                                            boxShadow: '0 2px 5px rgba(37, 99, 235, 0.3)',
                                            animation: 'pulse 2s infinite',
                                            whiteSpace: 'nowrap',
                                            display: 'flex', alignItems: 'center', gap: 4
                                        }}
                                        onClick={() => claimOrder(order.id)}
                                        disabled={claiming}
                                    >
                                        <FaPlay size={10}/> Nhận đơn
                                    </button>
                                )}
                            </div>
                            
                            <div className="ticket-time flex-row align-center gap-1" style={{ marginTop: 4 }}>
                               <FaClock size={11} className="muted"/> 
                               <span className="muted small">
                                 {new Date(order.createdAt).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                               </span>
                            </div>
                        </div>

                        {/* Dot trạng thái: CONFIRMED(Xanh), PREPARING(Vàng) */}
                        <div className="status-dot" title={order.status}
                             style={{
                                 background: order.status === 'CONFIRMED' ? '#3b82f6' : '#f59e0b',
                                 flexShrink: 0
                             }}></div>
                    </div>
                    
                    {/* --- BODY TICKET --- */}
                    <div className="ticket-body">
                        {order.items.map(item => {
                            if (item.status === 'DONE') return null;
                            const isMine = item.chef?.username === username;
                            // Kiểm tra item pending để hiển thị khác biệt
                            const isPending = item.status === 'PENDING';
                            
                            return (
                                <div key={item.id} className={`ticket-item ${isPending ? 'pending-item' : ''} ${item.status}`}>
                                    <div className="item-info">
                                        <span className="qty" style={{color: isPending?'#9ca3af':'var(--primary)'}}>{item.quantity}</span>
                                        <span className="name" style={{color: isPending?'#64748b':'var(--text)'}}>{item.product?.name}</span>
                                    </div>
                                    <div className="item-action">
                                        {isPending ? (
                                            <span className="muted small" style={{fontSize:'0.75rem', background:'#f1f5f9', padding:'2px 6px', borderRadius:4}}>
                                                Chờ nhận
                                            </span>
                                        ) : (
                                            isMine ? (
                                                <button className="btn-act finish" onClick={() => updateItem({itemId: item.id, status: 'DONE'})}>
                                                    <FaCheck/> Xong
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
                );
            })
        )}
      </div>
      <style>{`
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
        .ticket-card.CONFIRMED { border-top-color: #3b82f6; }
        .ticket-card.PREPARING { border-top-color: #f59e0b; }
        .ticket-item.pending-item { background: #fafafa; opacity: 0.8; }
      `}</style>
    </div>
  );
}