import React, { useEffect, useState } from "react";
import { getPromotions, createPromotion, updatePromotion, deletePromotion } from "../../api/promotions";
import { getCategories } from "../../api/categories";
import { getAllProducts } from "../../api/products";
import { FaTrash, FaEdit, FaPlus } from "react-icons/fa";

// Helper format dữ liệu ngày giờ cho input
const toInputDate = (isoString) => isoString ? isoString.slice(0, 16) : "";

const TYPES = { PERCENT: "%", FIXED: "VNĐ" };
const SCOPES = { ALL: "Toàn bộ", CATEGORY: "Theo Danh mục", PRODUCT: "Theo Sản phẩm" };

export default function AdminPromotionsPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await getPromotions();
      setList(data || []);
    } catch (e) { 
      alert("Lỗi tải dữ liệu khuyến mãi"); 
    } finally { 
      setLoading(false); 
    }
  }

  async function handleDelete(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa mã này?")) return;
    try { 
      await deletePromotion(id); 
      load(); 
    } catch (e) { 
      alert("Xóa thất bại"); 
    }
  }

  return (
    <div className="page-promotions">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="h1">Quản lý Mã giảm giá</h1>
        <button className="btn btn-primary" onClick={() => setEditing({})}>
          <FaPlus /> Thêm mã mới
        </button>
      </div>

      {editing ? (
        <PromotionForm
          initialData={editing}
          onCancel={() => setEditing(null)}
          onSuccess={() => { setEditing(null); load(); }}
        />
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Tên chương trình</th>
                <th>Giá trị</th>
                <th>Phạm vi</th>
                <th>Đơn tối thiểu</th>
                <th>Lượt dùng</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={8}>Đang tải...</td></tr> :
               list.map(p => (
                <tr key={p.id}>
                  <td><span className="badge preparing" style={{fontSize:'0.9rem'}}>{p.code}</span></td>
                  <td>{p.name}</td>
                  <td style={{fontWeight:'bold', color:'var(--primary)'}}>
                    {Number(p.value).toLocaleString()} {TYPES[p.type]}
                  </td>
                  <td>{SCOPES[p.scope]}</td>
                  <td>{Number(p.minOrderTotal || 0).toLocaleString()}đ</td>
                  <td>{p.usedCount || 0} / {p.maxUses || '∞'}</td>
                  <td>
                    {p.active ? <span className="badge delivering">Đang chạy</span> : <span className="badge cancelled">Tắt</span>}
                  </td>
                  <td>
                    <button className="btn btn-sm btn-ghost" onClick={() => setEditing(p)} title="Sửa"><FaEdit /></button>
                    <button className="btn btn-sm btn-ghost text-red" onClick={() => handleDelete(p.id)} title="Xóa"><FaTrash /></button>
                  </td>
                </tr>
              ))}
              {!loading && list.length === 0 && <tr><td colSpan={8} className="text-center muted">Chưa có mã giảm giá nào.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PromotionForm({ initialData, onCancel, onSuccess }) {
  const [cats, setCats] = useState([]);
  const [prods, setProds] = useState([]);
  
  const [form, setForm] = useState({
    // Các trường mặc định không trùng lặp
    code: "", name: "", type: "PERCENT", value: 0, minOrderTotal: 0,
    maxUses: "", active: true, scope: "ALL",
    
    // Spread dữ liệu cũ
    ...initialData,

    // Các trường cần xử lý logic (Khai báo 1 lần duy nhất ở đây)
    startAt: toInputDate(initialData.startAt),
    endAt: toInputDate(initialData.endAt),
    categoryId: initialData.category?.id || "",
    productIds: initialData.products ? initialData.products.map(p => p.id) : [],
  });
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCategories().then(setCats).catch(()=>{});
    getAllProducts().then(setProds).catch(()=>{});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        value: Number(form.value),
        minOrderTotal: Number(form.minOrderTotal),
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        startAt: form.startAt || null,
        endAt: form.endAt || null,
        categoryId: form.scope === 'CATEGORY' ? Number(form.categoryId) : null,
        productIds: form.scope === 'PRODUCT' ? form.productIds.map(Number) : [],
      };
      
      if (initialData.id) await updatePromotion(initialData.id, payload);
      else await createPromotion(payload);
      onSuccess();
    } catch (err) {
      alert(err?.response?.data?.message || "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  }

  const handleProductChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setForm({ ...form, productIds: selectedOptions });
  };

  return (
    <div className="card" style={{ maxWidth: 800, margin: '0 auto' }}>
      <h2 className="h2">{initialData.id ? "Sửa mã khuyến mãi" : "Tạo mã khuyến mãi"}</h2>
      <form onSubmit={handleSubmit} className="form-grid">
        
        {/* 1. Thông tin cơ bản */}
        <div className="field">
          <label>Mã Code (In hoa, viết liền)</label>
          <input 
            className="input" 
            value={form.code} 
            onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} 
            required 
            disabled={!!initialData.id} 
            placeholder="VD: HELLO2025" 
          />
        </div>
        <div className="field">
          <label>Tên chương trình</label>
          <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="VD: Khuyến mãi chào hè" />
        </div>
        
        {/* 2. Giá trị & Loại */}
        <div className="field">
          <label>Loại giảm giá</label>
          <select className="input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
            <option value="PERCENT">Theo Phần trăm (%)</option>
            <option value="FIXED">Số tiền cố định (VNĐ)</option>
          </select>
        </div>
        <div className="field">
          <label>Giá trị ({form.type === 'PERCENT' ? '%' : 'VNĐ'})</label>
          <input type="number" className="input" value={form.value} onChange={e => setForm({...form, value: e.target.value})} required />
        </div>

        {/* 3. Thời gian */}
        <div className="field">
          <label>Ngày bắt đầu (Bỏ trống = Ngay lập tức)</label>
          <input type="datetime-local" className="input" value={form.startAt} onChange={e => setForm({...form, startAt: e.target.value})} />
        </div>
        <div className="field">
          <label>Ngày kết thúc (Bỏ trống = Vô thời hạn)</label>
          <input type="datetime-local" className="input" value={form.endAt} onChange={e => setForm({...form, endAt: e.target.value})} />
        </div>

        {/* 4. Phạm vi áp dụng */}
        <div className="field full">
          <label>Phạm vi áp dụng</label>
          <select className="input" value={form.scope} onChange={e => setForm({...form, scope: e.target.value})}>
            <option value="ALL">Toàn bộ cửa hàng</option>
            <option value="CATEGORY">Theo Danh mục</option>
            <option value="PRODUCT">Theo Sản phẩm cụ thể</option>
          </select>
        </div>

        {form.scope === 'CATEGORY' && (
          <div className="field full">
            <label>Chọn Danh mục</label>
            <select className="input" value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})} required>
              <option value="">-- Chọn danh mục --</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}

        {form.scope === 'PRODUCT' && (
          <div className="field full">
            <label>Chọn Sản phẩm (Giữ phím Ctrl / Command để chọn nhiều)</label>
            <select 
                className="input" 
                multiple 
                value={form.productIds} 
                onChange={handleProductChange}
                style={{ height: '150px' }}
                required
            >
              {prods.map(p => (
                  <option key={p.id} value={p.id}>
                      {p.name} - {Number(p.price).toLocaleString()}đ
                  </option>
              ))}
            </select>
            <small className="muted">Đã chọn: {form.productIds.length} sản phẩm</small>
          </div>
        )}

        {/* 5. Giới hạn */}
        <div className="field">
          <label>Đơn tối thiểu (VNĐ)</label>
          <input type="number" className="input" value={form.minOrderTotal} onChange={e => setForm({...form, minOrderTotal: e.target.value})} />
        </div>
        <div className="field">
          <label>Giới hạn lượt dùng (Bỏ trống = Vô hạn)</label>
          <input type="number" className="input" value={form.maxUses} onChange={e => setForm({...form, maxUses: e.target.value})} />
        </div>

        <div className="field full flex-row gap-2" style={{ marginTop: 10 }}>
          <input 
            type="checkbox" 
            id="chkActive" 
            checked={form.active} 
            onChange={e => setForm({...form, active: e.target.checked})} 
            style={{ width: 20, height: 20 }}
          />
          <label htmlFor="chkActive" style={{ margin: 0, cursor: 'pointer', fontWeight: 600 }}>Kích hoạt chương trình này</label>
        </div>

        <div className="full modal-actions" style={{ marginTop: 20 }}>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Hủy</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu Mã"}
          </button>
        </div>
      </form>
    </div>
  );
}