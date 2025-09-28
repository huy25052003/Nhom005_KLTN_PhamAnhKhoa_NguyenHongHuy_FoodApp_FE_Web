import http from "../lib/http";

export async function getOrders(page = 0, size = 5) {
  const res = await http.get("/orders", { params: { page, size } });
  return res.data;
}

export async function updateOrderStatus(id, status) {
  const res = await http.put(`/orders/${id}/status`, null, { params: { status } });
  return res.data;
}

export async function cancelOrder(id) {
  const res = await http.put(`/orders/${id}/cancel`);
  return res.data;
}


export async function getOrder(id) {
  const res = await http.get(`/orders/${id}`);
  return res.data;
}

export async function placeOrder(items) {
  const res = await http.post("/orders", items);
  return res.data;
}

export async function placeOrderFromCart(cart) {
  const items = (cart?.items || cart?.cartItems || []).map((ci) => ({
    product: { id: ci.product?.id ?? ci.productId },
    quantity: ci.quantity ?? 1,
  }));
  const res = await http.post("/orders", items);
  return res.data;
}