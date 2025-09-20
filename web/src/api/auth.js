import http from "../lib/http";

const LOGIN_PATH = "auth/login";

export async function login(username, password) {
  try {
    const res = await http.post(LOGIN_PATH, { username, password });
    const token =
      res.data?.accessToken || res.data?.token || res.data?.access_token || res.data?.jwt ||
      (() => {
        const h = res.headers?.authorization || res.headers?.Authorization;
        return h && /^Bearer\s+/i.test(h) ? h.replace(/^Bearer\s+/i, "") : null;
      })();
    if (!token) throw new Error("Không thấy access token.");
    return { accessToken: token };
  } catch (e) {
    if (e?.response?.status === 415 || e?.response?.status === 400) {
      const form = new URLSearchParams();
      form.append("username", username);
      form.append("password", password);
      const res2 = await http.post(LOGIN_PATH, form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      const token =
        res2.data?.accessToken || res2.data?.token || res2.data?.access_token || res2.data?.jwt ||
        (() => {
          const h = res2.headers?.authorization || res2.headers?.Authorization;
          return h && /^Bearer\s+/i.test(h) ? h.replace(/^Bearer\s+/i, "") : null;
        })();
      if (!token) throw new Error("Không thấy access token.");
      return { accessToken: token };
    }
    throw e;
  }
}
