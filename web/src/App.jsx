import React from "react";
import { Routes, Route } from "react-router-dom";
import Login from "./pages/admin/Login.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="*" element={<Login />} />
    </Routes>
  );
}
