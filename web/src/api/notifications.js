import http from "../lib/http";

export async function listNotifications() {
  const { data } = await http.get("/api/admin/notifications");
  return data;
}

export async function unreadCount() {
  const { data } = await http.get("/api/admin/notifications/unread-count");
  return data?.unread ?? 0;
}

export async function markRead(id) {
  await http.post(`/api/admin/notifications/${id}/read`);
}

export async function markReadAll() {
  await http.post(`/api/admin/notifications/read-all`);
}