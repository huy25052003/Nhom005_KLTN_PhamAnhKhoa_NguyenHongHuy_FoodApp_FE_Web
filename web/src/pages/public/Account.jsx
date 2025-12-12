import React, { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import { getProfile, updateProfile, getMe } from "../../api/users";
import { getMyShipping, upsertMyShipping } from "../../api/shipping";
import PhoneVerifyModal from "../../component/PhoneVerifyModal";
import EmailVerifyModal from "../../component/EmailVerifyModal";
import dayjs from "dayjs";
import { 
  FaUser, FaHeartbeat, FaMapMarkedAlt, FaSave, 
  FaCalculator, FaCrown
} from "react-icons/fa";

const API_HOST = "https://esgoo.net/api-tinhthanh-new";
const PHONE_REGEX = /^(03|05|07|08|09)\d{8}$/;

const numOrNull = (v) => {
    const s = String(v).trim();
    if (s === "") return null;
    const num = Number(s);
    return isNaN(num) ? null : num;
};

const strOrNull = (s) => (s && s.trim() ? s.trim() : null);

export default function AccountProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);

  const [form, setForm] = useState({
    fullName: "", birthDate: "", gender: "MALE",
    heightCm: "", weightKg: "", activityLevel: "MODERATE",
    goal: "MAINTAIN", targetCalories: "", 
    phone: "", email: "", 
    shippingPhone: "", pId: "", wId: "", houseNumber: "", note: ""
  });

  const points = user?.points || 0;
  let rank = "Thành viên Mới";
  let nextRank = "Bạc";
  let progress = Math.min(100, (points / 100) * 100);
  
  let rankClass = "rank-bronze"; 
  let icon = "🌱";
  let benefit = "Giảm 1% đơn hàng";

  if (points >= 2000) {
      rank = "Kim Cương"; nextRank = "Max"; progress = 100;
      rankClass = "rank-diamond"; icon = "💎";
      benefit = "Giảm 8% đơn hàng";
  } else if (points >= 500) {
      rank = "Vàng"; nextRank = "Kim Cương";
      progress = ((points - 500) / 1500) * 100;
      rankClass = "rank-gold"; icon = "🥇";
      benefit = "Giảm 5% đơn hàng";
  } else if (points >= 100) {
      rank = "Bạc"; nextRank = "Vàng";
      progress = ((points - 100) / 400) * 100;
      rankClass = "rank-silver"; icon = "🥈";
      benefit = "Giảm 3% đơn hàng";
  }

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
            setForm(prev => ({ 
                ...prev, 
                phone: userData.phone || shipping?.phone || "",
                email: userData.email || ""
            }));
        }

        let initialPId = "";
        let initialWId = "";
        
        if (shipping?.city) {
            const province = provRes.data?.find(p => p.full_name === shipping.city);
            if(province) initialPId = province.id;
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
            houseNumber: shipping?.addressLine?.split(',')[0]?.trim() || "", 
            pId: initialPId,
            wId: initialWId,
            note: shipping?.note || ""
        }));

        if(initialPId && shipping?.addressLine) {
            fetch(`${API_HOST}/2/${initialPId}.htm`).then(r => r.json()).then(res => {
                const parts = shipping.addressLine.split(',').map(p => p.trim());
                if(parts.length >= 2) {
                    const wardName = parts[parts.length - 2];
                    const ward = res.data?.find(w => w.full_name === wardName);
                    if(ward) setForm(prev => ({...prev, wId: ward.id}));
                }
            });
        }

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

  const onSaveAccountInfo = async () => {
    const loadId = toast.loading("Đang lưu Thông tin Tài khoản...");
    try {
      const profilePayload = {
        fullName: strOrNull(form.fullName),
      };

      await updateProfile(profilePayload);
      toast.success("Cập nhật Thông tin Tài khoản thành công!", { id: loadId });

    } catch (e) { 
        toast.error(e?.response?.data?.message || "Lỗi lưu Thông tin Tài khoản", { id: loadId }); 
    }
  };

  const onSaveHealth = async () => {
    if (form.birthDate) {
        const today = dayjs().format('YYYY-MM-DD');
        if (form.birthDate > today) {
            toast.error("Ngày sinh không thể là ngày trong tương lai.");
            const bdInput = document.querySelector('input[name="birthDate"]');
            if(bdInput) bdInput.focus();
            return; 
        }
    }
    
    const loadId = toast.loading("Đang lưu Hồ sơ & Sức khỏe...");
    try {
      const profilePayload = {
        birthDate: strOrNull(form.birthDate),
        gender: strOrNull(form.gender),
        activityLevel: strOrNull(form.activityLevel),
        goal: strOrNull(form.goal),
        
        heightCm: numOrNull(form.heightCm),
        weightKg: numOrNull(form.weightKg),
        targetCalories: numOrNull(form.targetCalories),
      };

      await updateProfile(profilePayload);
      toast.success("Cập nhật Hồ sơ & Sức khỏe thành công!", { id: loadId });

    } catch (e) { 
        toast.error(e?.response?.data?.message || "Lỗi lưu Hồ sơ & Sức khỏe", { id: loadId }); 
    }
  };

  const onSaveShipping = async () => {
    const pName = provinces.find(p => p.id === form.pId)?.full_name;
    const wName = wards.find(w => w.id === form.wId)?.full_name;
    const shippingPhone = strOrNull(form.shippingPhone);
    const houseNumber = strOrNull(form.houseNumber);

    if (!shippingPhone || !houseNumber || !form.pId || !form.wId || !pName || !wName) {
        toast.error("Vui lòng điền đủ SĐT nhận hàng, Số nhà, Tỉnh/Thành phố và Phường/Xã.");
        return;
    }
    if (!PHONE_REGEX.test(shippingPhone)) {
        toast.error("Số điện thoại nhận hàng không hợp lệ (10 số, bắt đầu bằng 0).");
        return;
    }

    const loadId = toast.loading("Đang lưu Địa chỉ giao hàng...");
    try {
        const fullAddress = `${houseNumber}, ${wName}, ${pName}`;
        
        await upsertMyShipping({
            phone: shippingPhone,
            addressLine: fullAddress,
            city: pName,
            note: strOrNull(form.note)
        });
        
        toast.success("Cập nhật Địa chỉ giao hàng thành công!", { id: loadId });
    } catch (e) {
        toast.error(e?.response?.data?.message || "Lỗi lưu Địa chỉ giao hàng", { id: loadId });
    }
  };

  if (loading) return <div className="container section text-center"><div className="loading"></div></div>;

  return (
    <div className="profile-container fade-in">
      
      <div className="flex-row space-between align-center mb-4">
         <div>
            <h1 className="h2" style={{margin:0, color: 'var(--text)'}}>Hồ sơ cá nhân</h1>
            <p className="muted" style={{margin:0}}>Cập nhật thông tin để nhận gợi ý thực đơn chuẩn xác.</p>
         </div>
      </div>

      <div className={`membership-card ${rankClass}`}>
          <div className="card-bg-icon"><FaCrown /></div>
          <div className="card-content">
              <div className="card-left">
                  <div className="card-label">Thẻ thành viên FoodApp</div>
                  <div className="card-rank">
                      <span className="rank-icon" style={{marginRight: 8}}>{icon}</span> 
                      {rank}
                  </div>
                  <div className="card-points"><span className="points-num">{points}</span> điểm</div>
              </div>
              <div className="card-right">
                  <div className="progress-label">{nextRank !== "Max" ? `Tiến độ lên ${nextRank}` : "Đẳng cấp cao nhất"}</div>
                  <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${progress}%` }}></div></div>
              </div>
          </div>
      </div>

      <div className="grid-2x2-balanced" style={{alignItems: 'start', gap: '24px'}}>
        
        <div className="vstack gap-3">
            <div className="profile-card">
                <h3 className="flex-row gap-2 mb-3"><FaUser className="text-blue-600"/> Thông tin tài khoản</h3>
                
                <div className="grid2 mb-2">
                    <div className="field">
                        <label className="label">Email</label>
                        <div className="input-group">
                            <input className="input" name="email" value={form.email} onChange={onChange} disabled={user?.isEmailVerified} placeholder="Nhập email..." />
                            {!user?.isEmailVerified && <button onClick={()=>setEmailModalOpen(true)} className="addon btn-warning">Verify</button>}
                        </div>
                    </div>
                    <div className="field">
                        <label className="label">Số điện thoại</label>
                        <div className="input-group">
                            <input className="input" name="phone" value={form.phone} onChange={onChange} disabled={user?.isPhoneVerified} placeholder="09..." />
                            {!user?.isPhoneVerified && <button onClick={()=>setPhoneModalOpen(true)} className="addon btn-primary">Verify</button>}
                        </div>
                    </div>
                </div>

                <div className="field">
                    <label className="label">Họ tên hiển thị</label>
                    <input className="input" name="fullName" value={form.fullName} onChange={onChange} placeholder="Tên hiển thị..." />
                </div>
                
                <button onClick={onSaveAccountInfo} className="btn btn-primary w-full" style={{marginTop: 16, gridColumn: '1 / -1'}}>
                    <FaSave /> Lưu Thông tin Tài khoản
                </button>
            </div>

            <div className="profile-card">
                <h3 className="flex-row gap-2 mb-3"><FaMapMarkedAlt className="text-orange-600"/> Địa chỉ mặc định</h3>
                
                <div className="grid2 mb-2">
                    <div className="field">
                        <label className="label">SĐT Nhận hàng</label>
                        <input className="input" name="shippingPhone" value={form.shippingPhone} onChange={onChange} placeholder="SĐT người nhận" />
                    </div>
                    <div className="field">
                        <label className="label">Tỉnh / Thành phố</label>
                        <select className="select" name="pId" value={form.pId} onChange={onChange}>
                            <option value="">-- Chọn Tỉnh --</option>
                            {provinces.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid2">
                    <div className="field">
                        <label className="label">Phường / Xã</label>
                        <select className="select" name="wId" value={form.wId} onChange={onChange} disabled={!form.pId}>
                            <option value="">-- Chọn Phường --</option>
                            {wards.map(w => <option key={w.id} value={w.id}>{w.full_name}</option>)}
                        </select>
                    </div>
                    <div className="field">
                        <label className="label">Số nhà, Tên đường</label>
                        <input className="input" name="houseNumber" value={form.houseNumber} onChange={onChange} placeholder="Số nhà, đường..." />
                    </div>
                </div>
                
                <div className="field full" style={{marginTop: 16}}>
                    <label className="label">Ghi chú</label>
                    <textarea className="input" name="note" value={form.note} onChange={onChange} rows={2} placeholder="Ví dụ: Giao giờ hành chính, không gọi điện..." />
                </div>

                <button onClick={onSaveShipping} className="btn btn-primary w-full" style={{marginTop: 16, gridColumn: '1 / -1'}}>
                    <FaSave /> Lưu Địa chỉ Giao hàng
                </button>
            </div>
        </div>

        <div className="profile-card" style={{borderTop: '4px solid #10b981'}}>
            <h3 className="flex-row gap-2 mb-4"><FaHeartbeat className="text-red-500"/> Chỉ số Sức khỏe</h3>
            
            <div className="grid2 mb-3">
                <div className="field">
                    <label className="label">Ngày sinh</label>
                    <input type="date" className="input" name="birthDate" value={form.birthDate} onChange={onChange} />
                </div>
                <div className="field">
                    <label className="label">Giới tính</label>
                    <div className="flex-row gap-4 mt-2 h-full align-center">
                        <label className="flex-row gap-2 cursor-pointer">
                            <input type="radio" name="gender" value="MALE" checked={form.gender === 'MALE'} onChange={onChange} /> Nam
                        </label>
                        <label className="flex-row gap-2 cursor-pointer">
                            <input type="radio" name="gender" value="FEMALE" checked={form.gender === 'FEMALE'} onChange={onChange} /> Nữ
                        </label>
                    </div>
                </div>
            </div>

            <div className="grid2 mb-3">
                <div className="field">
                    <label className="label">Chiều cao (cm)</label>
                    <input type="number" className="input" name="heightCm" value={form.heightCm} onChange={onChange} placeholder="170" />
                </div>
                <div className="field">
                    <label className="label">Cân nặng (kg)</label>
                    <input type="number" className="input" name="weightKg" value={form.weightKg} onChange={onChange} placeholder="65" />
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
                    <label className="label">Mục tiêu</label>
                    <select className="select" name="goal" value={form.goal} onChange={onChange} 
                        style={{borderColor: form.goal === 'MAINTAIN' ? '#e5e7eb' : (form.goal === 'LOSE' ? '#22c55e' : '#f59e0b')}}>
                        <option value="LOSE">📉 Giảm cân</option>
                        <option value="MAINTAIN">⚖️ Giữ cân</option>
                        <option value="GAIN">📈 Tăng cân</option>
                    </select>
                </div>
            </div>

            <div className="bg-green-50 p-3 rounded-lg border border-green-200 mb-4 text-center">
                <div className="text-sm text-green-800 font-bold flex-row justify-center gap-2">
                    <FaCalculator /> Nhu cầu Calo/ngày
                </div>
                <div className="text-3xl font-black text-green-600 my-1">
                    {estimatedTDEE > 0 ? estimatedTDEE : "--"} <span className="text-sm font-normal text-gray-500">kcal</span>
                </div>
            </div>
            
            <div className="field">
                <label className="label">Target Calories (Tùy chỉnh)</label>
                <input type="number" className="input" name="targetCalories" value={form.targetCalories} onChange={onChange} placeholder={`Mặc định: ${estimatedTDEE || 2000}`} />
            </div>

            <button onClick={onSaveHealth} className="btn btn-primary w-full" style={{marginTop: 16}}>
                <FaSave /> Lưu Hồ sơ & Sức khỏe
            </button>
        </div>
      </div>

      <PhoneVerifyModal isOpen={phoneModalOpen} onClose={() => setPhoneModalOpen(false)} phoneNumber={form.phone} onSuccess={(u)=>{ setUser(u); setForm(p=>({...p, phone: u.phone})); }} />
      <EmailVerifyModal isOpen={emailModalOpen} onClose={() => setEmailModalOpen(false)} email={form.email} onSuccess={(u)=>{ setUser(u); setForm(p=>({...p, email: u.email})); }} />
    </div>
  );
}