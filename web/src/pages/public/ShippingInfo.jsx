import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { getMyShipping, upsertMyShipping } from "../../api/shipping.js";
import { useAuth } from "../../stores/auth.js";

export default function ShippingInfoPage() {
  const { token } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ phone: "", addressLine: "", city: "" });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      if (!token) {
        nav(`/admin/login?redirect=${encodeURIComponent("/account/shipping")}`);
        return;
      }
      setLoading(true);
      try {
        const data = await getMyShipping();
        if (data) {
          setForm({
            phone: data.phone || "",
            addressLine: data.addressLine || data.address || "",
            city: data.city || "",
          });
        }
      } catch (e) {
      } finally {
        setLoading(false);
      }
    })();
  }, [token, nav]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function onSave(e) {
    e.preventDefault();
    setMsg("");
    if (!form.phone.trim()) { setMsg("Vui lòng nhập số điện thoại."); return; }
    if (!form.addressLine.trim()) { setMsg("Vui lòng nhập địa chỉ giao hàng."); return; }
    setSaving(true);
    try {
      await upsertMyShipping({
        phone: form.phone.trim(),
        addressLine: form.addressLine.trim(),
        city: form.city.trim(),
      });
      setMsg("Đã lưu thông tin giao hàng ✅");
      const back = sp.get("redirect");
      if (back) {
        setTimeout(() => nav(back), 400);
      }
    } catch (e) {
      setMsg(e?.message || "Lưu thất bại.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="container section">Đang tải…</div>;

  return (
    <div className="container section fade-in">
      <h1 className="h1">Thông tin giao hàng</h1>

      <div className="card card-hover" style={{ maxWidth: 640 }}>
        <form onSubmit={onSave}>
          <div className="form-grid">
            <label className="label">Số điện thoại *</label>
            <input
              className="input" name="phone" value={form.phone} onChange={onChange}
              placeholder="VD: 09xxxxxxxx" required
            />
            <label className="label">Địa chỉ *</label>
            <textarea
              className="input" name="addressLine" value={form.addressLine} onChange={onChange}
              rows={3} placeholder="Số nhà, đường, phường/xã…" required
            />
            <label className="label">Tỉnh/Thành (tuỳ chọn)</label>
            <input
              className="input" name="city" value={form.city} onChange={onChange}
              placeholder="VD: TP. Hồ Chí Minh"
            />
          </div>
          {msg && <div className="muted" style={{ marginTop: 8 }}>{msg}</div>}
          <div className="modal-actions" style={{ marginTop: 12 }}>
            <Link to="/" className="btn">Về trang chủ</Link>
            <button className="btn btn-primary" disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu thông tin"}
            </button>
          </div>
        </form>
      </div>
      <p className="muted" style={{ marginTop: 12 }}>
        * Thông tin này sẽ được dùng khi bạn đặt hàng.
      </p>
    </div>
  );
}