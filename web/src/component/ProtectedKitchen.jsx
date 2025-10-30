import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../stores/auth.js";

export default function ProtectedKitchen({ children }) {
  const { token, isAdmin, isKitchen } = useAuth();
  const location = useLocation();

  if (!token || (!isAdmin && !isKitchen)) {
    const to = `/admin/login?redirect=${encodeURIComponent(location.pathname + location.search)}`;
    return <Navigate to={to} replace />;
  }
  return children;
}