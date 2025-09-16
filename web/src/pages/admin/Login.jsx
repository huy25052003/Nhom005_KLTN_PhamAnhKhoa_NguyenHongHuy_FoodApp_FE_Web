import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { login } from "../../api/auth.js";
import { useAuth } from "../../stores/auth.js";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { setToken } = useAuth();

  const { mutate, isPending } = useMutation({
    mutationFn: () => login(username, password),
    onSuccess: ({ accessToken }) => {
      setToken(accessToken);
      console.log("Đăng nhập OK, token =", accessToken);
    },
    onError: (err) => {
      alert(err?.response?.data?.message || err?.message || "Đăng nhập thất bại");
    },
  });

  return (
    <div className="login-page">
      <form className="card login-card" onSubmit={(e)=>{ e.preventDefault(); mutate(); }}>
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
