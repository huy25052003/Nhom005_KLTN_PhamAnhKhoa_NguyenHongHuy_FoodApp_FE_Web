import React, { useEffect, useState } from "react";
import { getProfile, updateProfile, getMe } from "../../api/users";
import EmailVerification from "../../component/EmailVerification";

export default function AccountProfilePage() {
  const [user, setUser] = useState(null);
  
  const [form, setForm] = useState({
    heightCm: "", weightKg: "", gender: "", allergies: "",
    dietaryPreference: "", targetCalories: "", activityLevel: "", birthDate: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const [profileData, userData] = await Promise.all([
          getProfile().catch(() => null),
          getMe().catch(() => null)
        ]);
        
        if (stop) return;

        if (userData) setUser(userData);

        if (profileData) {
          setForm({
            heightCm: profileData?.heightCm ?? "", weightKg: profileData?.weightKg ?? "",
            gender: profileData?.gender ?? "", allergies: profileData?.allergies ?? "",
            dietaryPreference: profileData?.dietaryPreference ?? "", targetCalories: profileData?.targetCalories ?? "",
            activityLevel: profileData?.activityLevel ?? "", birthDate: profileData?.birthDate ?? ""
          });
        }
      } catch (e) {
        console.error(e);
        alert("Không tải được hồ sơ.");
      } finally {
        if (!stop) setLoading(false);
      }
    })();
    return () => { stop = true; };
  }, []);

  const handleEmailVerified = (updatedUser) => {
    setUser(updatedUser);
  };

  function onChange(e) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        heightCm: form.heightCm === "" ? null : Number(form.heightCm),
        weightKg: form.weightKg === "" ? null : Number(form.weightKg),
        targetCalories: form.targetCalories === "" ? null : Number(form.targetCalories),
        birthDate: form.birthDate || null,
      };
      await updateProfile(payload);
      alert("Cập nhật hồ sơ thành công!");
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.error || e?.message || "Cập nhật thất bại";
      alert(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="container section">Đang tải hồ sơ…</div>;
  }

  return (
    <div className="container section fade-in">
      <h1 className="h2">Hồ sơ của tôi</h1>

      {user && (
        <EmailVerification user={user} onVerified={handleEmailVerified} />
      )}
      <div style={{ height: 24 }} /> 

      <form className="card card-hover" onSubmit={onSubmit} style={{ maxWidth: 720 }}>
        <div className="grid-2 gap-3">
          <div>
            <label className="label">Chiều cao (cm)</label>
            <input className="input" type="number" step="0.1" name="heightCm" value={form.heightCm} onChange={onChange} />
          </div>
          <div>
            <label className="label">Cân nặng (kg)</label>
            <input className="input" type="number" step="0.1" name="weightKg" value={form.weightKg} onChange={onChange} />
          </div>
          <div>
            <label className="label">Giới tính</label>
            <select className="input" name="gender" value={form.gender} onChange={onChange}>
              <option value="">-- Chọn --</option>
              <option value="MALE">Nam</option>
              <option value="FEMALE">Nữ</option>
              <option value="OTHER">Khác</option>
            </select>
          </div>
          <div>
            <label className="label">Mức hoạt động</label>
            <select className="input" name="activityLevel" value={form.activityLevel} onChange={onChange}>
              <option value="">-- Chọn --</option>
              <option value="LOW">Thấp</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HIGH">Cao</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Sở thích ăn uống</label>
            <input className="input" name="dietaryPreference" value={form.dietaryPreference} onChange={onChange} placeholder="Ít tinh bột, eat-clean..." />
          </div>
          <div className="col-span-2">
            <label className="label">Dị ứng</label>
            <input className="input" name="allergies" value={form.allergies} onChange={onChange} placeholder="Hải sản, đậu phộng..." />
          </div>
          <div>
            <label className="label">Mục tiêu calo/ngày</label>
            <input className="input" type="number" name="targetCalories" value={form.targetCalories} onChange={onChange} />
          </div>
          <div>
            <label className="label">Ngày sinh</label>
            <input className="input" type="date" name="birthDate" value={form.birthDate || ""} onChange={onChange} />
          </div>
        </div>
        <div className="mt-3">
          <button className="btn btn-primary" disabled={saving}>{saving ? "Đang lưu..." : "Lưu thay đổi"}</button>
        </div>
      </form>
    </div>
  );
}