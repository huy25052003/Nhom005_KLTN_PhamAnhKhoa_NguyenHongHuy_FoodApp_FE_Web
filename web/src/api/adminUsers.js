import http from "../lib/http";


export async function listUsers(page = 0, size = 10, sort = "id,desc") {
  const params = { page, size, sort };
  const res = await http.get("/admin/users", { params });
  return res.data;
}

export async function getUserDetails(id) {
  const res = await http.get(`/admin/users/${id}`);
  return res.data;
}

export async function updateUserRoles(id, roles) {
  const rolesSet = new Set(roles.map(r => String(r).trim().toUpperCase()));
  const payload = Array.from(rolesSet);
  const res = await http.put(`/admin/users/${id}/roles`, payload);
  return res.data;
}

export async function deleteUser(id) {
  await http.delete(`/admin/users/${id}`);
}
