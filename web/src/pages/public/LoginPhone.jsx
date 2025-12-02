import React, { useState } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { loginWithFirebase } from "../../api/auth";
import { useAuth } from "../../stores/auth";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";

export default function LoginPhone() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmObj, setConfirmObj] = useState(null); // Object xác thực của Firebase
  const [loading, setLoading] = useState(false);
  
  const { setToken } = useAuth();
  const nav = useNavigate();

  // Setup Captcha (Bắt buộc của Firebase để chống spam)
  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => {}
      });
    }
  };

  // 1. Gửi OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 9) return toast.error("SĐT không hợp lệ");
    
    setLoading(true);
    try {
      setupRecaptcha();
      // Chuyển đổi SĐT sang định dạng quốc tế (+84)
      const formatPhone = phone.startsWith("0") ? "+84" + phone.slice(1) : "+84" + phone;

      const confirmation = await signInWithPhoneNumber(auth, formatPhone, window.recaptchaVerifier);
      setConfirmObj(confirmation);
      toast.success("Đã gửi mã OTP!");
    } catch (err) {
      console.error(err);
      toast.error("Lỗi gửi SMS: " + (err.message || "Thử lại sau"));
      if(window.recaptchaVerifier) window.recaptchaVerifier.clear();
    } finally {
      setLoading(false);
    }
  };

  // 2. Xác thực OTP & Đăng nhập
  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) return toast.error("Mã OTP phải có 6 số");
    setLoading(true);

    try {
      // Verify với Firebase
      const res = await confirmObj.confirm(otp);
      const idToken = await res.user.getIdToken();

      // Gửi token về Backend để lấy JWT hệ thống
      const { accessToken } = await loginWithFirebase(idToken);
      
      // Lưu token và vào trang chủ
      setToken(accessToken);
      toast.success("Đăng nhập thành công!");
      nav("/");
      
    } catch (err) {
      console.error(err);
      toast.error("Mã OTP không đúng hoặc lỗi hệ thống");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page fade-in" style={{background: 'var(--bg)'}}>
      <div className="login-card">
        <h2 className="h2" style={{textAlign: 'left', marginBottom: '1.5rem'}}>
          {confirmObj ? "Nhập mã xác thực" : "Đăng nhập bằng SMS"}
        </h2>
        
        {/* Container cho Captcha ẩn */}
        <div id="recaptcha-container"></div>

        {!confirmObj ? (
          // --- BƯỚC 1: NHẬP SỐ ĐIỆN THOẠI ---
          <form onSubmit={handleSendOtp} className="vstack gap-3">
            <div>
              <input 
                className="input" 
                style={{padding: '12px'}}
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
                placeholder="Số điện thoại" 
                autoFocus
              />
            </div>
            
            <button 
              className="btn btn-primary w-full" 
              style={{marginTop: '8px', padding: '12px', textTransform: 'uppercase'}}
              disabled={loading}
            >
              {loading ? "Đang gửi..." : "Tiếp theo"}
            </button>

            <div className="login-divider"><span>Hoặc</span></div>
            
            <Link to="/admin/login" className="btn btn-outline w-full" style={{textDecoration:'none', justifyContent:'center'}}>
                Đăng nhập bằng Mật khẩu
            </Link>
          </form>
        ) : (
          // --- BƯỚC 2: NHẬP OTP ---
          <div className="vstack gap-3">
            <div className="muted text-center mb-2">
                Mã xác thực đã được gửi đến <b>{phone}</b>
            </div>

            <div>
              <input 
                className="input text-center" 
                style={{fontSize: '1.5rem', letterSpacing: '4px', padding: '10px'}}
                value={otp} 
                onChange={e => setOtp(e.target.value)} 
                placeholder="------"
                maxLength={6}
                autoFocus
              />
            </div>

            <button 
              className="btn btn-primary w-full" 
              style={{marginTop: '8px', padding: '12px', textTransform: 'uppercase'}}
              onClick={handleVerifyOtp}
              disabled={loading}
            >
              {loading ? "Đang kiểm tra..." : "Xác nhận"}
            </button>

            <div className="text-center mt-3">
                <button className="btn-ghost text-sm" onClick={() => setConfirmObj(null)}>
                    Gửi lại mã / Đổi số điện thoại
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}