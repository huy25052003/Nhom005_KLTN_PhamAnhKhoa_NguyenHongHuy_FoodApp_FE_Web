import http from "../lib/http";

export async function getOverview(params) {
  const res = await http.get("/admin/stats/overview", { params });
  return res.data;
}

export async function getRevenueSeries(params) {
  const res = await http.get("/admin/stats/revenue-series", { params });
  return res.data;
}

export async function getTopProducts(params) {
  const res = await http.get("/admin/stats/top-products", { params });
  return res.data;
}

export async function getOrdersByStatus(params) {
  const res = await http.get("/admin/stats/orders-by-status", { params });
  return res.data;
}

export async function getLowStock(params) {
  const res = await http.get("/admin/stats/low-stock", { params });
  return res.data;
}
