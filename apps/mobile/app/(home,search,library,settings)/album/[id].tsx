import { useCallback } from "react";
import { useLocalSearchParams, Stack } from "expo-router";
import { View, Text, Pressable, FlatList, ActivityIndicator, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useAlbum } from "@/hooks/use-album";
import { usePlayerStore } from "@/stores/player-store";
import { api } from "@/lib/api";
import { getTrackTitle, getTrackArtists, formatTime } from "@bitperfect/shared";
import type { Track } from "@bitperfect/shared/api/types";

const MONO_FONT = process.env.EXPO_OS === "ios" ? "ui-monospace" : "monospace";

function haptic() {
  if (process.env.EXPO_OS === "ios") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

function AlbumTrackRow({
  track,
  onPress,
}: {
  track: Track;
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
        {track.trackNumber ?? ""}
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

export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const albumId = Number(id);
  const { album, tracks, loading } = useAlbum(albumId);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const { width } = useWindowDimensions();
  const coverSize = width - 48;

  const coverUrl = album?.cover
    ? api.getCoverUrl(album.cover, "640")
    : null;

  const year = album?.releaseDate?.slice(0, 4);
  const trackCount = album?.numberOfTracks ?? tracks.length;

  const handlePlay = useCallback(() => {
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

  const handleTrackPress = useCallback(
    (track: Track) => {
      haptic();
      playTrack(track, tracks);
    },
    [tracks, playTrack]
  );

  const renderItem = useCallback(
    ({ item }: { item: Track }) => (
      <AlbumTrackRow track={item} onPress={() => handleTrackPress(item)} />
    ),
    [handleTrackPress]
  );

  const keyExtractor = useCallback((item: Track) => String(item.id), []);

  const header = (
    <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 }}>
      {loading ? (
        <View style={{ height: coverSize, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : (
        <>
          <View
            style={{
              width: coverSize,
              height: coverSize,
              borderRadius: 12,
              borderCurve: "continuous",
              overflow: "hidden",
              backgroundColor: "rgba(255,255,255,0.1)",
            }}
          >
            {coverUrl && (
              <Image
                source={{ uri: coverUrl }}
                style={{ width: coverSize, height: coverSize }}
                contentFit="cover"
              />
            )}
          </View>

          <Text
            style={{
              fontSize: 22,
              fontWeight: "700",
              color: "#fff",
              marginTop: 16,
            }}
            numberOfLines={2}
          >
            {album?.title}
          </Text>

          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: "rgba(255,255,255,0.7)",
              marginTop: 4,
            }}
            numberOfLines={1}
          >
            {album?.artist?.name ?? album?.artists?.[0]?.name ?? ""}
          </Text>

          <Text
            style={{
              fontFamily: MONO_FONT,
              fontSize: 12,
              color: "rgba(255,255,255,0.4)",
              letterSpacing: 0.5,
              marginTop: 6,
            }}
          >
            {[year, trackCount ? `${trackCount} tracks` : null]
              .filter(Boolean)
              .join(" · ")}
          </Text>

          <View
            style={{
              flexDirection: "row",
              gap: 10,
              marginTop: 16,
            }}
          >
            <Pressable
              onPress={handlePlay}
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
        </>
      )}
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: album?.title ?? "Album" }} />
      <FlatList
        data={tracks}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={header}
        style={{ flex: 1, backgroundColor: "#000" }}
        contentInsetAdjustmentBehavior="automatic"
      />
    </>
  );
}
