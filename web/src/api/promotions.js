import http from "../lib/http";

export async function previewPromotion(code, items) {
  const res = await http.post("/promotions/preview", { code, items });
  return res.data; 
}

export async function getPromotions() {
  const res = await http.get("/promotions");
  return res.data;
}

export async function createPromotion(payload) {
  const res = await http.post("/promotions", payload);
  return res.data;
}

export async function updatePromotion(id, payload) {
  const res = await http.put(`/promotions/${id}`, payload);
  return res.data;
}

export async function deletePromotion(id) {
  await http.delete(`/promotions/${id}`);
}