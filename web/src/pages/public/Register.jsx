import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { register, login } from "../../api/auth";
import { useAuth } from "../../stores/auth";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast"; // Import Toast

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const { setToken } = useAuth();
  const nav = useNavigate();

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      // START MODIFIED VALIDATION
      const trimmedUsername = username.trim();
      const trimmedPassword = password;
      const trimmedConfirm = confirm;

      if (!trimmedUsername || !trimmedPassword) throw new Error("Vui lòng nhập đủ thông tin.");
      if (trimmedPassword !== trimmedConfirm) throw new Error("Mật khẩu nhập lại không khớp.");

      if (trimmedPassword.length < 6) throw new Error("Mật khẩu phải có ít nhất 6 ký tự.");
      if (trimmedPassword.includes(' ')) throw new Error("Mật khẩu không được chứa khoảng trắng.");
      // END MODIFIED VALIDATION
      
      const rs = await register(trimmedUsername, trimmedPassword);
      // Tự động login sau khi đăng ký
      if (rs?.accessToken) {
        return { accessToken: rs.accessToken };
      } else {
        return await login(trimmedUsername, trimmedPassword);
      }
    },
    onSuccess: ({ accessToken }) => {
      setToken(accessToken);
      toast.success("Đăng ký thành công! Chào mừng bạn.");
      nav("/");
    },
    onError: (err) => {
      const msg = err?.message || "Đăng ký thất bại";
      toast.error(msg);
    },
  });

  function onSubmit(e) {
    e.preventDefault();
    mutate();
  }

  return (
    <div className="min-h-screen grid place-items-center fade-in">
      <form onSubmit={onSubmit} className="w-full max-w-sm border rounded-2xl p-5 space-y-3 bg-white card-hover shadow-lg">
        <h1 className="text-xl font-semibold text-center mb-4">Tạo tài khoản mới</h1>

        <div className="field">
          <input
            className="input border rounded-lg px-3 py-2 w-full"
            placeholder="Tên đăng nhập"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </div>

        <div className="field">
          <input
            className="input border rounded-lg px-3 py-2 w-full"
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <div className="field">
          <input
            className="input border rounded-lg px-3 py-2 w-full"
            type="password"
            placeholder="Nhập lại mật khẩu"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <button 
          className="btn btn-primary border rounded-lg px-4 py-2 w-full disabled:opacity-60 mt-4" 
          disabled={isPending}
        >
          {isPending ? "Đang tạo tài khoản..." : "Đăng ký"}
        </button>

        <p className="text-sm text-center mt-4">
          Đã có tài khoản? <Link className="text-blue-600 underline" to="/admin/login">Đăng nhập</Link>
        </p>
      </form>
    </div>
  );
}