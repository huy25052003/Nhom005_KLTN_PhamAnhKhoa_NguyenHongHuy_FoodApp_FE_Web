import React, { useEffect, useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { listNotifications, unreadCount, markRead, markReadAll } from "../../api/notifications.js";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";
const WS_URL = (import.meta.env.VITE_WS_URL || `${API_BASE}/ws`).replace(/\/+$/, "");

const fmtVND = (n) => (Number(n || 0)).toLocaleString("vi-VN") + " đ";

function normalizeItem(raw) {
  if (raw && (raw.title || raw.message)) {
    return {
      id: raw.id ?? `tmp-${Date.now()}`,
      title: raw.title ?? "Thông báo",
      message: raw.message ?? "",
      readFlag: !!raw.readFlag,
      orderId: raw.orderId ?? raw.referenceId ?? null,
      createdAt: raw.createdAt ?? new Date().toISOString(),
    };
  }
  if (raw && (raw.orderId || raw.status || raw.username || raw.total)) {
    return {
      id: `tmp-${Date.now()}`,
      title: `🆕 Đơn hàng mới #${raw.orderId ?? ""}`,
      message: [
        raw.username ? `Khách: ${raw.username}` : null,
        raw.total != null ? `Tổng: ${fmtVND(raw.total)}` : null,
        raw.status ? `Trạng thái: ${raw.status}` : null,
      ].filter(Boolean).join(" · "),
      readFlag: false,
      orderId: raw.orderId ?? null,
      createdAt: raw.createdAt ?? new Date().toISOString(),
    };
  }
  return {
    id: `tmp-${Date.now()}`,
    title: "Thông báo",
    message: typeof raw === "string" ? raw : "Có cập nhật mới.",
    readFlag: false,
    orderId: null,
    createdAt: new Date().toISOString(),
  };
}

export default function AdminNotifyBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const stompRef = useRef(null);

  const audioRef = useMemo(() => {
      if (typeof Audio !== "undefined") {
         return new Audio('/notification.mp3');
      }
      return null;
  }, []);

  async function load() {
    try {
      const [lst, count] = await Promise.all([
        listNotifications().catch(() => []),
        unreadCount().catch(() => 0),
      ]);
      setItems(Array.isArray(lst) ? lst.map(normalizeItem) : []);
      setUnread(Number(count || 0));
    } catch {}
  }

  useEffect(() => {
    load();

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 3000,
      debug: () => {},
    });

    client.onConnect = () => {
      client.subscribe("/topic/admin/orders", (frame) => {
        try {
          const raw = JSON.parse(frame.body);
          const n = normalizeItem(raw);
          setItems((prev) => [n, ...(prev ?? [])].slice(0, 100));
          setUnread((u) => Math.max(0, (u ?? 0) + 1));

          audioRef?.play().catch(error => {
              console.warn("Không thể tự động phát âm thanh thông báo:", error);
          });

        } catch {}
      });
      client.subscribe("/topic/admin/notification-count", (frame) => {
        try {
          const n = JSON.parse(frame.body);
          setUnread(Math.max(0, Number(n || 0)));
        } catch {}
      });
    };

    client.activate();
    stompRef.current = client;
    return () => client.deactivate();
  }, [audioRef]);

  async function onMarkRead(id) {
    try {
      await markRead(id);
      setItems((prev) => (prev ?? []).map((it) => (it.id === id ? { ...it, readFlag: true } : it)));
      setUnread((u) => Math.max(0, (u ?? 0) - 1));
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Đánh dấu đã đọc thất bại");
    }
  }

  async function onReadAll() {
    try {
      await markReadAll();
      setItems((prev) => (prev ?? []).map((it) => ({ ...it, readFlag: true })));
      setUnread(0);
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Thao tác thất bại");
    }
  }

  return (
    <div className="notify-bell">
      <button className="btn" onClick={() => setOpen((o) => !o)} aria-label="Thông báo">
        🔔{unread ? <span className="badge">{unread}</span> : null}
      </button>

      {open && (
        <div className="dropdown" role="dialog" aria-label="Danh sách thông báo">
          <div className="dropdown-head">
            <div style={{ fontWeight: 700 }}>Thông báo</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost" onClick={load}>↻ Tải lại</button>
              <button className="btn btn-ghost" onClick={onReadAll}>Đánh dấu đã đọc</button>
            </div>
          </div>

          <div className="dropdown-body">
            {items.length ? items.map((n) => (
              <div key={n.id} className="notify-item" style={{ opacity: n.readFlag ? 0.6 : 1 }}>
                <div style={{ fontWeight: 600 }}>{n.title}</div>
                {n.message && <div className="muted small">{n.message}</div>}
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  {n.orderId && (
                    <Link className="btn btn-ghost" to={`/admin/orders?q=${n.orderId}`}>
                      Xem đơn
                    </Link>
                  )}
                  {!n.readFlag && (
                    <button className="btn btn-small" onClick={() => onMarkRead(n.id)}>
                      Đã đọc
                    </button>
                  )}
                </div>
              </div>
            )) : (
              <div className="muted" style={{ padding: 8 }}>Không có thông báo</div>
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
        .btn-small { padding: 6px 10px; font-size: 0.8rem; border-radius: 8px; }
      `}</style>
    </div>
  );
} 