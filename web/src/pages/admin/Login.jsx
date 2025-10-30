import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { login } from "../../api/auth.js";
import { useAuth } from "../../stores/auth.js";
import http from "../../lib/http.js";

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

export default function AdminLoginPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("123456");
  const { setToken } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  const { mutate, isPending } = useMutation({
    mutationFn: () => login(username, password),
    onSuccess: ({ accessToken }) => {
      setToken(accessToken);
      http.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      const params = new URLSearchParams(location.search);
      const redirect = params.get("redirect");
      const { isAdmin, isKitchen } = decodeToken(accessToken);
      let redirectUrl = redirect;

      if (!redirectUrl) { 
        if (isAdmin) {
          redirectUrl = "/admin"; 
        } else if (isKitchen) {
          redirectUrl = "/kitchen"; 
        } else {
          redirectUrl = "/"; 
        }
      }
      setTimeout(() => nav(redirectUrl, { replace: true }), 0);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || "Đăng nhập thất bại";
      alert(msg);
    },
  });

  return (
    <div className="login-page fade-in">
      <form className="card login-card card-hover" onSubmit={(e)=>{e.preventDefault(); mutate();}}>
        <h1 className="card-title">Đăng nhập</h1>
        <input className="input" value={username} onChange={(e)=>setUsername(e.target.value)} placeholder="Tên đăng nhập" autoComplete="username" />
        <div style={{height:8}} />
        <input className="input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Mật khẩu" autoComplete="current-password" />
        <div style={{height:12}} />
        <button className="btn btn-primary w-full" disabled={isPending}>
          {isPending ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </div>
  );
}