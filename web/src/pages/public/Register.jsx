import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { register, login } from "../../api/auth";
import { useAuth } from "../../stores/auth";
import { useNavigate, Link } from "react-router-dom";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const { setToken } = useAuth();
  const nav = useNavigate();

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (!username.trim() || !password.trim()) throw new Error("Vui lòng nhập đủ thông tin.");
      if (password !== confirm) throw new Error("Mật khẩu nhập lại không khớp.");
      const rs = await register(username.trim(), password);
      if (rs?.accessToken) {
        return { accessToken: rs.accessToken };
      } else {
        return await login(username.trim(), password);
      }
    },
    onSuccess: ({ accessToken }) => {
      setToken(accessToken);
      nav("/");
    },
    onError: (err) => {
      const msg = err?.message || "Đăng ký thất bại";
      alert(msg);
    },
  });

  function onSubmit(e) {
    e.preventDefault();
    mutate();
  }

  return (
    <div className="min-h-screen grid place-items-center fade-in">
      <form onSubmit={onSubmit} className="w-full max-w-sm border rounded-2xl p-5 space-y-3 bg-white card-hover">
        <h1 className="text-xl font-semibold">Tạo tài khoản</h1>

        <input
          className="input border rounded-lg px-3 py-2 w-full"
          placeholder="Tên đăng nhập"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />

        <input
          className="input border rounded-lg px-3 py-2 w-full"
          type="password"
          placeholder="Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />

        <input
          className="input border rounded-lg px-3 py-2 w-full"
          type="password"
          placeholder="Nhập lại mật khẩu"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />

        <button className="btn btn-primary border rounded-lg px-4 py-2 w-full disabled:opacity-60" disabled={isPending}>
          {isPending ? "Đang tạo..." : "Đăng ký"}
        </button>

        <p className="text-sm text-center">
          Đã có tài khoản? <Link className="text-blue-600 underline" to="/admin/login">Đăng nhập</Link>
        </p>
      </form>
    </div>
  );
}