import React, { useEffect, useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { useAuth } from "../../stores/auth.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
const WS_URL_BASE = API_BASE_URL.replace("/api", ""); 
const WS_URL = `${WS_URL_BASE}/ws`;

const audioRef = new Audio('/notification.mp3');
const fmtTime = (s) => { try { return new Date(s).toLocaleTimeString("vi-VN"); } catch { return s; } };

export default function KitchenNotifyBell() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]); 
  const [unread, setUnread] = useState(0);
  const stompRef = useRef(null);

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
    });

    client.onConnect = () => {
      client.subscribe("/topic/kitchen/new-order", (frame) => {
        try {
          const newOrder = JSON.parse(frame.body);
          const newItem = {
              id: newOrder.id,
              title: `Đơn mới #${newOrder.id}`,
              message: `Khách: ${newOrder.user?.username || 'Khách'} · ${fmtTime(newOrder.createdAt)}`,
              orderId: newOrder.id
          };
          
          audioRef.play().catch(e => console.warn("Audio play failed:", e));
          setItems((prev) => [newItem, ...prev].slice(0, 20));
          setUnread((u) => (u ?? 0) + 1);

        } catch(e) { console.error("WS message parse error:", e); }
      });
    };

    client.activate();
    stompRef.current = client;
    return () => { client.deactivate(); };
  }, [token]);

  const handleToggle = () => {
    setOpen(o => !o);
    setUnread(0);
  };

  return (
    <div className="notify-bell">
      <button className="btn" onClick={handleToggle} aria-label="Thông báo">
        🔔{unread > 0 ? <span className="badge">{unread}</span> : null}
      </button>

      {open && (
        <div className="dropdown" role="dialog" aria-label="Danh sách thông báo">
          <div className="dropdown-head">
            <div style={{ fontWeight: 700 }}>Đơn hàng mới</div>
            <button className="btn btn-ghost" onClick={() => setItems([])}>Xoá hết</button>
          </div>

          <div className="dropdown-body">
            {items.length ? items.map((n) => (
              <div key={n.id} className="notify-item">
                <div style={{ fontWeight: 600 }}>{n.title}</div>
                {n.message && <div className="muted small">{n.message}</div>}
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <a href={`#order-${n.orderId}`} className="btn btn-ghost" onClick={() => setOpen(false)}>
                    Xem đơn
                  </a>
                </div>
              </div>
            )) : (
              <div className="muted" style={{ padding: 8, textAlign: 'center' }}>Không có thông báo mới</div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .notify-bell { position: relative; }
        .badge { margin-left:6px; background:#ef4444; color:#fff; border-radius:999px; padding:0 6px; font-size:12px; }
        .dropdown { position:absolute; right:0; top:110%; width:360px; background:#fff; border:1px solid #eee; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,.08); z-index:50; }
        .dropdown-head { display:flex; justify-content:space-between; align-items:center; padding:8px 10px; border-bottom:1px solid #f1f1f1;}
        .dropdown-body { max-height:60vh; overflow:auto; }
        .notify-item { padding:10px; border-bottom:1px dashed #eee;}
        .small { font-size: 12px; }
      `}</style>
    </div>
  );
}