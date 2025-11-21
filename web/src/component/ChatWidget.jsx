import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../stores/auth";
import { useChatStore } from "../stores/chatStore";
import { initConversation, getMessages } from "../api/chat";
import { getMe } from "../api/users";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
const WS_URL = API_BASE_URL.replace("/api", "") + "/ws";

export default function ChatWidget() {
  const { token } = useAuth();
  const { isOpen, close } = useChatStore();
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [conv, setConv] = useState(null);
  const [user, setUser] = useState(null);
  const stompRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (isOpen && token) {
      (async () => {
        try {
          const u = await getMe();
          setUser(u);
          const c = await initConversation();
          setConv(c);
          const hist = await getMessages(c.id);
          setMsgs(hist);
          connectWs(c.id);
        } catch (e) {
          console.error(e);
        }
      })();
    }
    return () => disconnectWs();
  }, [isOpen, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, isOpen]);

  function connectWs(convId) {
    if (stompRef.current) return;
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
      onConnect: () => {
        client.subscribe(`/topic/conversation/${convId}`, (frame) => {
          const m = JSON.parse(frame.body);
          setMsgs((prev) => [...prev, m]);
        });
      },
    });
    client.activate();
    stompRef.current = client;
  }

  function disconnectWs() {
    if (stompRef.current) {
      stompRef.current.deactivate();
      stompRef.current = null;
    }
  }

  function send() {
    if (!input.trim() || !stompRef.current || !conv || !user) return;
    const payload = {
      conversationId: conv.id,
      senderId: user.id,
      content: input.trim(),
    };
    stompRef.current.publish({
      destination: "/app/chat.sendMessage",
      body: JSON.stringify(payload),
    });
    setInput("");
  }

  if (!isOpen) return null;

  return (
    <div className="chat-widget card">
      <div className="chat-header">
        <span>Customer Support</span>
        <button onClick={close} className="btn-close">×</button>
      </div>
      <div className="chat-body">
        {!token ? (
          <div className="muted center">Please login to chat.</div>
        ) : (
          msgs.map((m, i) => {
            const msgSenderId = m.sender?.id || m.senderId;
            const isMe = Number(msgSenderId) === Number(user?.id);
            return (
              <div key={i} className={`chat-msg ${isMe ? "me" : "them"}`}>
                <div className="msg-content">{m.content}</div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      {token && (
        <div className="chat-footer">
          <input
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type a message..."
          />
          <button className="btn btn-primary" onClick={send}>Send</button>
        </div>
      )}
      <style>{`
        .chat-widget { position: fixed; bottom: 20px; right: 20px; width: 320px; height: 450px; display: flex; flex-direction: column; z-index: 1000; padding: 0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
        .chat-header { background: var(--primary); color: #fff; padding: 12px; display: flex; justify-content: space-between; font-weight: 700; }
        .btn-close { background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; }
        .chat-body { flex: 1; padding: 12px; overflow-y: auto; background: #f9fafb; display: flex; flex-direction: column; gap: 8px; }
        .chat-msg { max-width: 80%; padding: 8px 12px; border-radius: 12px; font-size: 14px; }
        .chat-msg.me { align-self: flex-end; background: var(--primary); color: #fff; }
        .chat-msg.them { align-self: flex-start; background: #e5e7eb; color: #000; }
        .chat-footer { padding: 10px; border-top: 1px solid #eee; display: flex; gap: 8px; background: #fff; }
        .center { text-align: center; margin-top: 50%; }
      `}</style>
    </div>
  );
}