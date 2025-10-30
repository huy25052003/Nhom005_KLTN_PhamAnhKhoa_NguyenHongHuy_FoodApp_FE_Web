import React, { useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getKitchenOrders, updateOrderStatus } from "../../api/orders.js";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { useAuth } from "../../stores/auth.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
const WS_URL_BASE = API_BASE_URL.replace("/api", ""); 
const WS_URL = `${WS_URL_BASE}/ws`;

const notificationAudio = new Audio('/notification.mp3');

const fmtTime = (s) => { 
  try { 
    const date = new Date(s);
    return date.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' });
  } catch { return s || ""; } 
};

const KITCHEN_ACTIONS = {
  CONFIRMED: { next: "PREPARING", label: "Bắt đầu chuẩn bị" },
  PREPARING: { next: "DELIVERING", label: "Hoàn tất (Giao hàng)" },
};

function KitchenOrderCard({ order, onUpdateStatus, isPending }) {
  const action = KITCHEN_ACTIONS[order.status];
  
  return (
    <div 
      id={`order-${order.id}`} 
      key={order.id} 
      className={`card order-card-kitchen card-hover ${order.status === 'CONFIRMED' ? 'status-confirmed' : 'status-preparing'}`}
      style={{scrollMarginTop: '80px'}} 
    >
      <div className="order-header">
        <span className="order-id">#{order.id}</span>
        <span className="order-date muted">{fmtTime(order.createdAt)}</span>
        <span className={`badge ${order.status}`}>{order.status}</span>
      </div>

      <div className="order-items-list-kitchen">
        {(order.items || []).map(item => (
          <div key={item.id} className="kitchen-item">
            <span className="item-qty">{item.quantity} x</span>
            <span className="item-name">{item.product?.name || "Sản phẩm"}</span>
          </div>
        ))}
      </div>
      
      {action && (
        <div className="order-actions">
          <button 
            className={`btn w-full ${order.status === 'CONFIRMED' ? 'btn-primary' : 'btn'}`}
            disabled={isPending}
            onClick={() => onUpdateStatus(order.id, action.next, action.label)}
          >
            {isPending ? "Đang cập nhật..." : action.label}
          </button>
        </div>
      )}
    </div>
  );
}

export default function KitchenDashboard() {
  const qc = useQueryClient();
  const stompRef = useRef(null);
  const { token } = useAuth(); 

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["kitchenOrders"],
    queryFn: getKitchenOrders,
    refetchOnWindowFocus: true,
  });

  const { mutate: updateStatus, isPending } = useMutation({
    mutationFn: ({ id, status }) => updateOrderStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kitchenOrders"] });
    },
    onError: (e) => alert(e?.response?.data?.message || e?.message || "Cập nhật thất bại"),
  });

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
    });

    client.onConnect = () => {
      client.subscribe("/topic/kitchen/new-order", (frame) => {
        try {
          notificationAudio.play().catch(e => console.warn("Audio play failed:", e));
          const newOrder = JSON.parse(frame.body);
          qc.setQueryData(["kitchenOrders"], (oldData = []) => {
            if (oldData.some(o => o.id === newOrder.id)) return oldData;
            return [...oldData, newOrder];
          });
        } catch(e) { console.error("WS message parse error:", e); }
      });
    };
    
    client.activate();
    stompRef.current = client;
    return () => { client.deactivate(); };
  }, [qc, token]);

  const [confirmedOrders, preparingOrders] = useMemo(() => {
    const confirmed = [];
    const preparing = [];
    (orders || []).forEach(order => {
      if (order.status === 'CONFIRMED') {
        confirmed.push(order);
      } else if (order.status === 'PREPARING') {
        preparing.push(order);
      }
    });
    const sortFn = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);
    return [confirmed.sort(sortFn), preparing.sort(sortFn)];
  }, [orders]);

  const handleUpdateStatus = (id, status, label) => {
    if (confirm(`Bạn muốn "${label}" cho đơn #${id}?`)) {
      updateStatus({ id, status });
    }
  };

  return (
    <div className="page-kitchen">
      
      {isLoading && (
          <div className="card" style={{padding: 32, textAlign: 'center'}}>
              <div className="loading">Đang tải danh sách đơn...</div>
          </div>
      )}
      
      {!isLoading && orders.length === 0 && (
        <div className="card muted" style={{ textAlign: 'center', padding: '2rem' }}>
          Không có đơn hàng nào cần chuẩn bị.
        </div>
      )}

      <div className="kitchen-columns">
        <section className="kitchen-column">
          <h2 className="column-title">
            Chờ chuẩn bị ({confirmedOrders.length})
          </h2>
          <div className="kitchen-grid">
            {confirmedOrders.map(order => (
              <KitchenOrderCard 
                key={order.id} 
                order={order} 
                onUpdateStatus={handleUpdateStatus}
                isPending={isPending}
              />
            ))}
          </div>
        </section>
        
        <section className="kitchen-column">
          <h2 className="column-title">
            Đang chuẩn bị ({preparingOrders.length})
          </h2>
          <div className="kitchen-grid">
            {preparingOrders.map(order => (
              <KitchenOrderCard 
                key={order.id} 
                order={order} 
                onUpdateStatus={handleUpdateStatus}
                isPending={isPending}
              />
            ))}
          </div>
        </section>
      </div>
      
      <style>{`
        .kitchen-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }
        .kitchen-column {
          background: var(--bg-alt);
          border-radius: var(--radius);
          padding: 1rem;
          height: calc(100vh - 150px);
          overflow-y: auto;
        }
        .column-title {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0 0 1rem 0;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: -1rem;
          background: var(--bg-alt);
          z-index: 10;
        }
        .kitchen-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        .order-card-kitchen {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          border-width: 1px;
          box-shadow: var(--shadow);
        }
        .order-card-kitchen.status-confirmed {
            border-color: var(--primary);
            background: #f0fdf4;
        }
        .order-card-kitchen.status-preparing {
            border-color: #c7d2fe;
            background: #eef2ff;
        }
        .order-card-kitchen .order-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--border);
          margin-bottom: 0.75rem;
        }
        .order-card-kitchen .order-id { font-weight: 700; font-size: 1.15rem; }
        .order-items-list-kitchen { flex-grow: 1; }
        .kitchen-item {
          display: flex;
          gap: 0.75rem;
          padding: 0.5rem 0.25rem;
          font-size: 1.05rem;
          border-bottom: 1px dashed #ccc;
        }
        .kitchen-item:last-child { border-bottom: none; }
        .kitchen-item .item-qty { 
          font-weight: 800; 
          font-size: 1.1rem;
          color: var(--primary-600);
          min-width: 40px;
          text-align: right;
        }
        .kitchen-item .item-name { font-weight: 600; color: var(--text); }
        .order-actions { margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border); }
        @media (max-width: 900px) {
          .kitchen-columns { grid-template-columns: 1fr; }
          .kitchen-column { height: auto; max-height: 60vh; }
        }
      `}</style>
    </div>
  );
}