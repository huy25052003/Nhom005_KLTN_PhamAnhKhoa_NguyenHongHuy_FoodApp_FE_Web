import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../stores/auth";

export default function ProtectedUser({ children }) {
  const { token } = useAuth();
  const loc = useLocation();
  if (!token) return <Navigate to="/admin/login" replace state={{ from: loc.pathname }} />;
  return children;
}
