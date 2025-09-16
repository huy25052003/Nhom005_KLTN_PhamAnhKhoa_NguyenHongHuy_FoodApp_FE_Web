import { create } from "zustand";

export const useAuth = create((set) => ({
  accessToken: localStorage.getItem("accessToken"),
  setToken: (t) => {
    if (t) localStorage.setItem("accessToken", t);
    else localStorage.removeItem("accessToken");
    set({ accessToken: t });
  },
  logout: () => {
    localStorage.removeItem("accessToken");
    set({ accessToken: null });
    location.href = "/admin/login";
  },
}));

export default useAuth;
