import { ScrollView, View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useRecentlyPlayed } from "@/hooks/use-recently-played";
import { usePlayerStore } from "@/stores/player-store";
import { TrackRow } from "@/components/track-row";

const MONO_FONT = process.env.EXPO_OS === "ios" ? "ui-monospace" : "monospace";
const MAX_PREVIEW = 5;

export default function LibraryScreen() {
  const favorites = useFavoritesStore((s) => s.getFavorites)();
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds);
  const { tracks: recentTracks, loading } = useRecentlyPlayed();
  const playTrack = usePlayerStore((s) => s.playTrack);

  const favoritesPreview = favorites.slice(0, MAX_PREVIEW);
  const recentPreview = recentTracks.slice(0, MAX_PREVIEW);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: "#000" }}
    >
      <View style={{ borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.1)" }}>
        <Pressable
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 14,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Image
            source="sf:heart.fill"
            style={{ width: 28, height: 28, marginRight: 12 }}
            tintColor="#fc3c44"
          />
          <Text style={{ flex: 1, fontSize: 16, fontWeight: "500", color: "#fff" }}>
            Favorites
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.4)",
              fontFamily: MONO_FONT,
              marginRight: 8,
            }}
          >
            {favoriteIds.size}
          </Text>
          <Image
            source="sf:chevron.right"
            style={{ width: 14, height: 14 }}
            tintColor="rgba(255,255,255,0.3)"
          />
        </Pressable>
      </View>

      <View style={{ borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.1)" }}>
        <Pressable
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 14,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Image
            source="sf:clock.fill"
            style={{ width: 28, height: 28, marginRight: 12 }}
            tintColor="#fff"
          />
          <Text style={{ flex: 1, fontSize: 16, fontWeight: "500", color: "#fff" }}>
            Recently Played
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.4)",
              fontFamily: MONO_FONT,
              marginRight: 8,
            }}
          >
            {recentTracks.length}
          </Text>
          <Image
            source="sf:chevron.right"
            style={{ width: 14, height: 14 }}
            tintColor="rgba(255,255,255,0.3)"
          />
        </Pressable>
      </View>

      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          fontFamily: MONO_FONT,
          textTransform: "uppercase",
          letterSpacing: 1.5,
          color: "rgba(255,255,255,0.4)",
          paddingHorizontal: 16,
          paddingTop: 24,
          paddingBottom: 12,
        }}
      >
        Favorites
      </Text>

      {favorites.length === 0 ? (
        <Text
          style={{
            color: "rgba(255,255,255,0.3)",
            fontSize: 14,
            paddingHorizontal: 16,
            paddingBottom: 8,
          }}
        >
          No favorites yet. Tap the heart icon on any track to add it here.
        </Text>
      ) : (
        <>
          {favoritesPreview.map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              onPress={(t) => playTrack(t, favorites)}
            />
          ))}
          {favorites.length > MAX_PREVIEW && (
            <Pressable
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 12,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ color: "#fc3c44", fontSize: 14, fontWeight: "500" }}>
                Show All ({favorites.length})
              </Text>
            </Pressable>
          )}
        </>
      )}

      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          fontFamily: MONO_FONT,
          textTransform: "uppercase",
          letterSpacing: 1.5,
          color: "rgba(255,255,255,0.4)",
          paddingHorizontal: 16,
          paddingTop: 24,
          paddingBottom: 12,
        }}
      >
        Recently Played
      </Text>

      {!loading && recentTracks.length === 0 ? (
        <Text
          style={{
            color: "rgba(255,255,255,0.3)",
            fontSize: 14,
            paddingHorizontal: 16,
            paddingBottom: 8,
          }}
        >
          No recently played tracks.
        </Text>
      ) : (
        <>
          {recentPreview.map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              onPress={(t) => playTrack(t, recentTracks)}
            />
          ))}
          {recentTracks.length > MAX_PREVIEW && (
            <Pressable
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 12,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ color: "#fc3c44", fontSize: 14, fontWeight: "500" }}>
                Show All ({recentTracks.length})
              </Text>
            </Pressable>
          )}
        </>
      )}

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}
