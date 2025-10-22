import http from "../lib/http";

export async function toggleFavorite(productId) {
  const res = await http.post(`/favorites/${productId}/toggle`);
  return res.data;
}

export async function getFavoriteStat(productId) {
  const res = await http.get(`/favorites/${productId}`);
  return res.data;
}

export async function getMyFavorites(page = 0, size = 12) {
  const res = await http.get(`/favorites/my`, { params: { page, size } });
  return res.data; 
}