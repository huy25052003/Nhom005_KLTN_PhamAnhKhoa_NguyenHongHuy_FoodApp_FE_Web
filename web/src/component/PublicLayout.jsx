import React from "react";
import { Outlet } from "react-router-dom";
import SiteHeader from "./SiteHeader.jsx";
import SiteFooter from "./SiteFooter.jsx";
import ChatWidget from "./ChatWidget.jsx";

export default function PublicLayout() {
  return (
    <div className="public-app">
      <SiteHeader />
      <main className="site-main">
        <Outlet />
      </main>
      <SiteFooter />
      <ChatWidget />
    </div>
  );
}