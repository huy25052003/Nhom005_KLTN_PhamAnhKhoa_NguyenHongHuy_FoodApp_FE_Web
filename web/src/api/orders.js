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