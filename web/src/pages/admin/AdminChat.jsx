import React, { useEffect, useState, useRef } from "react";
import { getAllConversations, getMessages } from "../../api/chat";
import { useAuth } from "../../stores/auth";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

// Lấy trực tiếp từ env
const WS_URL = import.meta.env.VITE_WS_URL;

export default function AdminChatPage() {
  const { token } = useAuth(); 
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const stompRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    try {
      const data = await getAllConversations();
      setConversations(data);
    } catch (e) {
      console.error("Lỗi tải hội thoại:", e);
    }
  }

  useEffect(() => {
    if (!selectedConv) return;
    
    if (stompRef.current) stompRef.current.deactivate();

    (async () => {
      try {
        const history = await getMessages(selectedConv.id);
        setMsgs(history);
        connectWs(selectedConv.id);
      } catch (e) { console.error(e); }
    })();

    return () => {
      if (stompRef.current) stompRef.current.deactivate();
    };
  }, [selectedConv]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  function connectWs(convId) {
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
      onConnect: () => {
        client.subscribe(`/topic/conversation/${convId}`, (frame) => {
          const m = JSON.parse(frame.body);
          setMsgs((prev) => [...prev, m]);
          loadConversations(); 
        });
      },
    });
    client.activate();
    stompRef.current = client;
  }

  function handleSend() {
    if (!input.trim() || !selectedConv || !stompRef.current) return;
    
    const adminId = selectedConv.admin?.id; 

    const payload = {
      conversationId: selectedConv.id,
      senderId: adminId, 
      content: input.trim(),
    };

    stompRef.current.publish({
      destination: "/app/chat.sendMessage",
      body: JSON.stringify(payload),
    });
    setInput("");
  }

  return (
    <div className="page-admin-chat" style={{ height: 'calc(100vh - 100px)', display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>
      
      <div className="card" style={{ padding: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 12, borderBottom: '1px solid #eee', fontWeight: 700 }}>
          Hội thoại ({conversations.length})
        </div>
        {conversations.map(c => (
          <div 
            key={c.id}
            onClick={() => setSelectedConv(c)}
            style={{ 
              padding: 12, 
              borderBottom: '1px dashed #eee', 
              cursor: 'pointer',
              background: selectedConv?.id === c.id ? '#f0fdf4' : 'transparent'
            }}
          >
            <div style={{ fontWeight: 600 }}>{c.customer?.username || "Khách hàng"}</div>
            <div className="muted small" style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
               ID: #{c.id} • {new Date(c.updatedAt || c.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
        {selectedConv ? (
          <>
            <div style={{ padding: 12, borderBottom: '1px solid #eee', fontWeight: 700, background: '#fafafa' }}>
              Chat với: {selectedConv.customer?.username}
            </div>
            
            <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {msgs.map((m, i) => {
                const msgSenderId = m.sender?.id || m.senderId;
                const customerId = selectedConv.customer?.id;
                
                // So sánh ID (ép kiểu Number để tránh lỗi string vs int)
                const isCustomer = Number(msgSenderId) === Number(customerId);
                return (
                  <div key={i} style={{ 
                    alignSelf: isCustomer ? 'flex-start' : 'flex-end',
                    maxWidth: '70%' 
                  }}>
                    <div style={{ 
                      padding: '8px 12px', 
                      borderRadius: 12, 
                      background: isCustomer ? '#e5e7eb' : 'var(--primary)',
                      color: isCustomer ? '#000' : '#fff'
                    }}>
                      {m.content}
                    </div>
                    <div className="muted small" style={{ textAlign: isCustomer ? 'left' : 'right', marginTop: 2 }}>
                      {m.createdAt ? new Date(m.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : ''}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div style={{ padding: 12, borderTop: '1px solid #eee', display: 'flex', gap: 8 }}>
              <input 
                className="input" 
                value={input} 
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Nhập tin nhắn trả lời..."
              />
              <button className="btn btn-primary" onClick={handleSend}>Gửi</button>
            </div>
          </>
        ) : (
          <div className="muted center" style={{ margin: 'auto' }}>
            Chọn một cuộc hội thoại để bắt đầu
          </div>
        )}
      </div>
    </div>
  );
}