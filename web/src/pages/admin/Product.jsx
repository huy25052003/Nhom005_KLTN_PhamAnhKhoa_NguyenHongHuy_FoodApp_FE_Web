import React, { useEffect, useMemo, useState } from "react";
import {
  getAllProducts, createProduct, updateProduct, deleteProduct, toggleProductStatus
} from "../../api/products.js";
import { getCategories } from "../../api/categories.js";
import { uploadImage } from "../../api/uploads.js"; 
import { FaEye, FaEyeSlash, FaTrash, FaEdit } from "react-icons/fa"; // Import icon
import toast from "react-hot-toast";

const PAGE_SIZE = 12;
const formatVND = (n) => (Number(n || 0)).toLocaleString("vi-VN") + " đ";

export default function ProductPage() {
  // ... (Giữ nguyên các state cũ: q, catFilter, page, items, cats, editing, imgUrl...)
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [editing, setEditing] = useState(null);
  const [imgUrl, setImgUrl] = useState("");       
  const [uploading, setUploading] = useState(false); 
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [list, categories] = await Promise.all([
        getAllProducts(),
        getCategories().catch(() => []),
      ]);
      setItems(Array.isArray(list) ? list : []);
      setCats(Array.isArray(categories) ? categories : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // ... (Giữ nguyên useEffect editing, filtered, pages, pageData)
  useEffect(() => {
    if (editing) setImgUrl(editing.imageUrl || "");
    else setImgUrl("");
  }, [editing]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    let data = items;
    if (t) data = data.filter(p => (p.name || "").toLowerCase().includes(t));
    if (catFilter) {
      const idNum = Number(catFilter);
      data = data.filter(p => (p.category && p.category.id === idNum) || (p.categoryId && Number(p.categoryId) === idNum));
    }
    return data;
  }, [q, catFilter, items]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // --- HÀM MỚI: TOGGLE ---
  async function onToggle(p) {
    try {
      await toggleProductStatus(p.id);
      toast.success(p.active ? "Đã ẩn sản phẩm" : "Đã hiện sản phẩm");
      // Cập nhật UI ngay lập tức (Optimistic update)
      setItems(prev => prev.map(it => it.id === p.id ? { ...it, active: !it.active } : it));
    } catch (e) {
      toast.error("Lỗi cập nhật trạng thái");
    }
  }

  async function onDelete(id) {
    if (!confirm("Bạn muốn ẩn sản phẩm này vào thùng rác?")) return; // Đổi text cho phù hợp
    try {
      await deleteProduct(id);
      toast.success("Đã chuyển vào sản phẩm ẩn");
      setItems(prev => prev.map(it => it.id === id ? { ...it, active: false } : it));
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Thao tác thất bại");
    }
  }

  async function save(form) {
    setSaving(true);
    try {
      const fd = new FormData(form);
      const base = {
        name: String(fd.get("name") || "").trim(),
        price: Number(fd.get("price") || 0),
        stock: Math.max(0, Number(fd.get("stock") || 0)),
        imageUrl: String(imgUrl || ""),
        description: String(fd.get("description") || ""),
        active: true // Mặc định true khi tạo/sửa
      };
      const categoryId = Number(fd.get("categoryId") || 0);
      const payload = { ...base, ...(categoryId ? { category: { id: categoryId } } : {}) };

      if (!base.name) throw new Error("Tên sản phẩm bắt buộc");
      if (editing?.id) {
          // Giữ nguyên trạng thái active cũ nếu đang sửa
          payload.active = editing.active; 
          await updateProduct(editing.id, payload);
      } else {
          await createProduct(payload);
      }

      setEditing(null);
      await load();
      form.reset();
      if(!editing) setPage(1);
      toast.success("Lưu thành công");
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  }

  // ... (Giữ nguyên hàm onPickFile)
  async function onPickFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadImage(file); 
      if (!url) throw new Error("Không nhận được URL ảnh.");
      setImgUrl(url);
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Upload ảnh thất bại");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="page-products fade-in">
      <div className="flex-row space-between mb-4">
        <h1 className="h1" style={{margin:0}}>Quản lý Sản phẩm</h1>
        <button className="btn btn-primary" onClick={() => setEditing({ name: "", price: 0, stock: 0 })}>
          + Thêm món mới
        </button>
      </div>

      <div className="card mb-3 p-3">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <input className="input" placeholder="Tìm theo tên…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} style={{maxWidth: 300}} />
            <select className="select" value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setPage(1); }} style={{maxWidth: 200}}>
            <option value="">Tất cả danh mục</option>
            {cats.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden", padding: 0 }}>
        <div className="table-responsive">
            <table className="table">
            <thead>
                <tr>
                <th>ID</th><th>Ảnh</th><th>Tên</th><th>Giá</th><th>Kho</th><th>Trạng thái</th><th className="text-right">Thao tác</th>
                </tr>
            </thead>
            <tbody>
                {loading ? (
                <tr><td colSpan={7} className="p-4 text-center"><div className="loading"></div></td></tr>
                ) : pageData.length ? pageData.map((p) => (
                <tr key={p.id} style={{ opacity: p.active ? 1 : 0.5, background: p.active ? 'transparent' : '#f9fafb' }}>
                    <td>#{p.id}</td>
                    <td>
                        <img src={p.imageUrl || "/placeholder.jpg"} alt="" style={{width:40, height:40, borderRadius:6, objectFit:'cover'}} />
                    </td>
                    <td style={{fontWeight: 600}}>{p.name}</td>
                    <td>{formatVND(p.price)}</td>
                    <td style={{color: p.stock < 10 ? 'red' : 'inherit'}}>{p.stock}</td>
                    <td>
                        <button onClick={() => onToggle(p)} className="btn-ghost" style={{border:'none', cursor:'pointer'}} title="Nhấn để ẩn/hiện">
                            {p.active ? <span className="badge delivering">Đang bán</span> : <span className="badge cancelled">Đã ẩn</span>}
                        </button>
                    </td>
                    <td className="text-right">
                        <button className="btn btn-sm btn-ghost" onClick={() => onToggle(p)} title={p.active ? "Ẩn" : "Hiện"}>
                            {p.active ? <FaEye /> : <FaEyeSlash />}
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={() => setEditing(p)} title="Sửa"><FaEdit /></button>
                        <button className="btn btn-sm btn-ghost text-red" onClick={() => onDelete(p.id)} title="Xóa (Ẩn)"><FaTrash /></button>
                    </td>
                </tr>
                )) : (
                <tr><td colSpan={7}><div className="muted text-center p-4">Không có dữ liệu</div></td></tr>
                )}
            </tbody>
            </table>
        </div>
      </div>

      {/* ... (Phần Pagination và Modal Form giữ nguyên, chỉ update UI nếu cần) ... */}
      <div className="pagination mt-3 justify-end">
        <button className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>←</button>
        <span className="mx-2" style={{alignSelf:'center'}}>Trang {page}/{pages}</span>
        <button className="btn" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>→</button>
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={(e)=>{if(e.target===e.currentTarget) setEditing(null)}}>
          <div className="modal">
            <div className="card-title">{editing.id ? "Sửa sản phẩm" : "Thêm sản phẩm"}</div>
            <form onSubmit={(e) => { e.preventDefault(); if (!saving) save(e.currentTarget); }}>
               {/* ... (Form content giữ nguyên như cũ) ... */}
               <div className="form-grid">
                    <div className="full">
                        <label className="label">Tên sản phẩm</label>
                        <input name="name" defaultValue={editing.name} required className="input" />
                    </div>
                    <div>
                        <label className="label">Giá bán</label>
                        <input name="price" defaultValue={editing.price} type="number" min={0} required className="input" />
                    </div>
                    <div>
                        <label className="label">Tồn kho</label>
                        <input name="stock" defaultValue={editing.stock ?? 0} type="number" min={0} className="input" />
                    </div>
                    
                    {/* Image Upload UI */}
                    <div className="full">
                        <label className="label">Hình ảnh</label>
                        <div className="flex-row gap-2">
                            <input name="imageUrl" className="input" value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} placeholder="URL ảnh" style={{flex:1}} />
                            <label className={`btn ${uploading ? "btn-disabled" : "btn-outline"}`}>
                                {uploading ? "..." : "Upload"}
                                <input type="file" accept="image/*" onChange={onPickFile} hidden />
                            </label>
                        </div>
                        {imgUrl && <img src={imgUrl} alt="Preview" style={{marginTop:8, height: 100, borderRadius: 8, border:'1px solid #eee'}} />}
                    </div>

                    <div className="full">
                        <label className="label">Danh mục</label>
                        <select name="categoryId" defaultValue={editing.category?.id || editing.categoryId || ""} className="select">
                            <option value="">-- Chọn danh mục --</option>
                            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="full">
                        <label className="label">Mô tả</label>
                        <textarea name="description" defaultValue={editing.description || ""} rows={3} className="input" />
                    </div>
               </div>

               <div className="modal-actions mt-4">
                  <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Hủy</button>
                  <button className="btn btn-primary" disabled={saving}>{saving ? "Đang lưu..." : "Lưu sản phẩm"}</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}