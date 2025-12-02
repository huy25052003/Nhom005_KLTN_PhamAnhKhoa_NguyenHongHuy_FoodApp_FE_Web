import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { getMyShipping, upsertMyShipping } from "../../api/shipping.js";
import { getMe } from "../../api/users.js";
import { useAuth } from "../../stores/auth.js";
import PhoneVerifyModal from "../../component/PhoneVerifyModal.jsx";

const API_HOST = "https://esgoo.net/api-tinhthanh-new";

export default function ShippingInfoPage() {
  const { token } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [user, setUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);

  // Form này là thông tin GIAO HÀNG (có thể khác thông tin tài khoản)
  const [form, setForm] = useState({
    phone: "",
    houseNumber: "",
    selectedProv: "",
    selectedWard: "",
    note: ""
  });

  const [errors, setErrors] = useState({});

  const getName = (list, id) => list.find(i => i.id === id)?.full_name || "";

  const validateField = (name, value) => {
    let error = "";
    // Validate SĐT giao hàng (chỉ cần đúng định dạng, không cần verify OTP số này)
    if (name === "phone") {
      const phoneRegex = /^(03|05|07|08|09)\d{8}$/;
      if (!value.trim()) error = "Vui lòng nhập số điện thoại người nhận";
      else if (!phoneRegex.test(value)) error = "SĐT không hợp lệ (10 số)";
    }
    if (name === "houseNumber" && !value.trim()) error = "Vui lòng nhập số nhà/tên đường";
    if (name === "selectedProv" && !value) error = "Vui lòng chọn Tỉnh/Thành phố";
    if (name === "selectedWard" && !value) error = "Vui lòng chọn Phường/Xã";

    setErrors(prev => ({ ...prev, [name]: error }));
    return error;
  };

  useEffect(() => {
    if (!token) {
      nav(`/admin/login?redirect=${encodeURIComponent("/account/shipping")}`);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const [resProv, userInfo, shipInfo] = await Promise.all([
           fetch(`${API_HOST}/1/0.htm`).then(r => r.json()),
           getMe().catch(() => null),
           getMyShipping().catch(() => null)
        ]);

        if (resProv.error === 0) setProvinces(resProv.data);
        if (userInfo) setUser(userInfo);

        // Logic điền SĐT: Ưu tiên lấy từ Shipping cũ, nếu chưa có thì gợi ý SĐT tài khoản
        let initialPhone = shipInfo?.phone || userInfo?.phone || "";

        // Tách địa chỉ cũ
        let house = "";
        if (shipInfo?.addressLine) {
             const parts = shipInfo.addressLine.split(",");
             house = parts[0] || "";
        }

        setForm({
          phone: initialPhone,
          houseNumber: house,
          selectedProv: "", 
          selectedWard: "",
          note: shipInfo?.note || ""
        });

      } catch (e) {
        toast.error("Lỗi tải dữ liệu.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, nav]);

  useEffect(() => {
    if (!form.selectedProv) { setWards([]); return; }
    setForm(prev => ({ ...prev, selectedWard: "" }));
    setWards([]);

    fetch(`${API_HOST}/2/${form.selectedProv}.htm`)
      .then(r => r.json())
      .then(res => {
        if (res.error === 0) setWards(res.data);
      })
      .catch(() => toast.error("Lỗi tải danh sách."));
  }, [form.selectedProv]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) validateField(name, value);
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  const onVerifySuccess = (updatedUser) => {
      setUser(updatedUser);
      toast.success("Xác thực tài khoản thành công! Bạn có thể lưu địa chỉ ngay.");
  };

  async function onSave(e) {
    e.preventDefault();

    // 1. Kiểm tra User Account đã xác thực chưa (Chống spam)
    if (!user?.isPhoneVerified) {
        toast.error("Bạn cần xác thực tài khoản trước khi đặt hàng!", { icon: '🔒' });
        setModalOpen(true); // Tự động mở modal xác thực SĐT chính chủ
        return;
    }

    // 2. Validate form giao hàng
    const errPhone = validateField("phone", form.phone);
    const errProv = validateField("selectedProv", form.selectedProv);
    const errWard = validateField("selectedWard", form.selectedWard);
    const errHouse = validateField("houseNumber", form.houseNumber);

    if (errPhone || errProv || errWard || errHouse) {
      toast.error("Vui lòng kiểm tra lại thông tin");
      return;
    }

    setSaving(true);
    try {
      const pName = getName(provinces, form.selectedProv);
      const wName = getName(wards, form.selectedWard);
      const fullAddress = `${form.houseNumber}, ${wName}, ${pName}`;
      
      await upsertMyShipping({
        phone: form.phone.trim(), // Lưu số người nhận (có thể khác số tài khoản)
        city: pName, 
        addressLine: fullAddress, 
        note: form.note.trim()
      });

      toast.success("Lưu thông tin thành công!");
      const back = sp.get("redirect");
      if (back) setTimeout(() => nav(back), 500);
      
    } catch (e) {
      toast.error(e?.message || "Lưu thất bại.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="container section"><div className="loading"></div> Đang tải...</div>;

  return (
    <div className="container section fade-in">
      <h1 className="h1">Thông tin giao hàng</h1>

      {/* Cảnh báo nếu tài khoản chưa verify */}
      {!user?.isPhoneVerified && (
        <div className="card mb-4" style={{background: '#fff7ed', borderColor: '#fdba74'}}>
            <div className="flex-row gap-2 text-orange-700">
                <span>⚠️</span>
                <span>Tài khoản của bạn chưa được xác thực. Vui lòng xác thực để có thể đặt hàng.</span>
            </div>
            <button className="btn btn-sm btn-primary mt-2" onClick={() => setModalOpen(true)}>
                Xác thực ngay
            </button>
        </div>
      )}

      <div className="card card-hover" style={{ maxWidth: 640, margin: '0 auto' }}>
        <form onSubmit={onSave} className="vstack gap-3">
          
          <div>
            <label className="label">Số điện thoại người nhận <span className="text-red-500">*</span></label>
            <input 
                className={`input ${errors.phone ? "input-error" : ""}`}
                name="phone"
                value={form.phone} 
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Nhập SĐT người nhận hàng (có thể khác SĐT của bạn)" 
            />
            {errors.phone && <span className="error-text">{errors.phone}</span>}
          </div>

          {/* Các trường địa chỉ giữ nguyên */}
          <div className="grid2">
            <div>
              <label className="label">Tỉnh / Thành phố <span className="text-red-500">*</span></label>
              <select 
                className={`input select ${errors.selectedProv ? "input-error" : ""}`}
                name="selectedProv"
                value={form.selectedProv} 
                onChange={handleChange}
                onBlur={handleBlur}
              >
                <option value="">-- Chọn Tỉnh (34) --</option>
                {provinces.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
              {errors.selectedProv && <span className="error-text">{errors.selectedProv}</span>}
            </div>
            
            <div>
               <label className="label">Phường / Xã <span className="text-red-500">*</span></label>
               <select 
                  className={`input select ${errors.selectedWard ? "input-error" : ""}`}
                  name="selectedWard"
                  value={form.selectedWard} 
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={!form.selectedProv}
               >
                  <option value="">-- Chọn Phường/Xã --</option>
                  {wards.map(w => (
                    <option key={w.id} value={w.id}>{w.full_name}</option>
                  ))}
               </select>
               {errors.selectedWard && <span className="error-text">{errors.selectedWard}</span>}
            </div>
          </div>

          <div>
            <label className="label">Số nhà, Tên đường <span className="text-red-500">*</span></label>
            <input 
              className={`input ${errors.houseNumber ? "input-error" : ""}`}
              name="houseNumber"
              value={form.houseNumber} 
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="VD: 123 Đường A" 
            />
            {errors.houseNumber && <span className="error-text">{errors.houseNumber}</span>}
          </div>

          <div>
            <label className="label">Ghi chú (Tuỳ chọn)</label>
            <textarea 
              className="input" 
              rows={2} 
              name="note"
              value={form.note} 
              onChange={handleChange}
              placeholder="Lưu ý giao hàng..." 
            />
          </div>

          <div className="modal-actions" style={{ marginTop: 24, borderTop: '1px solid #eee', paddingTop: 16 }}>
            <Link to="/" className="btn btn-ghost">Hủy</Link>
            <button className="btn btn-primary" disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu địa chỉ"}
            </button>
          </div>
        </form>
      </div>

      {/* MODAL XÁC THỰC SĐT TÀI KHOẢN (KHÔNG PHẢI SĐT GIAO HÀNG) */}
      <PhoneVerifyModal 
         isOpen={modalOpen} 
         onClose={() => setModalOpen(false)} 
         phoneNumber={user?.phone || ""} // Gợi ý SĐT hiện tại của user
         onSuccess={onVerifySuccess}
      />
    </div>
  );
}