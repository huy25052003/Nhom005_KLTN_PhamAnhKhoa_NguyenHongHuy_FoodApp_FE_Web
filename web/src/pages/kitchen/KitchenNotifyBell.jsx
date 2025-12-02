import React, { useEffect, useState, useRef } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { useAuth } from "../../stores/auth";

// Lấy trực tiếp từ env
const WS_URL = import.meta.env.VITE_WS_URL;

export default function KitchenNotifyBell() {
  const { token } = useAuth();
  const [count, setCount] = useState(0);
  const [isShake, setIsShake] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio("/notification.mp3");

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
      onConnect: () => {
        client.subscribe("/topic/kitchen/new-order", (msg) => {
          setCount(prev => prev + 1);
          setIsShake(true);
          setTimeout(() => setIsShake(false), 1000);
          audioRef.current?.play().catch(() => {});
        });
      },
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