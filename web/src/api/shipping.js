import http from "../lib/http";

export async function getMyShipping(productId) {
  const res = await http.get(`/shipping/me`);
  return res.data;
}

export async function upsertMyShipping(payload) {
  const res = await http.put(`/shipping/me`, payload);
  return res.data; 
}

