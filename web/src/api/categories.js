import http from "../lib/http";

export async function getCategories() {
  const res = await http.get("/categories");
  return res.data;
}
export async function getCategory(id) {
  const res = await http.get(`/categories/${id}`);
  return res.data;
}
export async function createCategory(payload) {
  const res = await http.post("/categories", payload);
  return res.data;
}
export async function updateCategory(id, payload) {
  const res = await http.put(`/categories/${id}`, payload);
  return res.data;
}
export async function deleteCategory(id) {
  await http.delete(`/categories/${id}`);
}
