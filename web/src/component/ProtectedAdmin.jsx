import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../stores/auth.js";

export default function ProtectedAdmin({ children }) {
  const { token, isAdmin } = useAuth(); 
  const location = useLocation();

  if (!token) {
    const to = `/admin/login?redirect=${encodeURIComponent(location.pathname + location.search)}`;
    return <Navigate to={to} replace />;
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}