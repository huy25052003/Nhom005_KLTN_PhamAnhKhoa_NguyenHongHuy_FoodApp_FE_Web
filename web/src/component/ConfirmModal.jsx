import React from "react";

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = "Đồng ý", cancelText = "Hủy bỏ", isDanger = false }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal fade-in" style={{ maxWidth: 400, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px' }}>
          <div className={`card-title ${isDanger ? 'text-red' : ''}`} style={{ fontSize: '1.2rem', marginBottom: '8px' }}>
            {title}
          </div>
          <p className="muted" style={{ lineHeight: 1.5 }}>{message}</p>
        </div>
        
        <div className="modal-actions" style={{ padding: '12px 20px', background: '#f9fafb', borderTop: '1px solid #eee', marginTop: 0 }}>
          <button className="btn btn-ghost" onClick={onCancel}>{cancelText}</button>
          <button 
            className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`} 
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}