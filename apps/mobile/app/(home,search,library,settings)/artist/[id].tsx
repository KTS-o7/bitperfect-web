import { useCallback } from "react";
import { useLocalSearchParams, Stack } from "expo-router";
import { View, Text, Pressable, ScrollView, ActivityIndicator, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useArtist } from "@/hooks/use-artist";
import { usePlayerStore } from "@/stores/player-store";
import { api } from "@/lib/api";
import { getTrackTitle, getTrackArtists, formatTime } from "@bitperfect/shared";
import { AlbumCard } from "@/components/album-card";
import type { Track } from "@bitperfect/shared/api/types";

const MONO_FONT = process.env.EXPO_OS === "ios" ? "ui-monospace" : "monospace";

function haptic() {
  if (process.env.EXPO_OS === "ios") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

function ArtistTrackRow({
  track,
  index,
  onPress,
}: {
  track: Track;
  index: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 24,
        opacity: pressed ? 0.5 : 1,
      })}
    >
      <Text
        style={{
          width: 28,
          fontFamily: MONO_FONT,
          fontSize: 14,
          color: "rgba(255,255,255,0.4)",
        }}
      >
        {index + 1}
      </Text>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text
          numberOfLines={1}
          style={{ fontSize: 16, fontWeight: "500", color: "#fff" }}
        >
          {getTrackTitle(track)}
        </Text>
        <Text
          numberOfLines={1}
          style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 2 }}
        >
          {getTrackArtists(track)}
        </Text>
      </View>
      <Text
        style={{
          fontFamily: MONO_FONT,
          fontSize: 13,
          color: "rgba(255,255,255,0.4)",
        }}
      >
        {formatTime(track.duration)}
      </Text>
    </Pressable>
  );
}

export default function ArtistScreen() {
  const { id, name, picture } = useLocalSearchParams<{
    id: string;
    name: string;
    picture: string;
  }>();
  const artistId = Number(id);
  const { albums, tracks, loading } = useArtist(artistId, name ?? "");
  const playTrack = usePlayerStore((s) => s.playTrack);
  const { width } = useWindowDimensions();

  const heroHeight = 300;
  const pictureUrl = picture ? api.getCoverUrl(picture, "640") : null;

  const handleTrackPress = useCallback(
    (track: Track) => {
      haptic();
      playTrack(track, tracks);
    },
    [tracks, playTrack]
  );

  const handlePlayAll = useCallback(() => {
    if (tracks.length === 0) return;
    haptic();
    playTrack(tracks[0], tracks);
  }, [tracks, playTrack]);

  const handleShuffle = useCallback(() => {
    if (tracks.length === 0) return;
    haptic();
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0], shuffled);
  }, [tracks, playTrack]);

  return (
    <>
      <Stack.Screen options={{ title: "", headerTransparent: true }} />
      <ScrollView style={{ flex: 1, backgroundColor: "#000" }} contentInsetAdjustmentBehavior="automatic">
        <View style={{ width, height: heroHeight, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.05)" }}>
          {pictureUrl && (
            <Image
              source={{ uri: pictureUrl }}
              style={{ width, height: heroHeight }}
              contentFit="cover"
              transition={200}
            />
          )}
          <View
            style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 160, backgroundColor: "rgba(0,0,0,0.6)" }}
          />
          <Text
            style={{
              position: "absolute",
              bottom: 16,
              left: 24,
              right: 24,
              fontSize: 32,
              fontWeight: "800",
              color: "#fff",
            }}
            numberOfLines={2}
          >
            {name}
          </Text>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : (
          <>
            <View
              style={{
                flexDirection: "row",
                gap: 10,
                paddingHorizontal: 24,
                paddingTop: 16,
                paddingBottom: 8,
              }}
            >
              <Pressable
                onPress={handlePlayAll}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: "#fff",
                  justifyContent: "center",
                  alignItems: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#000" }}>
                  Play
                </Text>
              </Pressable>

              <Pressable
                onPress={handleShuffle}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  justifyContent: "center",
                  alignItems: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
                  Shuffle
                </Text>
              </Pressable>
            </View>

            {tracks.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text
                  style={{
                    fontFamily: MONO_FONT,
                    fontSize: 12,
                    fontWeight: "700",
                    color: "rgba(255,255,255,0.5)",
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    paddingHorizontal: 24,
                    marginBottom: 8,
                  }}
                >
                  Top Songs
                </Text>
                {tracks.slice(0, 5).map((track, i) => (
                  <ArtistTrackRow
                    key={track.id}
                    track={track}
                    index={i}
                    onPress={() => handleTrackPress(track)}
                  />
                ))}
              </View>
            )}

            {albums.length > 0 && (
              <View style={{ marginTop: 24 }}>
                <Text
                  style={{
                    fontFamily: MONO_FONT,
                    fontSize: 12,
                    fontWeight: "700",
                    color: "rgba(255,255,255,0.5)",
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    paddingHorizontal: 24,
                    marginBottom: 12,
                  }}
                >
                  Albums
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
                >
                  {albums.map((album) => (
                    <AlbumCard key={album.id} album={album} />
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={{ height: 120 }} />
          </>
        )}
      </ScrollView>
    </>
  );
}
