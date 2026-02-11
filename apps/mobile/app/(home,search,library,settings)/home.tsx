import { useCallback } from "react";
import { FlatList, View, Text, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { TrackRow } from "@/components/track-row";
import { useRecentlyPlayed } from "@/hooks/use-recently-played";
import { usePlayerStore } from "@/stores/player-store";
import type { Track } from "@bitperfect/shared/api/types";

const MONO_FONT = process.env.EXPO_OS === "ios" ? "ui-monospace" : "monospace";

export default function HomeScreen() {
  const { tracks: recentTracks, loading: recentLoading } = useRecentlyPlayed();
  const playTrack = usePlayerStore((s) => s.playTrack);

  const handleTrackPress = useCallback((track: Track) => {
    playTrack(track, recentTracks);
  }, [playTrack, recentTracks]);

  const renderItem = useCallback(({ item }: { item: Track }) => (
    <TrackRow track={item} onPress={handleTrackPress} />
  ), [handleTrackPress]);

  const keyExtractor = useCallback((item: Track) => String(item.id), []);

  return (
    <FlatList
      data={recentTracks}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: "#000" }}
      contentContainerStyle={{ paddingBottom: 96 }}
      ListHeaderComponent={<SectionHeader title="RECENTLY PLAYED" count={recentTracks.length} />}
      ListEmptyComponent={recentLoading ? <LoadingState /> : <EmptyRecentState />}
    />
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.1)",
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          fontFamily: MONO_FONT,
          textTransform: "uppercase",
          letterSpacing: 1.5,
          color: "rgba(255,255,255,0.4)",
        }}
      >
        {title}
      </Text>
      {count > 0 && (
        <Text
          style={{
            fontSize: 11,
            fontFamily: MONO_FONT,
            color: "rgba(255,255,255,0.3)",
            fontVariant: ["tabular-nums"],
          }}
        >
          {count}
        </Text>
      )}
    </View>
  );
}

function LoadingState() {
  return (
    <View style={{ paddingVertical: 40, alignItems: "center" }}>
      <ActivityIndicator color="rgba(255,255,255,0.5)" />
    </View>
  );
}

function EmptyRecentState() {
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 64,
        paddingHorizontal: 24,
      }}
    >
      <View
        style={{
          alignItems: "center",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.1)",
          paddingHorizontal: 40,
          paddingVertical: 32,
          width: "100%",
          maxWidth: 300,
        }}
      >
        <Image
          source="sf:music.note.list"
          style={{ width: 32, height: 32, marginBottom: 12 }}
          tintColor="rgba(255,255,255,0.2)"
        />
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            fontFamily: MONO_FONT,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            color: "rgba(255,255,255,0.9)",
            marginBottom: 4,
          }}
        >
          NO RECENT TRACKS
        </Text>
        <Text
          style={{
            fontSize: 11,
            fontFamily: MONO_FONT,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            color: "rgba(255,255,255,0.4)",
            textAlign: "center",
          }}
        >
          Search and play music to see it here
        </Text>
      </View>
    </View>
  );
}
