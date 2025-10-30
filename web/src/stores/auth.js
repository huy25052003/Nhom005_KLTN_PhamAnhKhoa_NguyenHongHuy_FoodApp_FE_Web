import { create } from "zustand";

export const useAuth = create((set) => ({
  token: localStorage.getItem("token") || null,
  username: localStorage.getItem("username") || null,
  roles: JSON.parse(localStorage.getItem("roles") || "[]"),
  isAdmin: JSON.parse(localStorage.getItem("roles") || "[]").some(
    r => r === "ROLE_ADMIN" || r === "ADMIN"
  ),

  isKitchen: JSON.parse(localStorage.getItem("roles") || "[]").some(
    r => r === "ROLE_KITCHEN" || r === "KITCHEN"
  ),

  setToken: (token) => {
    let username = null;
    let roles = [];
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        username = payload.sub || payload.username || null;
        roles = payload.roles || payload.authorities || payload.role || [];
        if (typeof roles === "string") roles = [roles];
      } catch {}
    }
    if (token) localStorage.setItem("token", token); else localStorage.removeItem("token");
    if (username) localStorage.setItem("username", username); else localStorage.removeItem("username");
    localStorage.setItem("roles", JSON.stringify(roles));

    set({ token, username, roles, isAdmin: roles.some(r => r === "ROLE_ADMIN" || r === "ADMIN"),isKitchen: roles.some(r => r === "ROLE_KITCHEN" || r === "KITCHEN") });
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("roles");
    set({ token: null, username: null, roles: [], isAdmin: false, isKitchen: false });
  },
}));
