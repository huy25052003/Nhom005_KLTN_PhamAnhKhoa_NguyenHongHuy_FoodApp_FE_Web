import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getProfile, updateProfile, getMe } from "../../api/users";
import PhoneVerifyModal from "../../component/PhoneVerifyModal";

export default function AccountProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  
  const [form, setForm] = useState({
    heightCm: "", weightKg: "", gender: "", allergies: "",
    dietaryPreference: "", targetCalories: "", activityLevel: "", birthDate: "",
    phone: "" 
  });

  useEffect(() => {
    (async () => {
      try {
        const [profileData, userData] = await Promise.all([
          getProfile().catch(() => null),
          getMe().catch(() => null)
        ]);

        if (userData) {
            setUser(userData);
            if(userData.phone) setForm(s => ({...s, phone: userData.phone}));
        }
        if (profileData) {
            // Map profile data vào form...
            setForm(prev => ({ ...prev, ...profileData })); // (Viết gọn)
        }
      } catch (e) {
        toast.error("Lỗi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function onChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function onSubmit(e) {
    e.preventDefault();
    const loadId = toast.loading("Đang lưu...");
    try {
      await updateProfile(form); // Gửi form cập nhật profile
      toast.success("Đã lưu", { id: loadId });
    } catch (e) {
      toast.error("Lỗi lưu", { id: loadId });
    }
  }

  const onVerifySuccess = (updatedUser) => {
    setUser(updatedUser);
    setForm(prev => ({ ...prev, phone: updatedUser.phone }));
  };

  if (loading) return <div className="container section"><div className="loading"></div></div>;

  return (
    <div className="container section fade-in">
      <h1 className="h2">Hồ sơ của tôi</h1>

      <form className="card" onSubmit={onSubmit} style={{ maxWidth: 800 }}>
        <div className="form-grid">
            <div className="full mb-4">
                <h3 className="h5 border-bottom pb-2 mb-3">Tài khoản</h3>
                <div className="grid2">
                    <div><label className="label">Username</label><input className="input bg-gray-100" value={user?.username} disabled /></div>
                    <div><label className="label">Email</label><input className="input bg-gray-100" value={user?.email} disabled /></div>
                </div>
                
                {/* PHẦN SỐ ĐIỆN THOẠI */}
                <div style={{marginTop: 12}}>
                    <label className="label">Số điện thoại</label>
                    <div className="flex-row gap-2">
                        <input 
                            className={`input ${user?.isPhoneVerified ? "text-green-600 fw-bold" : ""}`}
                            name="phone"
                            value={form.phone}
                            onChange={onChange}
                            placeholder="09..."
                        />
                        {user?.isPhoneVerified && user.phone === form.phone ? (
                            <button type="button" className="btn btn-outline text-green-600" disabled>✓ Đã xác thực</button>
                        ) : (
                            <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>Xác thực</button>
                        )}
                    </div>
                </div>
            </div>

            {/* PHẦN PROFILE (Chiều cao, cân nặng...) - Giữ nguyên code cũ của bạn */}
            {/* ... */}
        </div>

        <div className="mt-4 pt-3 border-top flex-row justify-end">
          <button className="btn btn-primary" type="submit">Lưu thay đổi</button>
        </div>
      </form>
      
      <PhoneVerifyModal 
         isOpen={modalOpen} 
         onClose={() => setModalOpen(false)} 
         phoneNumber={form.phone}
         onSuccess={onVerifySuccess}
      />
    </div>
  );
}