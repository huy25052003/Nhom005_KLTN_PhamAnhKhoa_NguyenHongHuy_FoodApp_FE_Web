import { create } from "zustand";

export const useCart = create((set) => ({
  count: 0,
  setCount: (n) => set({ count: n }),
}));
