import http from "../lib/http";

export async function getAllProducts() {
  const res = await http.get("/products");
  return res.data;
}

// Gọi API public cho khách
export async function getPublicProducts() {
  const res = await http.get("/products/public");
  return res.data;
}

export async function listProducts(params = {}) {
  const res = await http.get("/products", { params });
  return res.data;
}

// Hàm search có thêm cờ isAdmin
export async function searchProducts(params = {}, isAdmin = false) {
    const res = await http.get("/products/search", { params: { ...params, isAdmin } });
    return res.data;
}

export async function getProduct(id) {
  const res = await http.get(`/products/${id}`);
  return res.data;
}

export async function createProduct(payload) {
  const res = await http.post("/products", payload);
  return res.data;
}

export async function updateProduct(id, payload) {
  const res = await http.put(`/products/${id}`, payload);
  return res.data;
}

export async function deleteProduct(id) {
  await http.delete(`/products/${id}`);
}

// Hàm mới: Toggle trạng thái
export async function toggleProductStatus(id) {
  await http.patch(`/products/${id}/toggle`);
}

export async function tryGetCategories() {
  try {
    const res = await http.get("/categories");
    return Array.isArray(res.data) ? res.data : [];
  } catch { return []; }
}