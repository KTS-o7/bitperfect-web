import { memo } from "react";
import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { api } from "@/lib/api";
import {
  formatTime,
  getTrackTitle,
  getTrackArtists,
  deriveTrackQuality,
} from "@bitperfect/shared";
import type { Track } from "@bitperfect/shared/api/types";

const MONO_FONT = process.env.EXPO_OS === "ios" ? "ui-monospace" : "monospace";

interface TrackRowProps {
  track: Track;
  onPress?: (track: Track) => void;
  showQuality?: boolean;
}

export const TrackRow = memo(function TrackRow({
  track,
  onPress,
  showQuality = true,
}: TrackRowProps) {
  const coverUrl = track.album?.cover
    ? api.getCoverUrl(track.album.cover, "160")
    : null;
  const quality = deriveTrackQuality(track);
  const title = getTrackTitle(track);
  const artists = getTrackArtists(track);
  const duration = formatTime(track.duration);

  const handlePress = () => {
    if (process.env.EXPO_OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.(track);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.1)",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {/* Cover Art */}
      <View
        style={{
          width: 48,
          height: 48,
          backgroundColor: "rgba(255,255,255,0.05)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.1)",
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

      {/* Title + Artist */}
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              flex: 1,
              color: "rgba(255,255,255,0.9)",
              fontSize: 15,
              fontWeight: "500",
            }}
          >
            {title}
          </Text>
          {track.explicit && (
            <View
              style={{
                paddingHorizontal: 4,
                paddingVertical: 1,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.2)",
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  fontFamily: MONO_FONT,
                  color: "rgba(255,255,255,0.5)",
                  textTransform: "uppercase",
                }}
              >
                E
              </Text>
            </View>
          )}
        </View>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}
        >
          {artists}
        </Text>
      </View>

      {/* Quality badge + Duration */}
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        {showQuality && quality && (
          <View
            style={{
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.2)",
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                fontFamily: MONO_FONT,
                color: "rgba(255,255,255,0.5)",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {quality === "HI_RES_LOSSLESS" ? "HI-RES" : quality}
            </Text>
          </View>
        )}
        <Text
          style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: 12,
            fontFamily: MONO_FONT,
            fontVariant: ["tabular-nums"],
          }}
        >
          {duration}
        </Text>
      </View>
    </Pressable>
  );
});
