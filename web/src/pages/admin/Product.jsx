import React, { useEffect, useMemo, useState } from "react";
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../../api/products.js";
import { getCategories } from "../../api/categories.js";

const PAGE_SIZE = 12;
const formatVND = (n) => (Number(n || 0)).toLocaleString("vi-VN") + " đ";

export default function ProductPage() {
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState(""); 
  const [page, setPage] = useState(1);

  const [items, setItems] = useState([]);   
  const [cats, setCats] = useState([]);   

  const [editing, setEditing] = useState(null);  
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

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    let data = items;
    if (t) data = data.filter(p => (p.name || "").toLowerCase().includes(t));
    if (catFilter) {
      const idNum = Number(catFilter);
      data = data.filter(p =>
        (p.category && p.category.id === idNum) ||
        (p.categoryId && Number(p.categoryId) === idNum)
      );
    }
    return data;
  }, [q, catFilter, items]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function onDelete(id) {
    if (!confirm("Xoá sản phẩm này?")) return;
    try {
      await deleteProduct(id);
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Xoá thất bại");
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
        imageUrl: String(fd.get("imageUrl") || ""),
        description: String(fd.get("description") || ""),
      };
      const categoryId = Number(fd.get("categoryId") || 0);

      const payload = {
        ...base,
        ...(categoryId ? { category: { id: categoryId } } : {}),
      };

      if (!base.name) throw new Error("Tên sản phẩm bắt buộc");
      if (editing?.id) await updateProduct(editing.id, payload);
      else await createProduct(payload);

      setEditing(null);
      await load();
      form.reset();
      setPage(1);
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Lưu sản phẩm thất bại");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-products">
      <h1 className="h1">Quản lý Sản phẩm</h1>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          className="input"
          placeholder="Tìm theo tên…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
        />
        <select
          className="select"
          value={catFilter}
          onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}
        >
          <option value="">Tất cả danh mục</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button className="btn" onClick={() => setEditing({ name: "", price: 0, stock: 0 })}>
          + Thêm
        </button>
      </div>

      <div className="card" style={{ overflow: "hidden", marginTop: 12 }}>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th><th>Tên</th><th>Giá</th><th>Tồn kho</th><th>Danh mục</th><th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><div style={{ padding: 16 }}>Đang tải…</div></td></tr>
            ) : pageData.length ? pageData.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.name}</td>
                <td>{formatVND(p.price)}</td>
                <td>{p.stock ?? 0}</td>
                <td>
                  {p.category?.name ||
                    cats.find((c) => c.id === p.categoryId)?.name ||
                    p.categoryId || "-"}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="btn" onClick={() => setEditing(p)} style={{ marginRight: 8 }}>
                    Sửa
                  </button>
                  <button className="btn btn-danger" onClick={() => onDelete(p.id)}>
                    Xoá
                  </button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6}><div className="muted" style={{ padding: 16, textAlign: "center" }}>Không có dữ liệu</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination" style={{ marginTop: 8 }}>
        <button className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Trước</button>
        <span>Trang {page}/{pages}</span>
        <button className="btn" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Sau →</button>
        <span className="muted" style={{ marginLeft: "auto" }}>Tổng: {filtered.length}</span>
      </div>

      {editing && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="card-title">{editing.id ? "Sửa" : "Thêm"} sản phẩm</div>
            <form onSubmit={(e) => { e.preventDefault(); if (!saving) save(e.currentTarget); }}>
              <div className="form-grid">
                <input name="name" defaultValue={editing.name} placeholder="Tên" required className="input" />
                <input name="price" defaultValue={editing.price} placeholder="Giá" type="number" min={0} required className="input" />
                <input name="stock" defaultValue={editing.stock ?? 0} placeholder="Tồn kho" type="number" min={0} className="input" />
                <input name="imageUrl" defaultValue={editing.imageUrl || ""} placeholder="Ảnh (URL)" className="input full" />
                <input name="description" defaultValue={editing.description || ""} placeholder="Mô tả" className="input full" />
                <select
                  name="categoryId"
                  defaultValue={editing.category?.id || editing.categoryId || ""}
                  className="select full"
                >
                  <option value="">-- Chọn danh mục --</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setEditing(null)}>Huỷ</button>
                <button className="btn btn-primary" disabled={saving}>
                  {saving ? "Đang lưu..." : "Lưu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
