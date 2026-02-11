import { create } from "zustand";
import {
  addFavorite as dbAdd,
  removeFavorite as dbRemove,
  getFavoriteIds,
  getFavorites as dbGetFavorites,
} from "@/lib/database";
import type { Track } from "@bitperfect/shared/api/types";

interface FavoritesStore {
  favoriteIds: Set<number>;
  loadFavorites: () => void;
  toggleFavorite: (track: Track) => void;
  isFavorite: (trackId: number) => boolean;
  getFavorites: () => Track[];
}

export const useFavoritesStore = create<FavoritesStore>((set, get) => ({
  favoriteIds: new Set<number>(),

  loadFavorites: () => {
    const ids = getFavoriteIds();
    set({ favoriteIds: new Set(ids) });
  },

  toggleFavorite: (track: Track) => {
    const { favoriteIds } = get();
    const newIds = new Set(favoriteIds);
    if (newIds.has(track.id)) {
      newIds.delete(track.id);
      dbRemove(track.id);
    } else {
      newIds.add(track.id);
      dbAdd(track);
    }
    set({ favoriteIds: newIds });
  },

  isFavorite: (trackId: number) => {
    return get().favoriteIds.has(trackId);
  },

  getFavorites: () => {
    return dbGetFavorites();
  },
}));
