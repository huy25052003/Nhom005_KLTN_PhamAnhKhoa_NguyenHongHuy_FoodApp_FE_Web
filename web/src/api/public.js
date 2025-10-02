import http from "../lib/http";

export async function getFeaturedProducts(limit = 8) {
  const res = await http.get("/products");
  const list = Array.isArray(res.data) ? res.data : [];
  return list.slice(0, limit);
}

export async function getCategoriesPublic(limit = 6) {
  const res = await http.get("/categories");
  const list = Array.isArray(res.data) ? res.data : [];
  return list.slice(0, limit);
}

export async function getProductsPublic(params = {}) {
  try {
    const res = await http.get("public/products", { params });
    return res.data?.content ?? res.data ?? [];
  } catch {
    const all = await http.get("products");
    let data = all.data ?? [];
    if (params.categoryId) {
      const idNum = Number(params.categoryId);
      data = data.filter(
        (p) =>
          (p.category && p.category.id === idNum) ||
          (p.categoryId && Number(p.categoryId) === idNum)
      );
    }
    return data;
  }
}

export async function getCategoryProducts(categoryId, limit = 40) {
  return getProductsPublic({ categoryId, size: limit });
}