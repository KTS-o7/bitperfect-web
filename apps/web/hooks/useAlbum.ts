import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useAlbum(albumId: number) {
  return useQuery({
    queryKey: ["album", albumId],
    queryFn: async () => {
      if (!albumId || isNaN(albumId)) {
        throw new Error("Invalid album ID");
      }
      return api.getAlbum(albumId);
    },
    enabled: !!albumId && !isNaN(albumId),
    // Keep album data for 10 minutes since it rarely changes
    staleTime: 1000 * 60 * 10,
  });
}
