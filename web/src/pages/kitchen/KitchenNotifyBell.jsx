import React, { useEffect, useState, useRef } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { useAuth } from "../../stores/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
// Loại bỏ /api ở cuối để lấy root URL cho websocket
const WS_URL = API_BASE_URL.replace("/api", "") + "/ws";

export default function KitchenNotifyBell() {
  const { token } = useAuth();
  const [count, setCount] = useState(0);
  const [isShake, setIsShake] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    // Init audio
    audioRef.current = new Audio("/notification.mp3");

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
      onConnect: () => {
        // Nghe topic từ NotificationService.notifyKitchenOfNewOrder
        client.subscribe("/topic/kitchen/new-order", (msg) => {
          // 1. Tăng số đếm
          setCount(prev => prev + 1);
          
          // 2. Rung chuông
          setIsShake(true);
          setTimeout(() => setIsShake(false), 1000);

          // 3. Phát âm thanh
          audioRef.current?.play().catch(() => {});
        });
      },
      // Tắt log debug để console gọn hơn
      debug: () => {},
    });

    client.activate();
    return () => client.deactivate();
  }, [token]);

  return (
    <div style={{ position: "relative", cursor: "pointer" }} onClick={() => setCount(0)}>
      <div 
        className={`btn btn-outline ${isShake ? "shake-anim" : ""}`}
        style={{ border: "none", background: "transparent", fontSize: "1.5rem", padding: "4px 8px" }}
      >
        🔔
        {count > 0 && (
          <span className="badge" style={{ 
            position: "absolute", top: 0, right: 0, 
            background: "var(--danger)", color: "#fff", 
            fontSize: "0.7rem", height: "18px", minWidth: "18px" 
          }}>
            {count}
          </span>
        )}
      </div>
      <style>{`
        @keyframes shake {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(15deg); }
          50% { transform: rotate(-15deg); }
          75% { transform: rotate(10deg); }
          100% { transform: rotate(0deg); }
        }
        .shake-anim { animation: shake 0.5s ease-in-out; color: var(--danger); }
      `}</style>
    </div>
  );
}