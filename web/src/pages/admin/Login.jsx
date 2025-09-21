import React, { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { login } from "../../api/auth.js";
import { useAuth } from "../../stores/auth.js";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { accessToken, setToken } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (accessToken || localStorage.getItem("accessToken")) {
      nav("/admin", { replace: true });
    }
  }, [accessToken, nav]);

  const { mutate, isPending } = useMutation({
    mutationFn: () => login(username, password),
    onSuccess: ({ accessToken }) => {
      setToken(accessToken);
      nav("/admin", { replace: true }); 
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || "Đăng nhập thất bại";
      alert(msg);
    },
  });

  function onSubmit(e) {
    e.preventDefault();
    mutate();
  }

  return (
    <div className="login-page">
      <form className="card login-card" onSubmit={onSubmit}>
        <h1 className="card-title">Đăng nhập Admin</h1>
        <input className="input" placeholder="Tên đăng nhập" value={username}
               onChange={(e)=>setUsername(e.target.value)} autoComplete="username" required />
        <div style={{ height:8 }} />
        <input className="input" type="password" placeholder="Mật khẩu" value={password}
               onChange={(e)=>setPassword(e.target.value)} autoComplete="current-password" required />
        <div style={{ height:12 }} />
        <button className="btn btn-primary w-full" disabled={isPending} type="submit">
          {isPending ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </div>
  );
}
