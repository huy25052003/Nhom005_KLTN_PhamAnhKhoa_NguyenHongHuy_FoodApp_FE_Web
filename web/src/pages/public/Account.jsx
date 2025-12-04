import React, { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import { getProfile, updateProfile, getMe } from "../../api/users";
import { getMyShipping, upsertMyShipping } from "../../api/shipping";
import PhoneVerifyModal from "../../component/PhoneVerifyModal";
import EmailVerifyModal from "../../component/EmailVerifyModal";
import { 
  FaUser, FaHeartbeat, FaMapMarkedAlt, FaSave, 
  FaMars, FaVenus, FaCalculator, FaBullseye 
} from "react-icons/fa";

const API_HOST = "https://esgoo.net/api-tinhthanh-new";

export default function AccountProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);

  const [form, setForm] = useState({
    // Profile (Đã bỏ diet/allergies)
    fullName: "", 
    birthDate: "", 
    gender: "MALE",
    heightCm: "", 
    weightKg: "", 
    activityLevel: "MODERATE",
    goal: "MAINTAIN", // Mặc định giữ cân
    targetCalories: "", 
    phone: "",
    // Shipping
    shippingPhone: "", pId: "", wId: "", houseNumber: "", note: ""
  });

  // --- TÍNH TDEE HIỂN THỊ ---
  const estimatedTDEE = useMemo(() => {
    const { heightCm, weightKg, birthDate, gender, activityLevel, goal } = form;
    if (!heightCm || !weightKg || !birthDate) return 0;

    const h = Number(heightCm);
    const w = Number(weightKg);
    const age = new Date().getFullYear() - new Date(birthDate).getFullYear();
    
    let bmr = (10 * w) + (6.25 * h) - (5 * age);
    bmr += (gender === "MALE" ? 5 : -161);

    const multipliers = { "SEDENTARY": 1.2, "LIGHT": 1.375, "MODERATE": 1.55, "ACTIVE": 1.725 };
    const maintenance = Math.round(bmr * (multipliers[activityLevel] || 1.2));

    if (goal === "LOSE") return Math.max(1200, maintenance - 500);
    if (goal === "GAIN") return maintenance + 500;
    return maintenance;
  }, [form.heightCm, form.weightKg, form.birthDate, form.gender, form.activityLevel, form.goal]);

  // Load Data
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
            setForm(prev => ({ ...prev, phone: userData.phone || shipping?.phone || "" }));
        }

        setForm(prev => ({
            ...prev,
            fullName: profile?.fullName || "",
            birthDate: profile?.birthDate || "",
            gender: profile?.gender || "MALE",
            heightCm: profile?.heightCm || "",
            weightKg: profile?.weightKg || "",
            activityLevel: profile?.activityLevel || "MODERATE",
            goal: profile?.goal || "MAINTAIN",
            targetCalories: profile?.targetCalories || "",
            
            shippingPhone: shipping?.phone || userData?.phone || "",
            houseNumber: shipping?.addressLine || "", 
            note: shipping?.note || ""
        }));
      } catch (e) { toast.error("Lỗi tải dữ liệu"); } 
      finally { setLoading(false); }
    })();
  }, []);

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
      // Update profile (chỉ gửi các trường cần thiết)
      await updateProfile({
        fullName: form.fullName, birthDate: form.birthDate, gender: form.gender,
        heightCm: Number(form.heightCm)||null, weightKg: Number(form.weightKg)||null,
        activityLevel: form.activityLevel, 
        goal: form.goal,
        targetCalories: Number(form.targetCalories)||null,
      });

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
      
      {/* Header */}
      <div className="flex-row space-between align-center mb-4">
         <div>
            <h1 className="h2" style={{margin:0, color: 'var(--text)'}}>Hồ sơ cá nhân</h1>
            <p className="muted" style={{margin:0}}>Cập nhật thông tin để nhận gợi ý thực đơn chuẩn xác.</p>
         </div>
         <button onClick={onSubmit} className="btn btn-primary shadow-md">
            <FaSave /> Lưu thay đổi
         </button>
      </div>

      <div className="grid-2x2-balanced" style={{alignItems: 'start'}}>
        
        {/* CỘT TRÁI: TÀI KHOẢN & GIAO HÀNG */}
        <div className="vstack gap-3">
            <div className="profile-card">
                <h3 className="flex-row gap-2"><FaUser className="text-blue-600"/> Thông tin tài khoản</h3>
                
                <div className="field mb-3">
                    <label className="label">Email</label>
                    <div className="input-group">
                        <input className="input" value={user?.email} disabled />
                        {user?.isEmailVerified ? 
                           <span className="addon success">✓ Verified</span> : 
                           <button onClick={()=>setEmailModalOpen(true)} className="addon btn-warning">Verify</button>
                        }
                    </div>
                </div>

                <div className="field mb-3">
                    <label className="label">Số điện thoại</label>
                    <div className="input-group">
                        <input className="input" value={form.phone} disabled placeholder="Chưa có SĐT" />
                        {user?.isPhoneVerified ? 
                           <span className="addon success">✓ Verified</span> : 
                           <button onClick={()=>setPhoneModalOpen(true)} className="addon btn-primary">Verify</button>
                        }
                    </div>
                </div>

                <div className="field">
                    <label className="label">Họ tên hiển thị</label>
                    <input className="input" name="fullName" value={form.fullName} onChange={onChange} placeholder="Nhập tên của bạn..." />
                </div>
            </div>

            <div className="profile-card">
                <h3 className="flex-row gap-2"><FaMapMarkedAlt className="text-orange-600"/> Địa chỉ giao hàng</h3>
                <div className="field mb-3">
                    <label className="label">SĐT Nhận hàng</label>
                    <input className="input" name="shippingPhone" value={form.shippingPhone} onChange={onChange} />
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
                    <textarea className="input" rows="2" name="houseNumber" value={form.houseNumber} onChange={onChange} placeholder="VD: 123 Nguyễn Huệ..." />
                </div>
            </div>
        </div>

        {/* CỘT PHẢI: HỒ SƠ SỨC KHỎE & MỤC TIÊU (TDEE) */}
        <div className="profile-card" style={{borderTop: '4px solid #10b981'}}>
            <h3 className="flex-row gap-2 mb-4"><FaHeartbeat className="text-red-500"/> Chỉ số Sức khỏe</h3>
            
            <div className="grid2 mb-3">
                <div className="field">
                    <label className="label">Ngày sinh</label>
                    <input type="date" className="input" name="birthDate" value={form.birthDate} onChange={onChange} />
                </div>
                <div className="field">
                    <label className="label">Giới tính</label>
                    <div className="flex-row gap-4 mt-2">
                        <label className="flex-row gap-2 cursor-pointer">
                            <input type="radio" name="gender" value="MALE" checked={form.gender === 'MALE'} onChange={onChange} />
                            <span className="flex-row gap-1"><FaMars color="#3b82f6"/> Nam</span>
                        </label>
                        <label className="flex-row gap-2 cursor-pointer">
                            <input type="radio" name="gender" value="FEMALE" checked={form.gender === 'FEMALE'} onChange={onChange} />
                            <span className="flex-row gap-1"><FaVenus color="#ec4899"/> Nữ</span>
                        </label>
                    </div>
                </div>
            </div>

            <div className="grid2 mb-3">
                <div className="field">
                    <label className="label">Chiều cao (cm)</label>
                    <input type="number" className="input" name="heightCm" value={form.heightCm} onChange={onChange} placeholder="VD: 170" />
                </div>
                <div className="field">
                    <label className="label">Cân nặng (kg)</label>
                    <input type="number" className="input" name="weightKg" value={form.weightKg} onChange={onChange} placeholder="VD: 65" />
                </div>
            </div>

            <div className="grid2 mb-4">
                <div className="field">
                    <label className="label">Mức độ vận động</label>
                    <select className="select" name="activityLevel" value={form.activityLevel} onChange={onChange}>
                        <option value="SEDENTARY">Ít vận động</option>
                        <option value="LIGHT">Nhẹ (1-3 buổi/tuần)</option>
                        <option value="MODERATE">Vừa (3-5 buổi/tuần)</option>
                        <option value="ACTIVE">Năng động (6-7 buổi)</option>
                    </select>
                </div>
                
                <div className="field">
                    <label className="label flex-row gap-1"><FaBullseye color="#e11d48"/> Mục tiêu</label>
                    <select className="select" name="goal" value={form.goal} onChange={onChange} 
                        style={{borderColor: form.goal === 'MAINTAIN' ? '#e5e7eb' : (form.goal === 'LOSE' ? '#22c55e' : '#f59e0b'), borderWidth: 2}}>
                        <option value="LOSE">📉 Giảm cân</option>
                        <option value="MAINTAIN">⚖️ Giữ cân</option>
                        <option value="GAIN">📈 Tăng cân</option>
                    </select>
                </div>
            </div>

            {/* Box TDEE Calculator */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-4 text-center">
                <div className="text-sm text-green-800 font-bold flex-row justify-center gap-2">
                    <FaCalculator /> Nhu cầu Calo khuyến nghị
                </div>
                <div className="text-3xl font-black text-green-600 my-2">
                    {estimatedTDEE > 0 ? estimatedTDEE : "--"} <span className="text-sm font-normal text-gray-500">kcal/ngày</span>
                </div>
                <div className="text-xs text-gray-500 italic">
                    {form.goal === "LOSE" && "*Đã trừ 500 kcal để giảm cân an toàn."}
                    {form.goal === "GAIN" && "*Đã cộng 500 kcal để tăng cân hiệu quả."}
                    {form.goal === "MAINTAIN" && "*Mức năng lượng để duy trì cân nặng."}
                </div>
            </div>
            
            <div className="field">
                <label className="label">Target Calories / ngày (Tùy chỉnh)</label>
                <input 
                    type="number" 
                    className="input" 
                    name="targetCalories" 
                    value={form.targetCalories} 
                    onChange={onChange} 
                    placeholder={`Mặc định: ${estimatedTDEE || 2000}`} 
                />
            </div>
        </div>
      </div>

      <PhoneVerifyModal isOpen={phoneModalOpen} onClose={() => setPhoneModalOpen(false)} phoneNumber={form.phone} onSuccess={(u)=>{setUser(u); setForm(p=>({...p, phone: u.phone}))}} />
      <EmailVerifyModal isOpen={emailModalOpen} onClose={() => setEmailModalOpen(false)} email={user?.email} onSuccess={(u)=>setUser(u)} />
    </div>
  );
}