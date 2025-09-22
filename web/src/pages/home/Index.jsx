import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listProducts } from "../../api/products.js";
import { getCategories } from "../../api/categories.js";
import ProductCard from "../../component/ProductCard.jsx";

const PAGE_SIZE = 12;

export default function HomeIndexPage() {
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(0);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
  });

  const { data: productsRaw, isLoading, refetch } = useQuery({
    queryKey: ["products", q, categoryId, page],
    queryFn: () =>
      listProducts({
        q: q || undefined,
        categoryId: categoryId || undefined,
        page,
        size: PAGE_SIZE,
      }),
    keepPreviousData: true,
  });

  const { items, totalPages, totalElements } = useMemo(() => {
    const d = productsRaw;
    const items = Array.isArray(d) ? d : d?.content ?? [];
    const totalPages = Array.isArray(d) ? 1 : (d?.totalPages ?? 1);
    const totalElements = Array.isArray(d) ? items.length : (d?.totalElements ?? items.length);
    return { items, totalPages, totalElements };
  }, [productsRaw]);

  useEffect(() => { setPage(0); }, [q, categoryId]);

  return (
    <div className="page">
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="home-hero">
          <h1 className="h1">Danh sách món</h1>
          <div className="home-filters">
            <input
              className="input"
              placeholder="Tìm theo tên món…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              className="input"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Tất cả danh mục</option>
              {(categories || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button className="btn" onClick={() => refetch()}>Tìm</button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="muted">Đang tải…</div>
      ) : items.length === 0 ? (
        <div className="card"><div className="muted">Không có sản phẩm phù hợp</div></div>
      ) : (
        <>
          <div className="grid3">
            {items.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn"
                      disabled={page <= 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}>
                ← Trước
              </button>
              <div>Trang {page + 1}/{totalPages} ({totalElements} sp)</div>
              <button className="btn"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
                Sau →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
