import React, { useState, useEffect } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../lib/firebase";
import { verifyPhoneFirebase } from "../api/account";
import toast from "react-hot-toast";

// Thêm 'mode' vào props (dòng dưới)
export default function PhoneVerifyModal({ isOpen, onClose, phoneNumber, onSuccess, mode }) {
  const [step, setStep] = useState("SEND");
  const [otp, setOtp] = useState("");
  const [confirmObj, setConfirmObj] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep("SEND");
      setOtp("");
      setConfirmObj(null);
      setLoading(false);
    }
  }, [isOpen]);

  const handleSendCode = async () => {
    setLoading(true);
    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container-modal', {
          'size': 'invisible',
        });
      }
      // Xử lý format sđt (+84...)
      const formatPhone = phoneNumber.startsWith("0") 
        ? "+84" + phoneNumber.slice(1) 
        : (phoneNumber.startsWith("+") ? phoneNumber : "+84" + phoneNumber);

      const confirmation = await signInWithPhoneNumber(auth, formatPhone, window.recaptchaVerifier);
      setConfirmObj(confirmation);
      setStep("OTP");
      toast.success(`Đã gửi mã đến ${phoneNumber}`);
    } catch (error) {
      console.error(error);
      toast.error("Lỗi gửi SMS: " + (error.message || "Vui lòng thử lại"));
      if(window.recaptchaVerifier) window.recaptchaVerifier.clear();
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) return toast.error("Mã OTP phải có 6 số");
    setLoading(true);
    try {
      // 1. Xác thực OTP với Firebase
      const res = await confirmObj.confirm(otp);
      const token = await res.user.getIdToken();
      
      // Nếu mode là GET_TOKEN (dùng cho Quên mật khẩu), trả về token ngay
      if (mode === "GET_TOKEN") {
          onSuccess(token); 
          onClose();
          return;
      }
      
      // Mặc định: Gửi token về Backend để verify tài khoản (Trang Account)
      const updatedUser = await verifyPhoneFirebase(token);
      
      toast.success("Xác thực thành công!");
      onSuccess(updatedUser);
      onClose();
    } catch (e) {
      console.error("Verify Error:", e);
      const serverMessage = e?.response?.data?.message;
      const firebaseMessage = e?.message;

      if (serverMessage) {
          toast.error(serverMessage);
      } else if (firebaseMessage && firebaseMessage.includes("invalid-verification-code")) {
          toast.error("Mã OTP không đúng");
      } else {
          toast.error("Lỗi xác thực: " + (firebaseMessage || "Vui lòng thử lại"));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{maxWidth: 400}}>
        <div className="card-title">Xác thực Số điện thoại</div>
        
        {step === "SEND" && (
          <div className="vstack gap-3">
            <p>Gửi mã xác thực đến: <b>{phoneNumber}</b></p>
            <div id="recaptcha-container-modal"></div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSendCode} disabled={loading}>
                {loading ? "Đang gửi..." : "Gửi mã OTP"}
              </button>
            </div>
          </div>
        )}

        {step === "OTP" && (
          <div className="vstack gap-3">
            <p>Nhập mã 6 số:</p>
            <input 
              className="input text-center" 
              style={{fontSize: '1.5rem', letterSpacing: '4px'}}
              value={otp} 
              onChange={e => setOtp(e.target.value)}
              placeholder="------" maxLength={6} autoFocus
            />
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setStep("SEND")}>Gửi lại</button>
              <button className="btn btn-primary" onClick={handleVerify} disabled={loading}>
                {loading ? "Kiểm tra..." : "Xác nhận"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}