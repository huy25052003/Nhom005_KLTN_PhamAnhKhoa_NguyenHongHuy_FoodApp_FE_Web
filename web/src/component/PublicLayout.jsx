import React from "react";
import { Outlet } from "react-router-dom";
import SiteHeader from "./SiteHeader.jsx";

export default function PublicLayout() {
  return (
    <div className="public-app">
      <SiteHeader />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
