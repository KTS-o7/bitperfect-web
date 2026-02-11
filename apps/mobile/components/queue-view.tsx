import { memo, useCallback } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { Image } from "expo-image";
import { usePlayerStore } from "@/stores/player-store";
import { api } from "@/lib/api";
import { getTrackTitle, getTrackArtists, formatTime } from "@bitperfect/shared";
import type { Track } from "@bitperfect/shared/api/types";

const MONO_FONT = process.env.EXPO_OS === "ios" ? "ui-monospace" : "monospace";

interface TrackRowProps {
  track: Track;
  isCurrent?: boolean;
  onPress: (track: Track) => void;
}

const QueueTrackRow = memo(function QueueTrackRow({
  track,
  isCurrent,
  onPress,
}: TrackRowProps) {
  const title = getTrackTitle(track);
  const artists = getTrackArtists(track);
  const coverUrl = track.album?.cover
    ? api.getCoverUrl(track.album.cover, "160")
    : null;
  const duration = formatTime(track.duration);

  return (
    <Pressable
      onPress={() => onPress(track)}
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
          width: isCurrent ? 48 : 40,
          height: isCurrent ? 48 : 40,
          borderRadius: 4,
          overflow: "hidden",
          backgroundColor: "rgba(255,255,255,0.05)",
        }}
      >
        {coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Image
              source="sf:music.note"
              style={{ width: 16, height: 16 }}
              tintColor="rgba(255,255,255,0.2)"
            />
          </View>
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "500",
            color: isCurrent ? "#fff" : "rgba(255,255,255,0.8)",
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.5)",
            marginTop: 2,
          }}
          numberOfLines={1}
        >
          {artists}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 12,
          fontFamily: MONO_FONT,
          color: "rgba(255,255,255,0.4)",
        }}
      >
        {duration}
      </Text>
    </Pressable>
  );
});

export function QueueView() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const playTrack = usePlayerStore((s) => s.playTrack);

  const upcomingTracks = queue.slice(queueIndex + 1);

  const handlePress = useCallback(
    (track: Track) => {
      playTrack(track, queue);
    },
    [playTrack, queue],
  );

  const renderItem = useCallback(
    ({ item }: { item: Track }) => (
      <QueueTrackRow track={item} onPress={handlePress} />
    ),
    [handlePress],
  );

  const keyExtractor = useCallback(
    (item: Track, index: number) => `${item.id}-${index}`,
    [],
  );

  return (
    <FlatList
      data={upcomingTracks}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={
        <>
          <Text
            style={{
              fontFamily: MONO_FONT,
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 1.5,
              color: "rgba(255,255,255,0.4)",
              textTransform: "uppercase",
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 8,
            }}
          >
            NOW PLAYING
          </Text>
          {currentTrack && (
            <QueueTrackRow
              track={currentTrack}
              isCurrent
              onPress={handlePress}
            />
          )}
          <View
            style={{
              height: 1,
              backgroundColor: "rgba(255,255,255,0.1)",
              marginHorizontal: 16,
              marginVertical: 8,
            }}
          />
          {upcomingTracks.length > 0 && (
            <Text
              style={{
                fontFamily: MONO_FONT,
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 1.5,
                color: "rgba(255,255,255,0.4)",
                textTransform: "uppercase",
                paddingHorizontal: 16,
                paddingTop: 8,
                paddingBottom: 8,
              }}
            >
              PLAYING NEXT
            </Text>
          )}
        </>
      }
    />
  );
}
