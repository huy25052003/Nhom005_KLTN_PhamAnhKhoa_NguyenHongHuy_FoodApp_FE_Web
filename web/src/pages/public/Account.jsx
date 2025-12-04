import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getProfile, updateProfile, getMe } from "../../api/users";
import { getMyShipping, upsertMyShipping } from "../../api/shipping";
import PhoneVerifyModal from "../../component/PhoneVerifyModal";
import EmailVerifyModal from "../../component/EmailVerifyModal";
import { FaUser, FaHeartbeat, FaUtensils, FaMapMarkedAlt, FaSave } from "react-icons/fa";

const API_HOST = "https://esgoo.net/api-tinhthanh-new";

export default function AccountProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);

  const [form, setForm] = useState({
    // Profile
    fullName: "", birthDate: "", gender: "MALE",
    heightCm: "", weightKg: "", activityLevel: "MODERATE",
    dietaryPreference: "", allergies: "", targetCalories: "", phone: "",
    // Shipping
    shippingPhone: "", pId: "", wId: "", houseNumber: "", note: ""
  });

  useEffect(() => {
    (async () => {
      try {
        const [profile, userData, shipping, provRes] = await Promise.all([
          getProfile().catch(() => ({})),
          getMe().catch(() => null),
          getMyShipping().catch(() => null),
          fetch(`${API_HOST}/1/0.htm`).then(r => r.json()).catch(() => ({ error: 1 }))
        ]);

        if (provRes.error === 0) setProvinces(provRes.data);
        if (userData) {
            setUser(userData);
            // Ưu tiên lấy SĐT từ user account
            setForm(prev => ({ ...prev, phone: userData.phone || shipping?.phone || "" }));
        }

        setForm(prev => ({
            ...prev,
            // Map fullName từ profile vào form
            fullName: profile?.fullName || "", 
            birthDate: profile?.birthDate || "",
            gender: profile?.gender || "MALE",
            heightCm: profile?.heightCm || "",
            weightKg: profile?.weightKg || "",
            activityLevel: profile?.activityLevel || "MODERATE",
            dietaryPreference: profile?.dietaryPreference || "",
            allergies: profile?.allergies || "",
            targetCalories: profile?.targetCalories || "",
            
            shippingPhone: shipping?.phone || userData?.phone || "",
            houseNumber: shipping?.addressLine || "",
            note: shipping?.note || ""
        }));
      } catch (e) { toast.error("Lỗi tải dữ liệu"); } 
      finally { setLoading(false); }
    })();
  }, []);

  // Fetch Wards logic (giữ nguyên)
  useEffect(() => {
    if (!form.pId) { setWards([]); return; }
    fetch(`${API_HOST}/2/${form.pId}.htm`).then(r => r.json()).then(res => {
        if (res.error === 0) setWards(res.data);
    });
  }, [form.pId]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    const loadId = toast.loading("Đang lưu...");
    try {
      await updateProfile({
        fullName: form.fullName, // Gửi fullName lên
        birthDate: form.birthDate, gender: form.gender,
        heightCm: Number(form.heightCm)||null, weightKg: Number(form.weightKg)||null,
        activityLevel: form.activityLevel, dietaryPreference: form.dietaryPreference,
        allergies: form.allergies, targetCalories: Number(form.targetCalories)||null,
      });

      // Logic save shipping (giữ nguyên)
      let addressToSave = form.houseNumber;
      if (form.pId && form.wId) {
          const pName = provinces.find(p => p.id === form.pId)?.full_name;
          const wName = wards.find(w => w.id === form.wId)?.full_name;
          addressToSave = `${form.houseNumber}, ${wName}, ${pName}`;
      }
      
      if (addressToSave) {
          await upsertMyShipping({
            phone: form.shippingPhone || form.phone,
            addressLine: addressToSave,
            city: provinces.find(p => p.id === form.pId)?.full_name || "Vietnam",
            note: form.note
          });
      }
      toast.success("Cập nhật thành công!", { id: loadId });
    } catch (e) { toast.error("Lỗi lưu dữ liệu", { id: loadId }); }
  };

  if (loading) return <div className="container section text-center"><div className="loading"></div></div>;

  return (
    <div className="profile-container fade-in">
      <div className="flex-row space-between align-center mb-4">
         <div>
            <h1 className="h2" style={{margin:0, color: 'var(--text)'}}>Hồ sơ cá nhân</h1>
            <p className="muted" style={{margin:0}}>Quản lý thông tin và địa chỉ giao hàng</p>
         </div>
         <button onClick={onSubmit} className="btn btn-primary shadow-md">
            <FaSave /> Lưu thay đổi
         </button>
      </div>

      <div className="grid-2x2-balanced">
        
        {/* 1. TÀI KHOẢN */}
        <div className="profile-card">
            <h3 className="flex-row gap-2"><FaUser className="text-blue-600"/> Thông tin tài khoản</h3>
            
            {/* --- SỬA Ở ĐÂY: CHỈ HIỂN THỊ EMAIL --- */}
            <div className="field mb-3">
                <label className="label">Email</label>
                <div className="input-group">
                    {/* Hiển thị email, disable vì không cho sửa trực tiếp */}
                    <input className="input" value={user?.email} disabled />
                    {user?.isEmailVerified ? 
                       <span className="addon success" title="Email đã xác thực">✓ Email</span> : 
                       <button onClick={()=>setEmailModalOpen(true)} className="addon btn-warning">Verify Email</button>
                    }
                </div>
            </div>

            <div className="field mb-3">
                <label className="label">Số điện thoại</label>
                <div className="input-group">
                    <input className="input" value={form.phone} disabled placeholder="Chưa có SĐT" />
                    {user?.isPhoneVerified ? 
                       <span className="addon success">✓ Verified</span> : 
                       <button onClick={()=>setPhoneModalOpen(true)} className="addon btn-primary">Verify Phone</button>
                    }
                </div>
            </div>

            <div className="grid2">
                <div className="field">
                    <label className="label">Họ tên</label>
                    <input className="input" name="fullName" value={form.fullName} onChange={onChange} placeholder="Nhập họ tên đầy đủ" />
                </div>
                <div className="field">
                    <label className="label">Ngày sinh</label>
                    <input type="date" className="input" name="birthDate" value={form.birthDate} onChange={onChange} />
                </div>
            </div>
        </div>

        {/* ... (Các phần Sức Khỏe, Giao Hàng, Chế Độ Ăn giữ nguyên) ... */}
        
        <div className="profile-card">
            <h3 className="flex-row gap-2"><FaHeartbeat className="text-red-500"/> Chỉ số sức khỏe</h3>
            <div className="grid2 mb-3">
                <div className="field">
                    <label className="label">Chiều cao (cm)</label>
                    <input type="number" className="input" name="heightCm" value={form.heightCm} onChange={onChange} />
                </div>
                <div className="field">
                    <label className="label">Cân nặng (kg)</label>
                    <input type="number" className="input" name="weightKg" value={form.weightKg} onChange={onChange} />
                </div>
            </div>
            <div className="field mb-3">
                <label className="label">Mức độ vận động</label>
                <select className="select" name="activityLevel" value={form.activityLevel} onChange={onChange}>
                    <option value="SEDENTARY">Ít vận động (Văn phòng)</option>
                    <option value="LIGHT">Nhẹ (1-3 buổi/tuần)</option>
                    <option value="MODERATE">Vừa (3-5 buổi/tuần)</option>
                    <option value="ACTIVE">Năng động (6-7 buổi)</option>
                </select>
            </div>
            <div className="field">
                <label className="label">Target Calories / ngày</label>
                <input type="number" className="input" name="targetCalories" value={form.targetCalories} onChange={onChange} />
            </div>
        </div>

        <div className="profile-card">
            <h3 className="flex-row gap-2"><FaMapMarkedAlt className="text-orange-600"/> Địa chỉ giao hàng</h3>
            <div className="field mb-3">
                <label className="label">SĐT Nhận hàng</label>
                <input className="input" name="shippingPhone" value={form.shippingPhone} onChange={onChange} placeholder="Nhập SĐT người nhận..." />
            </div>
            <div className="grid2 mb-3">
                <div className="field">
                    <label className="label">Tỉnh / Thành phố</label>
                    <select className="select" name="pId" value={form.pId} onChange={onChange}>
                        <option value="">-- Chọn Tỉnh --</option>
                        {provinces.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                    </select>
                </div>
                <div className="field">
                    <label className="label">Phường / Xã</label>
                    <select className="select" name="wId" value={form.wId} onChange={onChange} disabled={!form.pId}>
                        <option value="">-- Chọn Phường --</option>
                        {wards.map(w => <option key={w.id} value={w.id}>{w.full_name}</option>)}
                    </select>
                </div>
            </div>
            <div className="field">
                <label className="label">Số nhà, Tên đường</label>
                <textarea className="input" rows="2" name="houseNumber" value={form.houseNumber} onChange={onChange} 
                  placeholder={!form.pId ? "Địa chỉ hiện tại..." : "VD: 123 Nguyễn Huệ..."} />
            </div>
        </div>

        <div className="profile-card">
            <h3 className="flex-row gap-2"><FaUtensils className="text-green-600"/> Chế độ ăn uống</h3>
            <div className="field mb-3">
                <label className="label">Sở thích / Diet</label>
                <input className="input" name="dietaryPreference" value={form.dietaryPreference} onChange={onChange} placeholder="VD: Eat Clean, Keto..." />
            </div>
            <div className="field">
                <label className="label">Dị ứng thực phẩm</label>
                <textarea className="input" rows="3" name="allergies" value={form.allergies} onChange={onChange} placeholder="VD: Đậu phộng, Hải sản..." />
            </div>
        </div>

      </div>

      <PhoneVerifyModal isOpen={phoneModalOpen} onClose={() => setPhoneModalOpen(false)} phoneNumber={form.phone} onSuccess={(u)=>{setUser(u); setForm(p=>({...p, phone: u.phone}))}} />
      <EmailVerifyModal isOpen={emailModalOpen} onClose={() => setEmailModalOpen(false)} email={user?.email} onSuccess={(u)=>setUser(u)} />
    </div>
  );
}