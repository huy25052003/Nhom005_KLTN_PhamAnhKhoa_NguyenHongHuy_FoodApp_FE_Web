import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedAdmin from "./component/ProtectedAdmin.jsx";
import AdminLayout from "./component/AdminLayout.jsx";

import Login from "./pages/admin/Login.jsx";
import Dashboard from "./pages/admin/Dashboard.jsx";
import ProductsPage from "./pages/admin/Product.jsx";
import CategoriesPage from "./pages/admin/Categories.jsx";
import OrdersPage from "./pages/admin/Orders.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/login" replace />} />
      <Route path="/admin/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <ProtectedAdmin>
            <AdminLayout />
          </ProtectedAdmin>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="orders" element={<OrdersPage />} />

      </Route>
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  );
}
