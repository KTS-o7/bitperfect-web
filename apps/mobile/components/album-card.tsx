import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import type { Album } from "@bitperfect/shared/api/types";

interface AlbumCardProps {
  album: Album;
}

export function AlbumCard({ album }: AlbumCardProps) {
  const router = useRouter();
  const coverUrl = album.cover ? api.getCoverUrl(album.cover, "320") : null;

  return (
    <Pressable
      onPress={() => router.push(`/album/${album.id}`)}
      style={({ pressed }) => ({ width: 140, opacity: pressed ? 0.7 : 1 })}
    >
      <View
        style={{
          width: 140,
          height: 140,
          borderRadius: 8,
          overflow: "hidden",
          backgroundColor: "rgba(255,255,255,0.05)",
        }}
      >
        {coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            style={{ width: 140, height: 140 }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Image
              source="sf:music.note"
              style={{ width: 32, height: 32 }}
              tintColor="rgba(255,255,255,0.2)"
            />
          </View>
        )}
      </View>
      <Text numberOfLines={1} style={{ color: "#fff", fontSize: 13, marginTop: 8 }}>
        {album.title}
      </Text>
      <Text
        numberOfLines={1}
        style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 }}
      >
        {album.artist?.name ?? ""}
      </Text>
    </Pressable>
  );
}
