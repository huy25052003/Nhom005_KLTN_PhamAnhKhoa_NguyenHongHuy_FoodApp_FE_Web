import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { requestForgotPassword, resetPasswordEmail, resetPasswordPhone } from "../../api/auth";
import PhoneVerifyModal from "../../component/PhoneVerifyModal";

export default function ForgotPasswordPage() {
  const nav = useNavigate();
  const [tab, setTab] = useState("EMAIL"); // EMAIL | PHONE
  
  // State Email
  const [email, setEmail] = useState("");
  const [stepEmail, setStepEmail] = useState(1);
  const [otp, setOtp] = useState("");
  
  // State Phone
  const [phone, setPhone] = useState("");
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [firebaseToken, setFirebaseToken] = useState(null);

  // Chung
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState(""); // <--- 1. Thêm State Confirm Pass
  const [loading, setLoading] = useState(false);

  // -- XỬ LÝ EMAIL --
  async function onRequestEmail(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await requestForgotPassword(email);
      toast.success("Đã gửi mã xác thực vào email!");
      setStepEmail(2);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Lỗi gửi mail");
    } finally { setLoading(false); }
  }

  async function onResetEmail(e) {
    e.preventDefault();
    
    // <--- 2. Validate Khớp Mật Khẩu (Email Form)
    if (newPass !== confirmPass) {
        toast.error("Mật khẩu nhập lại không khớp!");
        return;
    }

    // NEW: Password length and space validation (START)
    if (newPass.length < 6) {
        toast.error("Mật khẩu phải có ít nhất 6 ký tự.");
        return;
    }
    if (newPass.includes(' ') || newPass.trim() !== newPass) {
        toast.error("Mật khẩu không được chứa khoảng trắng.");
        return;
    }
    // NEW: Password length and space validation (END)

    setLoading(true);
    try {
      await resetPasswordEmail(email, otp, newPass);
      toast.success("Đổi mật khẩu thành công!");
      nav("/admin/login");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Lỗi đổi mật khẩu");
    } finally { setLoading(false); }
  }

  // -- XỬ LÝ PHONE --
  function onPhoneVerified(token) {
    setFirebaseToken(token);
    toast.success("Xác thực SĐT thành công. Hãy nhập mật khẩu mới.");
  }

  async function onResetPhone(e) {
    e.preventDefault();

    // <--- 2. Validate Khớp Mật Khẩu (Phone Form)
    if (newPass !== confirmPass) {
        toast.error("Mật khẩu nhập lại không khớp!");
        return;
    }

    // NEW: Password length and space validation (START)
    if (newPass.length < 6) {
        toast.error("Mật khẩu phải có ít nhất 6 ký tự.");
        return;
    }
    if (newPass.includes(' ') || newPass.trim() !== newPass) {
        toast.error("Mật khẩu không được chứa khoảng trắng.");
        return;
    }
    // NEW: Password length and space validation (END)

    setLoading(true);
    try {
      await resetPasswordPhone(firebaseToken, newPass);
      toast.success("Đổi mật khẩu thành công!");
      nav("/admin/login");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Lỗi đổi mật khẩu");
    } finally { setLoading(false); }
  }

  return (
    <div className="login-page fade-in">
      <div className="login-card">
        <h2 className="h2" style={{marginBottom: '1.5rem', textAlign:'center'}}>Quên mật khẩu</h2>
        
        {/* Tabs */}
        <div className="flex-row" style={{borderBottom:'1px solid #eee', marginBottom: 20}}>
           <button className={`btn btn-ghost w-full ${tab==='EMAIL' ? 'text-blue-600' : 'muted'}`} 
             style={{borderRadius:0, borderBottom: tab==='EMAIL'?'2px solid blue':'none'}}
             onClick={()=>setTab('EMAIL')}>Email</button>
           <button className={`btn btn-ghost w-full ${tab==='PHONE' ? 'text-blue-600' : 'muted'}`}
             style={{borderRadius:0, borderBottom: tab==='PHONE'?'2px solid blue':'none'}}
             onClick={()=>setTab('PHONE')}>Số điện thoại</button>
        </div>

        {/* --- FORM EMAIL --- */}
        {tab === 'EMAIL' && (
          stepEmail === 1 ? (
            <form onSubmit={onRequestEmail} className="vstack gap-3">
              <input className="input" placeholder="Nhập email đăng ký" type="email" required
                     value={email} onChange={e => setEmail(e.target.value)} />
              <button className="btn btn-primary w-full" disabled={loading}>
                {loading ? "Đang gửi..." : "Lấy mã xác thực"}
              </button>
            </form>
          ) : (
            <form onSubmit={onResetEmail} className="vstack gap-3">
              <div className="muted text-center">Mã đã gửi tới <b>{email}</b></div>
              <input className="input text-center" placeholder="Mã OTP 6 số" maxLength={6} required
                     value={otp} onChange={e => setOtp(e.target.value)} style={{letterSpacing: 4, fontSize:'1.2rem'}} />
              
              <input className="input" placeholder="Mật khẩu mới" type="password" required
                     value={newPass} onChange={e => setNewPass(e.target.value)} />
              
              {/* <--- 3. Input Confirm Password (Email) */}
              <input className="input" placeholder="Nhập lại mật khẩu" type="password" required
                     value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />

              <button className="btn btn-primary w-full" disabled={loading}>
                {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
              </button>
            </form>
          )
        )}

        {/* --- FORM PHONE --- */}
        {tab === 'PHONE' && (
          !firebaseToken ? (
            <div className="vstack gap-3">
               <input className="input" placeholder="Nhập số điện thoại (09...)" 
                      value={phone} onChange={e => setPhone(e.target.value)} />
               <button className="btn btn-primary w-full" onClick={()=>{
                   if(!phone) return toast.error("Nhập SĐT");
                   setShowPhoneModal(true);
               }}>Gửi mã xác thực</button>
            </div>
          ) : (
            <form onSubmit={onResetPhone} className="vstack gap-3">
               <div className="text-center text-green-600 fw-bold">✓ SĐT đã xác thực: {phone}</div>
               
               <input className="input" placeholder="Mật khẩu mới" type="password" required
                      value={newPass} onChange={e => setNewPass(e.target.value)} />
               
               {/* <--- 3. Input Confirm Password (Phone) */}
               <input className="input" placeholder="Nhập lại mật khẩu" type="password" required
                      value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />

               <button className="btn btn-primary w-full" disabled={loading}>
                 {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
               </button>
            </form>
          )
        )}

        <div className="auth-footer" style={{marginTop: 20}}>
           <Link to="/admin/login" style={{textDecoration:'none'}}>← Quay lại đăng nhập</Link>
        </div>
      </div>

      <PhoneVerifyModal 
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        phoneNumber={phone}
        onSuccess={onPhoneVerified}
        mode="GET_TOKEN"
      />
    </div>
  );
}