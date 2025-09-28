import http from "../lib/http";

export async function getCart() {
  const res = await http.get("/cart");
  return res.data;
}
export const getMyCart = getCart;

export async function addToCart(productId, quantity = 1) {
  const res = await http.post("/cart/items", null, { params: { productId, quantity } });
  return res.data;
}
export async function updateCartItem(itemId, quantity) {
  const res = await http.put(`/cart/items/${itemId}`, null, { params: { quantity } });
  return res.data;
}
export async function removeCartItem(itemId) {
  await http.delete(`/cart/items/${itemId}`);
}
export async function clearCart() {
  await http.delete("/cart");
}