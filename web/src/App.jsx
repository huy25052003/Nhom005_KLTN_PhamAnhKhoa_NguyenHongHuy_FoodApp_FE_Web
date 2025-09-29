import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedAdmin from "./component/ProtectedAdmin.jsx";
import AdminLayout from "./component/AdminLayout.jsx";
import PublicLayout from "./component/PublicLayout.jsx";
import HomePage from "./pages/public/Home.jsx";
import Login from "./pages/admin/Login.jsx";
import Dashboard from "./pages/admin/Dashboard.jsx";
import ProductPage from "./pages/admin/Product.jsx";
import CategoriesPage from "./pages/admin/Categories.jsx";
import OrdersPage from "./pages/admin/Orders.jsx";
import AnalyticsPage from "./pages/admin/Analytics.jsx";
import HomeIndexPage from "./pages/public/Home.jsx";
import CartPage from "./pages/public/Cart.jsx";
import OrderSuccessPage from "./pages/public/OrderSuccess.jsx";
import RegisterPage from "./pages/public/Register.jsx";
import AccountPage from "./pages/public/Account.jsx";
import ProtectedUser from "./component/ProtectedUser.jsx";


export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/account" element={<ProtectedUser><AccountPage /></ProtectedUser>} />
        <Route path="/menu" element={<div className="container section">Trang Thực đơn (đang phát triển)</div>} />
        <Route path="/party" element={<div className="container section">Đặt tiệc (đang phát triển)</div>} />
        <Route path="/order" element={<div className="container section">Đặt hàng (đang phát triển)</div>} />
        <Route path="/blog" element={<div className="container section">Tin tức (đang phát triển)</div>} />
        <Route path="/faqs" element={<div className="container section">FAQs (đang phát triển)</div>} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/order-success/:id" element={<OrderSuccessPage />} />
      </Route>

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
        <Route path="products" element={<ProductPage />} />

        <Route path="orders" element={<OrdersPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
