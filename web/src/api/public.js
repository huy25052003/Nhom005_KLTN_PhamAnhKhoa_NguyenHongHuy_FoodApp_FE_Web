import http from "../lib/http";

export async function getFeaturedProducts(limit = 8) {
  // Đổi thành /products/public để chỉ lấy món đang hiện
  const res = await http.get("/products/public");
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
    // Search public mặc định
    const res = await http.get("/products/search", { params: { ...params, isAdmin: false } });
    return res.data?.items ?? [];
  } catch {
    return [];
  }
}

export async function getCategoryProducts(categoryId, limit = 40) {
  return getProductsPublic({ categoryId, limit });
}