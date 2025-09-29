import http from "../lib/http";

function decodeFromToken() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const payload = token.split(".")[1];
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return { username: json.sub || json.username || null };
  } catch {
    return null;
  }
}

export async function getMe() {
  try { return (await http.get("users/me")).data; } catch {}
  try { return (await http.get("auth/me")).data; } catch {}
  return decodeFromToken();
}
