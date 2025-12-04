import http from "../lib/http";

export async function getRecommendations() {
  const res = await http.get("/recommendations");
  return res.data;
}