import React, { useEffect, useState, useRef } from "react";
import { getAllConversations, getMessages } from "../../api/chat";
import { useAuth } from "../../stores/auth";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
const WS_URL = API_BASE_URL.replace("/api", "") + "/ws";

export default function AdminChatPage() {
  const { token, username } = useAuth(); // username của admin đang login
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const stompRef = useRef(null);
  const bottomRef = useRef(null);

  // 1. Tải danh sách hội thoại
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

  // 2. Khi chọn 1 hội thoại -> Tải tin nhắn cũ & Connect Socket
  useEffect(() => {
    if (!selectedConv) return;
    
    // Ngắt kết nối cũ nếu có
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

  // 3. Scroll xuống cuối khi có tin nhắn mới
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
          // Cập nhật lại list conversations để đưa cái mới nhất lên đầu (optional)
          loadConversations(); 
        });
      },
    });
    client.activate();
    stompRef.current = client;
  }

  function handleSend() {
    if (!input.trim() || !selectedConv || !stompRef.current) return;
    
    // Admin gửi tin: senderId là ID của admin (đã có trong token/auth store hoặc gọi API getMe)
    // Ở đây ta cần ID số của Admin. 
    // Cách nhanh nhất: Lấy từ selectedConv.admin.id (nếu mình là admin phụ trách)
    // Hoặc gọi API getMe() 1 lần lúc mount để lấy ID chính xác.
    // Giả sử selectedConv.admin.id là đúng người đang login (hoặc logic BE cho phép admin bất kỳ reply)
    
    // Lưu ý: Cần user ID chính xác. Để đơn giản, mình giả định BE đã xử lý lấy user từ Token
    // Nhưng method socket handleWebSocketMessage yêu cầu senderId trong payload.
    // Tốt nhất component này nên gọi getMe() lúc đầu.
    
    // Tạm thời dùng ID admin từ conversation (nếu conversation đã assign cho mình)
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
      
      {/* Sidebar danh sách chat */}
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

      {/* Khung chat chính */}
      <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
        {selectedConv ? (
          <>
            <div style={{ padding: 12, borderBottom: '1px solid #eee', fontWeight: 700, background: '#fafafa' }}>
              Chat với: {selectedConv.customer?.username}
            </div>
            
            <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {msgs.map((m, i) => {
                // Check xem tin nhắn này của Customer hay Admin
                // m.sender.id === selectedConv.customer.id => Là khách nhắn
                const isCustomer = m.sender?.id === selectedConv.customer?.id;
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
                      {new Date(m.createdAt).toLocaleTimeString()}
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