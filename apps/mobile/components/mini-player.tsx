import { memo } from "react";
import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { usePlayerStore } from "@/stores/player-store";
import { api } from "@/lib/api";
import { getTrackTitle, getTrackArtists } from "@bitperfect/shared";
import * as Haptics from "expo-haptics";

interface MiniPlayerProps {
  onExpand: () => void;
}

export function MiniPlayer({ onExpand }: MiniPlayerProps) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlayback = usePlayerStore((s) => s.togglePlayback);
  const skipNext = usePlayerStore((s) => s.skipNext);
  if (!currentTrack) return null;

  const coverUrl = currentTrack.album?.cover
    ? api.getCoverUrl(currentTrack.album.cover, "160")
    : null;
  const title = getTrackTitle(currentTrack);
  const artists = getTrackArtists(currentTrack);

  const handleTogglePlayback = () => {
    if (process.env.EXPO_OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    togglePlayback();
  };

  const handleSkipNext = () => {
    if (process.env.EXPO_OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    skipNext();
  };

  return (
    <Pressable
      onPress={onExpand}
      style={{
        backgroundColor: "rgba(30,30,30,0.95)",
        marginHorizontal: 8,
        borderRadius: 12,
        borderCurve: "continuous",
        overflow: "hidden",
      }}
    >
      <View
        style={{
          height: 64,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          gap: 12,
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            backgroundColor: "rgba(255,255,255,0.05)",
            overflow: "hidden",
          }}
        >
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              style={{ width: 48, height: 48 }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Image
                source="sf:music.note"
                style={{ width: 20, height: 20 }}
                tintColor="rgba(255,255,255,0.2)"
              />
            </View>
          )}
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}
          >
            {title}
          </Text>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}
          >
            {artists}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              handleTogglePlayback();
            }}
            style={{ padding: 8 }}
          >
            <Image
              source={isPlaying ? "sf:pause.fill" : "sf:play.fill"}
              style={{ width: 20, height: 20 }}
              tintColor="white"
            />
          </Pressable>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              handleSkipNext();
            }}
            style={{ padding: 8 }}
          >
            <Image
              source="sf:forward.fill"
              style={{ width: 18, height: 18 }}
              tintColor="rgba(255,255,255,0.6)"
            />
          </Pressable>
        </View>
      </View>

      <MiniPlayerProgress />
    </Pressable>
  );
}

const MiniPlayerProgress = memo(function MiniPlayerProgress() {
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <View
      style={{
        height: 2,
        backgroundColor: "rgba(255,255,255,0.1)",
        width: "100%",
      }}
    >
      <View
        style={{
          backgroundColor: "rgba(255,255,255,0.6)",
          height: "100%",
          width: `${progressPercent}%`,
        }}
      />
    </View>
  );
});
