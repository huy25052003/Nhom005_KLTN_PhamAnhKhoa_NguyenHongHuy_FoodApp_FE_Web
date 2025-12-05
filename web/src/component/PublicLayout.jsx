import React from "react";
import { Outlet } from "react-router-dom";
import SiteHeader from "./SiteHeader.jsx";
import SiteFooter from "./SiteFooter.jsx";
import ChatWidget from "./ChatWidget.jsx";
import { useChatStore } from "../stores/chatStore";
import { FaHeadset } from "react-icons/fa"; // Chỉ cần icon Headset

export default function PublicLayout() {
  const { open, isOpen } = useChatStore(); // Dùng hàm open

  // --- CẤU HÌNH KÍCH THƯỚC & VỊ TRÍ ---
  const BUBBLE_SIZE = 64;       
  const BOTPRESS_BOTTOM = 20;   
  const RIGHT_MARGIN = 20;      
  const GAP = 16;               
  
  // Tính toán vị trí: Nằm ngay trên đầu Botpress
  const MY_BUBBLE_BOTTOM = `${BOTPRESS_BOTTOM + BUBBLE_SIZE + GAP}px`;

  return (
    <div className="public-app">
      <SiteHeader />
      <main className="site-main">
        <Outlet />
      </main>
      <SiteFooter />

      {/* Widget Chat */}
      <ChatWidget />

      {/* --- NÚT BUBBLE CHAT NHÂN VIÊN --- */}
      {/* Điều kiện !isOpen: Chỉ hiển thị nút này khi khung chat ĐANG ĐÓNG */}
      {!isOpen && (
        <button
          onClick={open}
          className="symmetric-bubble-btn"
          style={{
            position: 'fixed',
            bottom: MY_BUBBLE_BOTTOM, 
            right: `${RIGHT_MARGIN}px`,
            zIndex: 9999,

            /* Kích thước 64x64 (Khớp Botpress) */
            width: `${BUBBLE_SIZE}px`,
            height: `${BUBBLE_SIZE}px`,
            borderRadius: '50%', 

            /* Style */
            backgroundColor: '#8b5cf6', // Màu tím (hoặc màu thương hiệu)
            color: 'white',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',

            /* Icon */
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out'
          }}
          title="Chat với nhân viên hỗ trợ"
        >
          <FaHeadset size={30} />
        </button>
      )}

      <style>{`
        .symmetric-bubble-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(0,0,0,0.2) !important;
        }
        .symmetric-bubble-btn:active {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
}