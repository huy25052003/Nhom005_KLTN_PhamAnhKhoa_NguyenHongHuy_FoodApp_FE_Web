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
import OrderSuccessPage from "./pages/public/OrderSuccess.jsx";
import RegisterPage from "./pages/public/Register.jsx";
import AccountPage from "./pages/public/Account.jsx";
import ProtectedUser from "./component/ProtectedUser.jsx";
import AccountOrdersPage from "./pages/public/MyOrders.jsx";
import ProductDetailPage from "./pages/public/ProductDetail.jsx";
import CategoryProductsPage from "./pages/public/CategoryProducts.jsx";
import CheckoutPage from "./pages/public/Checkout.jsx";
import PaymentResultPage from "./pages/public/PaymentResult.jsx";
import ShippingInfoPage from "./pages/public/ShippingInfo.jsx";
import FavoritesPage from "./pages/public/Favorites.jsx";
import AdminInvoice from "./pages/admin/AdminInvoice.jsx";
import MenuPage from "./pages/public/MenuPage.jsx";
import AdminUsersPage from "./pages/admin/Users.jsx";
import KitchenDashboard from "./pages/kitchen/KitchenDashboard.jsx";
import ProtectedKitchen from "./component/ProtectedKitchen.jsx";
import KitchenLayout from "./component/KitchenLayout.jsx";
import AdminChatPage from "./pages/admin/AdminChat.jsx";
import AdminPromotionsPage from "./pages/admin/Promotions.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/account" element={<ProtectedUser><AccountPage /></ProtectedUser>} />
        <Route path="/account/orders" element={<ProtectedUser><AccountOrdersPage/></ProtectedUser>} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/categories/:categoryId" element={<CategoryProductsPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/account/shipping" element={<ShippingInfoPage />} />
        <Route path="/pay/result" element={<PaymentResultPage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/order-success/:id" element={<OrderSuccessPage />} />
        <Route path="/party" element={<div className="container section">Đặt tiệc (đang phát triển)</div>} />
        <Route path="/order" element={<div className="container section">Đặt hàng (đang phát triển)</div>} />
        <Route path="/blog" element={<div className="container section">Tin tức (đang phát triển)</div>} />
        <Route path="/faqs" element={<div className="container section">FAQs (đang phát triển)</div>} />
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
        <Route path="/admin/orders/:id/invoice" element={<AdminInvoice />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="chat" element={<AdminChatPage />} />
        <Route path="promotions" element={<AdminPromotionsPage />} />
      </Route>

        <Route
        path="/kitchen"
        element={
          <ProtectedKitchen>
            <KitchenLayout />
          </ProtectedKitchen>
        }
      >
        <Route index element={<KitchenDashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}