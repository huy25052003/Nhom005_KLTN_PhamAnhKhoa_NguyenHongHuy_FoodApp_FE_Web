import React, { useState, useEffect } from "react";
import { requestEmailVerification, verifyEmailCode } from "../api/account.js";

export default function EmailVerification({ user, onVerified }) {
  const [status, setStatus] = useState("idle");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user]);

  if (user?.isEmailVerified) {
    return (
      <div className="card" style={{ marginTop: 16, borderColor: "var(--primary)" }}>
        <div className="flex-row gap-2" style={{ color: "var(--primary)", fontWeight: 600 }}>
          <span style={{ fontSize: '1.2rem' }}>✅</span>
          <span>Email đã được xác thực: {user.email}</span>
        </div>
      </div>
    );
  }

  const handleSendCode = async () => {
    if (!email.trim()) return alert("Vui lòng nhập email");
    setStatus("sending");
    setMsg("");
    try {
      await requestEmailVerification(email);
      setStatus("sent");
      setMsg(`Mã xác thực đã được gửi đến ${email}`);
    } catch (e) {
      setStatus("idle");
      alert(e?.response?.data?.message || e?.message || "Gửi mã thất bại");
    }
  };

  const handleVerify = async () => {
    if (!code.trim()) return alert("Vui lòng nhập mã xác thực");
    setStatus("verifying");
    try {
      const updatedUser = await verifyEmailCode(code);
      alert("Xác thực thành công!");
      setStatus("idle");
      if (onVerified) onVerified(updatedUser);
    } catch (e) {
      setStatus("sent");
      alert(e?.response?.data?.message || e?.message || "Mã xác thực không đúng");
    }
  };

  return (
    <div className="card card-hover" style={{ marginTop: 16 }}>
      <div className="card-title">Xác thực Email</div>
      
      <div className="flex-row space-between" style={{ alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label className="label" style={{ fontSize: '0.85rem', color: '#666' }}>Địa chỉ Email</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input 
              className="input" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              disabled={status !== "idle"}
              placeholder="Nhập email của bạn"
            />
            {status === "idle" && (
              <button className="btn btn-primary" onClick={handleSendCode} style={{ whiteSpace: 'nowrap' }}>
                Gửi mã
              </button>
            )}
          </div>
        </div>
      </div>

      {(status === "sent" || status === "verifying") && (
        <div className="fade-in" style={{ marginTop: 16, borderTop: '1px dashed #eee', paddingTop: 12 }}>
          <p className="muted" style={{ marginBottom: 8 }}>{msg}</p>
          <div className="flex-row gap-2">
            <input
              className="input"
              style={{ width: 160 }}
              placeholder="Mã xác thực"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
            />
            <button 
              className="btn btn-primary" 
              onClick={handleVerify}
              disabled={status === "verifying"}
            >
              {status === "verifying" ? "Đang kiểm tra..." : "Xác nhận"}
            </button>
            <button 
              className="btn btn-ghost" 
              onClick={() => { setStatus("idle"); setMsg(""); }}
              disabled={status === "verifying"}
            >
              Đổi email / Gửi lại
            </button>
          </div>
        </div>
      )}
    </div>
  );
}