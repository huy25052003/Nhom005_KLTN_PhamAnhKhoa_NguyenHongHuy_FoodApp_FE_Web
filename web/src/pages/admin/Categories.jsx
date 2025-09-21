import React, { useEffect, useMemo, useState } from "react";
import { getCategories, createCategory, updateCategory, deleteCategory } from "../../api/categories.js";

export default function CategoriesPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try { setItems(await getCategories()); }
    finally { setLoading(false); }
  }
  useEffect(()=>{ load(); }, []);

  const filtered = useMemo(()=>{
    const t = q.trim().toLowerCase();
    return t ? items.filter(c => (c.name||"").toLowerCase().includes(t)) : items;
  }, [q, items]);

  async function save(form) {
    setSaving(true);
    try {
      const fd = new FormData(form);
      const payload = { name: String(fd.get("name")||"").trim(), description: String(fd.get("description")||"") };
      if (!payload.name) { alert("Tên danh mục bắt buộc"); setSaving(false); return; }
      if (editing?.id) await updateCategory(editing.id, payload);
      else await createCategory(payload);
      setEditing(null); await load(); form.reset();
    } catch(e) { alert(e?.response?.data?.message || e?.message || "Lưu danh mục thất bại"); }
    finally { setSaving(false); }
  }

  async function onDelete(id) {
    if (!confirm("Xoá danh mục này?")) return;
    try { await deleteCategory(id); await load(); }
    catch(e){ alert(e?.response?.data?.message || e?.message || "Không thể xoá (đang được sử dụng)"); }
  }

  return (
    <div className="page-categories">
      <h1 className="h1">Quản lý Danh mục</h1>

      <div style={{ display:"flex", gap:8 }}>
        <input className="input" placeholder="Tìm theo tên..." value={q} onChange={e=>setQ(e.target.value)} />
        <button className="btn" onClick={()=> setEditing({ name:"", description:"" })}>+ Thêm</button>
      </div>

      <div className="card" style={{ overflow:"hidden", marginTop:12 }}>
        <table className="table">
          <thead><tr><th>ID</th><th>Tên</th><th>Mô tả</th><th>Thao tác</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4}><div style={{ padding:16 }}>Đang tải...</div></td></tr>
            ) : filtered.length ? filtered.map(c=>(
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.name}</td>
                <td>{c.description || "-"}</td>
                <td>
                  <button className="btn" onClick={()=> setEditing(c)} style={{ marginRight:8 }}>Sửa</button>
                  <button className="btn btn-danger" onClick={()=> onDelete(c.id)}>Xoá</button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={4}><div style={{ padding:16, textAlign:"center" }} className="muted">Không có dữ liệu</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="card-title">{editing.id ? "Sửa" : "Thêm"} danh mục</div>
            <form onSubmit={(e)=>{ e.preventDefault(); if(!saving) save(e.currentTarget); }}>
              <div className="form-grid">
                <input name="name" defaultValue={editing.name} placeholder="Tên danh mục" required className="input" />
                <input name="description" defaultValue={editing.description || ""} placeholder="Mô tả" className="input full" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={()=> setEditing(null)}>Huỷ</button>
                <button className="btn btn-primary" disabled={saving}>{saving ? "Đang lưu..." : "Lưu"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
