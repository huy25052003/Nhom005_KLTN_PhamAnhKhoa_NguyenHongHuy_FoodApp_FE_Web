import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../stores/auth.js";

export default function ProtectedAdmin({ children }) {
  const { accessToken } = useAuth();
  if (!accessToken) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}