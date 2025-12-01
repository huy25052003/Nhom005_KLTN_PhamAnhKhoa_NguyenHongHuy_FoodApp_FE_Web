import axios from "axios";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: false,
});

http.interceptors.request.use((config) => {
  const url = (config.url || "").toString();
  const isLogin = url.endsWith("auth/login") || url.includes("/auth/login");
  if (!isLogin) {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }
  return config;
});

http.interceptors.response.use(
  (res) => {
    const h = res.headers?.authorization || res.headers?.Authorization;
    if (h && /^Bearer\s+/i.test(h)) {
      const t = h.replace(/^Bearer\s+/i, "");
      localStorage.setItem("token", t);
    }
    return res;
  },
  (err) => {
    const status = err?.response?.status;
    if (status === 429){
      alert("Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau.");
      return Promise.reject(err);
    }
    if (status === 401 || status === 403) {
      localStorage.removeItem("token");
      const here = `${location.pathname}${location.search}`;
      if (!location.pathname.startsWith("/admin/login")) {
        window.location.assign(`/admin/login?redirect=${encodeURIComponent(here)}`);
      }
    }
    return Promise.reject(err);
  }
);

export default http;