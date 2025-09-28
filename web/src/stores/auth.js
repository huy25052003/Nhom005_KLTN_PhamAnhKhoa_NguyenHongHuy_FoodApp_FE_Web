import { create } from "zustand";

export const useAuth = create((set) => ({
  token: localStorage.getItem("token") || "",
  setToken: (t) => {
    localStorage.setItem("token", t || "");
    set({ token: t || "" });
  },
  logout: () => {
    localStorage.removeItem("token");
    set({ token: "" });
  },
}));
