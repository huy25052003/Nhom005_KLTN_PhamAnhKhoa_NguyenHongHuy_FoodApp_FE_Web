import http from "../lib/http";

export async function previewPromotion(code, items) {
  const { data } = await authedJSON.post("/api/promotions/preview", { code, items });
  return data; 
}
