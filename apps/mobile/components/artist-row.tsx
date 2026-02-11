import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import type { Artist } from "@bitperfect/shared/api/types";

interface ArtistRowProps {
  artist: Artist;
}

export function ArtistRow({ artist }: ArtistRowProps) {
  const router = useRouter();
  const pictureUrl = artist.picture ? api.getCoverUrl(artist.picture, "160") : null;

  return (
    <Pressable
      onPress={() => router.push(`/artist/${artist.id}?name=${encodeURIComponent(artist.name)}&picture=${encodeURIComponent(artist.picture ?? "")}`)}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 12,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          overflow: "hidden",
          backgroundColor: "rgba(255,255,255,0.05)",
        }}
      >
        {pictureUrl ? (
          <Image
            source={{ uri: pictureUrl }}
            style={{ width: 48, height: 48 }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Image
              source="sf:person.fill"
              style={{ width: 24, height: 24 }}
              tintColor="rgba(255,255,255,0.2)"
            />
          </View>
        )}
      </View>
      <Text
        style={{ flex: 1, color: "rgba(255,255,255,0.9)", fontSize: 15, fontWeight: "500" }}
        numberOfLines={1}
      >
        {artist.name}
      </Text>
      <Image
        source="sf:chevron.right"
        style={{ width: 14, height: 14 }}
        tintColor="rgba(255,255,255,0.3)"
      />
    </Pressable>
  );
}
