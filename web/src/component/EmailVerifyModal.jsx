import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { requestEmailVerification, verifyEmailCode } from "../api/account";

export default function EmailVerifyModal({ isOpen, onClose, email, onSuccess }) {
  const [step, setStep] = useState("SEND"); // SEND | OTP
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep("SEND");
      setOtp("");
      setLoading(false);
    }
  }, [isOpen]);

  // 1. Gửi mã xác thực về Email
  const handleSendCode = async () => {
    setLoading(true);
    try {
      await requestEmailVerification(email);
      setStep("OTP");
      toast.success(`Đã gửi mã đến ${email}`);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Lỗi gửi Email. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Xác thực mã OTP
  const handleVerify = async () => {
    if (otp.length < 6) return toast.error("Mã OTP phải có 6 số");
    setLoading(true);
    try {
      const updatedUser = await verifyEmailCode(otp);
      toast.success("Xác thực Email thành công!");
      if (onSuccess) onSuccess(updatedUser);
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Mã OTP không đúng");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in" style={{ maxWidth: 400 }}>
        <div className="card-title text-center">Xác thực Email</div>
        
        {step === "SEND" && (
          <div className="vstack gap-3 text-center">
            <div style={{ fontSize: '3rem' }}>📧</div>
            <p className="muted">Chúng tôi sẽ gửi mã xác thực 6 số đến email:<br/><b>{email}</b></p>
            <div className="modal-actions" style={{ justifyContent: 'center', marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSendCode} disabled={loading}>
                {loading ? "Đang gửi..." : "Gửi mã"}
              </button>
            </div>
          </div>
        )}

        {step === "OTP" && (
          <div className="vstack gap-3">
            <p className="text-center muted">Nhập mã 6 số đã được gửi đến email của bạn:</p>
            <input 
              className="input text-center" 
              style={{ fontSize: '1.5rem', letterSpacing: '4px', fontWeight: 700 }}
              value={otp} 
              onChange={e => setOtp(e.target.value)}
              placeholder="------" maxLength={6} autoFocus
            />
            <div className="modal-actions" style={{ justifyContent: 'space-between', marginTop: 16 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setStep("SEND")}>Gửi lại mã</button>
              <div className="flex-row gap-2">
                <button className="btn btn-ghost" onClick={onClose}>Đóng</button>
                <button className="btn btn-primary" onClick={handleVerify} disabled={loading}>
                  {loading ? "Kiểm tra..." : "Xác nhận"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}