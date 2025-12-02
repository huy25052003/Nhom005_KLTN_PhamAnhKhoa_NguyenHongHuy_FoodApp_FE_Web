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

function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    const roles = payload.roles || payload.authorities || payload.role || [];
    return {
      isAdmin: roles.some(r => r === "ROLE_ADMIN" || r === "ADMIN"),
      isKitchen: roles.some(r => r === "ROLE_KITCHEN" || r === "KITCHEN"),
    };
  } catch {
    return { isAdmin: false, isKitchen: false };
  }
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  
  const { setToken } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  const handleSuccess = (accessToken) => {
    setToken(accessToken);
    http.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    toast.success("Đăng nhập thành công");
    
    const params = new URLSearchParams(location.search);
    const redirect = params.get("redirect");
    const { isAdmin, isKitchen } = decodeToken(accessToken);
    
    let target = redirect || "/";
    if (!redirect) {
       if (isAdmin) target = "/admin";
       else if (isKitchen) target = "/kitchen";
    }
    setTimeout(() => nav(target, { replace: true }), 100);
  };

  // 1. Login thường
  const { mutate: doLogin, isPending } = useMutation({
    mutationFn: () => login(username, password),
    onSuccess: ({ accessToken }) => handleSuccess(accessToken),
    onError: (err) => toast.error(err?.response?.data?.message || "Sai thông tin đăng nhập"),
  });

  // 2. Login Google
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const { accessToken } = await loginWithFirebase(idToken);
      handleSuccess(accessToken);
    } catch (error) {
      console.error(error);
      toast.error("Đăng nhập Google thất bại");
    }
  };

  return (
    <div className="login-page fade-in">
      <div className="login-card">
        <h2 className="h2" style={{textAlign: 'left', marginBottom: '1.5rem'}}>Đăng nhập</h2>
        
        <form onSubmit={(e)=>{e.preventDefault(); doLogin();}} className="vstack gap-3">
          
          {/* Username Input */}
          <div>
             <input 
                className="input" 
                style={{padding: '12px', borderRadius: '2px'}}
                value={username} 
                onChange={(e)=>setUsername(e.target.value)} 
                placeholder="Email / Số điện thoại / Tên đăng nhập" 
             />
          </div>

          {/* Password Input */}
          <div className="password-wrapper">
             <input 
                className="input" 
                style={{padding: '12px', paddingRight: '40px', borderRadius: '2px'}}
                type={showPass ? "text" : "password"} 
                value={password} 
                onChange={(e)=>setPassword(e.target.value)} 
                placeholder="Mật khẩu" 
             />
             <div className="password-toggle-icon" onClick={() => setShowPass(!showPass)}>
                {showPass ? <FaEyeSlash /> : <FaEye />}
             </div>
          </div>

          {/* Button Login */}
          <button 
            className="btn btn-primary w-full" 
            style={{marginTop: '8px', padding: '12px', textTransform: 'uppercase', borderRadius: '2px'}}
            disabled={isPending}
          >
            {isPending ? "Đang xử lý..." : "Đăng nhập"}
          </button>
          
          {/* Links */}
          <div className="flex-row space-between" style={{fontSize: '0.85rem'}}>
             <Link to="/forgot-password" className="text-blue-600" style={{textDecoration: 'none'}}>Quên mật khẩu?</Link>
             <Link to="/login-phone" className="text-blue-600" style={{textDecoration: 'none'}}>Đăng nhập bằng SMS</Link>
          </div>

          {/* Divider */}
          <div className="login-divider">
             <span>Hoặc</span>
          </div>

          {/* Google Button */}
          <button type="button" className="btn-google-full" onClick={handleGoogleLogin}>
             <FaGoogle size={20} color="#db4437" /> 
             Đăng nhập bằng Google
          </button>

        </form>

        <div className="auth-footer">
           Bạn mới biết đến FoodApp? <Link to="/register" style={{color: 'var(--primary)', fontWeight: 600, textDecoration: 'none'}}>Đăng ký</Link>
        </div>
      </div>
    </div>
  );
}