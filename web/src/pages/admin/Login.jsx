import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useLocation, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { signInWithPopup } from "firebase/auth"; 
import { auth, googleProvider } from "../../lib/firebase"; 
import { login, loginWithFirebase } from "../../api/auth.js";
import { useAuth } from "../../stores/auth.js";
import http from "../../lib/http.js";
import { FaEye, FaEyeSlash, FaGoogle } from "react-icons/fa";

// ... hàm decodeToken giữ nguyên ...
function decodeToken(token) { /* ... */ return { isAdmin: false, isKitchen: false }; }

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  
  // State lưu lỗi của từng trường
  const [errors, setErrors] = useState({ username: "", password: "" });

  const { setToken } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  // ... hàm handleSuccess giữ nguyên ...
  const handleSuccess = (accessToken) => {
    setToken(accessToken);
    http.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    toast.success("Đăng nhập thành công");
    const params = new URLSearchParams(location.search);
    const redirect = params.get("redirect") || "/";
    setTimeout(() => nav(redirect, { replace: true }), 100);
  };

  const { mutate: doLogin, isPending } = useMutation({
    mutationFn: () => login(username, password),
    onSuccess: ({ accessToken }) => handleSuccess(accessToken),
    onError: (err) => toast.error(err?.response?.data?.message || "Sai thông tin đăng nhập"),
  });

  const validateAndLogin = (e) => {
    e.preventDefault();
    let newErrors = {};
    
    if (!username.trim()) newErrors.username = "Vui lòng nhập tài khoản";
    if (!password) newErrors.password = "Vui lòng nhập mật khẩu";

    setErrors(newErrors); // Cập nhật lỗi

    // Nếu không có lỗi thì mới login
    if (Object.keys(newErrors).length === 0) {
        doLogin();
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const { accessToken } = await loginWithFirebase(idToken);
      handleSuccess(accessToken);
    } catch (error) {
      toast.error("Đăng nhập Google thất bại");
    }
  };

  return (
    <div className="login-page fade-in">
      <div className="login-card">
        <h2 className="h2">Đăng nhập</h2>
        <p className="muted">Chào mừng bạn quay trở lại!</p>
        
        <form onSubmit={validateAndLogin} className="vstack gap-3">
          
          {/* Username Input */}
          <div>
             <input 
                className={`input ${errors.username ? 'input-error' : ''}`} 
                value={username} 
                onChange={(e)=>{
                    setUsername(e.target.value);
                    if(errors.username) setErrors({...errors, username: ""}); // Xóa lỗi khi gõ
                }} 
                placeholder="Email hoặc Tên đăng nhập" 
             />
             {errors.username && <span className="error-text">{errors.username}</span>}
          </div>

          {/* Password Input */}
          <div>
             <div className="password-wrapper">
                <input 
                    className={`input ${errors.password ? 'input-error' : ''}`} 
                    style={{paddingRight: '40px'}}
                    type={showPass ? "text" : "password"} 
                    value={password} 
                    onChange={(e)=>{
                        setPassword(e.target.value);
                        if(errors.password) setErrors({...errors, password: ""});
                    }} 
                    placeholder="Mật khẩu" 
                />
                <div className="password-toggle-icon" onClick={() => setShowPass(!showPass)}>
                    {showPass ? <FaEyeSlash /> : <FaEye />}
                </div>
             </div>
             {errors.password && <span className="error-text">{errors.password}</span>}
          </div>

          <button 
            className="btn btn-primary w-full" 
            disabled={isPending}
          >
            {isPending ? "Đang xử lý..." : "Đăng nhập"}
          </button>
          
          {/* ... Links & Google Button (Giữ nguyên) ... */}
          <div className="flex-row space-between mt-3">
             <Link to="/forgot-password">Quên mật khẩu?</Link>
             <Link to="/login-phone">Đăng nhập SMS</Link>
          </div>

          <div className="login-divider"><span>Hoặc</span></div>

          <button type="button" className="btn-google-full" onClick={handleGoogleLogin}>
             <FaGoogle size={20} color="#db4437" /> 
             Đăng nhập bằng Google
          </button>
        </form>

        <div className="auth-footer">
           Bạn chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </div>
      </div>
    </div>
  );
}