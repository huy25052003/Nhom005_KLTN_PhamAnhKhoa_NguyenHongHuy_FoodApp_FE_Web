import http from "../lib/http";

const LOGIN_PATH = "auth/login";
const REGISTER_PATH = "auth/register";

export async function login(username, password) {
  try {
    const res = await http.post(LOGIN_PATH, { username, password });
    return handleTokenResponse(res);
  } catch (e) {
    throw e;
  }
}

export async function register(username, password) {
  try {
    const res = await http.post(REGISTER_PATH, { username, password });
    return { ok: true, ...handleTokenResponse(res) };
  } catch (e) {
    throw new Error(e?.response?.data?.message || e?.message || "Đăng ký thất bại");
  }
}

export async function loginWithFirebase(firebaseToken) {
  const res = await http.post("auth/firebase", { token: firebaseToken });
  return handleTokenResponse(res);
}

// Helper xử lý token trả về (vì backend có thể trả về nhiều format khác nhau)
function handleTokenResponse(res) {
  const token =
    res.data?.accessToken || res.data?.token || res.data?.access_token || res.data?.jwt ||
    (() => {
      const h = res.headers?.authorization || res.headers?.Authorization;
      return h && /^Bearer\s+/i.test(h) ? h.replace(/^Bearer\s+/i, "") : null;
    })();

  if (!token) return { accessToken: null };
  return { accessToken: token };
}