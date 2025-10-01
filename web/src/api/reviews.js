import http from "../lib/http";

export async function listReviews(productId) {
  const res = await http.get(`/products/${productId}/reviews`);
  return res.data;
}

export async function createReview(productId, { rating, comment }) {
  const res = await http.post(`/products/${productId}/reviews`, { rating, comment });
  return res.data; 
}

export async function deleteReview(productId, reviewId) {
  const res = await http.delete(`/products/${productId}/reviews/${reviewId}`);
  return res.data;
}

export async function getAvgRating(productId) {
  const res = await http.get(`/products/${productId}/reviews/avg`);
  return res.data?.avgRating ?? 0;
}
