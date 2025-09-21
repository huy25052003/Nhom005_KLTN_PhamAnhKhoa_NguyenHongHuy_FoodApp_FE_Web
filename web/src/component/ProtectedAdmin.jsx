import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../stores/auth.js";

export default function ProtectedAdmin({ children }) {
  const { accessToken } = useAuth();
  const token = accessToken || localStorage.getItem("accessToken");
  if (!token) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}
