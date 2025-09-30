import React from "react";
import { NavLink, Outlet } from "react-router-dom";

export default function AccountLayout() {
  return (
    <div className="container section">
      <div className="flex-row gap-2" style={{ marginBottom: 16 }}>
        <NavLink to="/account" end className="btn btn-ghost">Hồ sơ</NavLink>
        <NavLink to="/account/orders" className="btn btn-ghost">Đơn hàng</NavLink>
      </div>
      <Outlet />
    </div>
  );
}
