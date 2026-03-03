import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@/types";

interface UserStore {
  user: User | null;
  location: {
    coordinates: [number, number] | null;
    address?: string;
  };
  isAuthenticated: boolean;

  setUser: (user: User | null) => void;
  setLocation: (coordinates: [number, number], address?: string) => void;
  logout: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      location: {
        coordinates: null,
        address: undefined,
      },
      isAuthenticated: false,

      setUser: (user) => {
        console.log("useUserStore - setUser called with:", user);
        set({
          user,
          isAuthenticated: !!user,
        });
      },

      setLocation: (coordinates, address) =>
        set((state) => ({
          location: {
            coordinates,
            address,
          },
        })),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "user-storage",
      skipHydration: false,
    }
  )
);
