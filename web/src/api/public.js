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
