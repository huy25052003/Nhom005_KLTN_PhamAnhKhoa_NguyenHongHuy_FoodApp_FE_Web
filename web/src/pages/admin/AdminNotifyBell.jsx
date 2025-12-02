import React, { useEffect, useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { listNotifications, unreadCount, markRead, markReadAll } from "../../api/notifications.js";
import { FaBell, FaSyncAlt, FaCheckDouble } from "react-icons/fa"; 
import { useAuth } from "../../stores/auth";

// Lấy trực tiếp từ env
const WS_URL = import.meta.env.VITE_WS_URL;

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
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const stompRef = useRef(null);
  const dropdownRef = useRef(null);

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
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!token) return;

    load();

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
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
          audioRef?.play().catch(() => {});
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
    
    return () => {
        if (client) client.deactivate();
    };
  }, [token, audioRef]);

  async function onMarkRead(id) {
    try {
      await markRead(id);
      setItems((prev) => (prev ?? []).map((it) => (it.id === id ? { ...it, readFlag: true } : it)));
      setUnread((u) => Math.max(0, (u ?? 0) - 1));
    } catch (e) {
      alert("Lỗi: " + (e?.response?.data?.message || "Không thể đánh dấu đã đọc"));
    }
  }

  async function onReadAll() {
    try {
      await markReadAll();
      setItems((prev) => (prev ?? []).map((it) => ({ ...it, readFlag: true })));
      setUnread(0);
    } catch (e) {
      alert("Lỗi: " + (e?.response?.data?.message || "Thao tác thất bại"));
    }
  }

  return (
    <div className="notify-bell" ref={dropdownRef} style={{ position: 'relative' }}>
      <button 
        className="btn btn-outline btn-sm" 
        onClick={() => setOpen((o) => !o)} 
        aria-label="Thông báo"
        style={{ border: 'none', padding: '8px', fontSize: '1.2rem', position: 'relative' }}
      >
        <FaBell />
        {unread > 0 && (
          <span 
            className="badge" 
            style={{ 
              position: 'absolute', top: -2, right: -2, 
              background: 'var(--danger)', color: '#fff', 
              fontSize: '0.7rem', padding: '2px 5px', minWidth: '18px', height: '18px'
            }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="dropdown fade-in" role="dialog" aria-label="Danh sách thông báo">
          <div className="dropdown-head">
            <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>Thông báo</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={load} title="Tải lại">
                <FaSyncAlt />
              </button>
              <button className="btn btn-ghost btn-sm" onClick={onReadAll} title="Đánh dấu tất cả đã đọc">
                <FaCheckDouble />
              </button>
            </div>
          </div>

          <div className="dropdown-body">
            {items.length ? items.map((n) => (
              <div key={n.id} className={`notify-item ${n.readFlag ? 'read' : 'unread'}`}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>{n.title}</div>
                {n.message && <div className="muted small" style={{ lineHeight: '1.3' }}>{n.message}</div>}
                
                <div className="notify-actions">
                  <span className="muted small" style={{ fontSize: '0.75rem' }}>
                    {new Date(n.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {n.orderId && (
                      <Link 
                        className="btn-link-sm" 
                        to={`/admin/orders?q=${n.orderId}`}
                        onClick={() => setOpen(false)}
                      >
                        Xem đơn
                      </Link>
                    )}
                    {!n.readFlag && (
                      <button className="btn-link-sm" onClick={() => onMarkRead(n.id)}>
                        Đã đọc
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )) : (
              <div className="muted" style={{ padding: '24px', textAlign: 'center' }}>Không có thông báo mới</div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .notify-bell .dropdown {
          position: absolute; right: 0; top: 120%; 
          width: 380px; max-width: 90vw;
          background: #fff; border: 1px solid var(--border); border-radius: 12px; 
          box-shadow: 0 10px 30px rgba(0,0,0,0.15); z-index: 100;
          overflow: hidden;
        }
        .dropdown-head {
          display: flex; justify-content: space-between; align-items: center; 
          padding: 12px 16px; border-bottom: 1px solid var(--border); background: #f8fafc;
        }
        .dropdown-body {
          max-height: 60vh; overflow-y: auto;
        }
        .notify-item {
          padding: 12px 16px; border-bottom: 1px solid var(--border);
          transition: background 0.2s; position: relative;
        }
        .notify-item:last-child { border-bottom: none; }
        .notify-item.unread { background: #fff; }
        .notify-item.unread::before {
          content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--primary);
        }
        .notify-item.read { background: #f8fafc; opacity: 0.8; }
        .notify-item:hover { background: #f1f5f9; }
        
        .notify-actions {
          display: flex; justify-content: space-between; align-items: center; margin-top: 8px;
        }
        .btn-link-sm {
          background: none; border: none; padding: 0; color: var(--primary); 
          font-size: 0.8rem; font-weight: 600; cursor: pointer; text-decoration: none;
        }
        .btn-link-sm:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}