import React from "react";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container grid3">
        <div>
          <div className="logo logo--footer">FOOD<span>APP</span></div>
          <p>Giải pháp bữa ăn healthy giao tận nơi mỗi ngày.</p>
          <p className="muted">© {new Date().getFullYear()} FoodApp. All rights reserved.</p>
        </div>
        <div>
          <h4>Điều khoản</h4>
          <ul className="link-col">
            <li><a href="#">Quy định chung</a></li>
            <li><a href="#">Thanh toán</a></li>
            <li><a href="#">Vận chuyển</a></li>
            <li><a href="#">Bảo mật</a></li>
          </ul>
        </div>
        <div>
          <h4>Liên hệ</h4>
          <ul className="link-col">
            <li>Hotline: 0343 314 716</li>
            <li>Email: info@foodapp.vn</li>
            <li>Địa chỉ: TP.HCM</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
