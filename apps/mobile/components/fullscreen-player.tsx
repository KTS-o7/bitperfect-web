import { useEffect, useState } from "react";
import { StyleSheet, View, Text, Pressable, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { usePlayerStore } from "@/stores/player-store";
import { useFavoritesStore } from "@/stores/favorites-store";
import { api } from "@/lib/api";
import { getTrackTitle, getTrackArtists } from "@bitperfect/shared";
import { SeekBar } from "@/components/seek-bar";
import { VolumeSlider } from "@/components/volume-slider";
import { LyricsView } from "@/components/lyrics-view";
import { QueueView } from "@/components/queue-view";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface FullscreenPlayerProps {
  onCollapse: () => void;
}

function haptic() {
  if (process.env.EXPO_OS === "ios") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

function useSpringPress(scaleDown = 0.92) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const onPressIn = () => {
    scale.value = withSpring(scaleDown, { damping: 15, stiffness: 400 });
  };
  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };
  return { animatedStyle, onPressIn, onPressOut };
}

export function FullscreenPlayer({ onCollapse }: FullscreenPlayerProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const artSize = screenWidth - 48;

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isShuffle = usePlayerStore((s) => s.isShuffle);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const togglePlayback = usePlayerStore((s) => s.togglePlayback);
  const skipNext = usePlayerStore((s) => s.skipNext);
  const skipPrev = usePlayerStore((s) => s.skipPrev);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeatMode = usePlayerStore((s) => s.cycleRepeatMode);
  const showLyrics = usePlayerStore((s) => s.showLyrics);
  const toggleLyrics = usePlayerStore((s) => s.toggleLyrics);
  const [showQueue, setShowQueue] = useState(false);

  const isFav = useFavoritesStore((s) => currentTrack ? s.isFavorite(currentTrack.id) : false);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const loadFavorites = useFavoritesStore((s) => s.loadFavorites);
  useEffect(() => { loadFavorites(); }, []);

  const playPress = useSpringPress(0.9);
  const prevPress = useSpringPress(0.85);
  const nextPress = useSpringPress(0.85);

  if (!currentTrack) return null;

  const title = getTrackTitle(currentTrack);
  const artists = getTrackArtists(currentTrack);
  const coverUrl = currentTrack.album?.cover
    ? api.getCoverUrl(currentTrack.album.cover, "640")
    : null;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#000",
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 8,
      }}
    >
      {coverUrl && (
        <Image
          source={{ uri: coverUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          blurRadius={80}
        />
      )}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.6)" }]} />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 24,
          height: 44,
        }}
      >
        <Pressable
          onPress={() => {
            haptic();
            onCollapse();
          }}
          hitSlop={12}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Image
            source="sf:chevron.down"
            style={{ width: 22, height: 22 }}
            tintColor="rgba(255,255,255,0.7)"
          />
        </Pressable>
        <Text
          style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: 12,
            fontWeight: "600",
            letterSpacing: 1,
          }}
        >
          NOW PLAYING
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <Pressable
            onPress={() => {
              haptic();
              if (!showQueue) {
                if (showLyrics) toggleLyrics();
              }
              setShowQueue((v) => !v);
            }}
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Image
              source="sf:list.bullet"
              style={{ width: 22, height: 22 }}
              tintColor={showQueue ? "#fff" : "rgba(255,255,255,0.7)"}
            />
          </Pressable>
          <Pressable
            onPress={() => {
              haptic();
              if (!showLyrics) {
                setShowQueue(false);
              }
              toggleLyrics();
            }}
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Image
              source="sf:quote.bubble"
              style={{ width: 22, height: 22 }}
              tintColor={showLyrics ? "#fff" : "rgba(255,255,255,0.7)"}
            />
          </Pressable>
        </View>
      </View>

      {showQueue ? (
        <View style={{ flex: 1 }}>
          <QueueView />
        </View>
      ) : showLyrics ? (
        <View style={{ flex: 1 }}>
          <LyricsView />
        </View>
      ) : (
        <>
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 24,
              paddingTop: 24,
              paddingBottom: 32,
              flex: 1,
            }}
          >
            <View
              style={{
                width: artSize,
                height: artSize,
                maxHeight: artSize,
                borderRadius: 12,
                borderCurve: "continuous",
                overflow: "hidden",
                boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              }}
            >
              {coverUrl ? (
                <Image
                  source={{ uri: coverUrl }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  transition={300}
                />
              ) : (
                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(255,255,255,0.05)",
                  }}
                >
                  <Image
                    source="sf:music.note"
                    style={{ width: 64, height: 64 }}
                    tintColor="rgba(255,255,255,0.2)"
                  />
                </View>
              )}
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              paddingHorizontal: 24,
            }}
          >
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text
                style={{
                  color: "#fff",
                  fontSize: 22,
                  fontWeight: "700",
                }}
                numberOfLines={1}
              >
                {title}
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 16,
                  marginTop: 4,
                }}
                numberOfLines={1}
              >
                {artists}
              </Text>
            </View>
            <Pressable
              hitSlop={12}
              style={({ pressed }) => ({
                opacity: pressed ? 0.5 : 1,
                marginTop: 4,
              })}
              onPress={() => {
                haptic();
                toggleFavorite(currentTrack);
              }}
            >
              <Image
                source={isFav ? "sf:heart.fill" : "sf:heart"}
                style={{ width: 24, height: 24 }}
                tintColor={isFav ? "#fc3c44" : "rgba(255,255,255,0.7)"}
              />
            </Pressable>
          </View>

          <View style={{ marginTop: 24 }}>
            <SeekBar />
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 32,
              marginTop: 16,
            }}
          >
            <Pressable
              onPress={() => {
                haptic();
                toggleShuffle();
              }}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <Image
                source="sf:shuffle"
                style={{ width: 22, height: 22 }}
                tintColor={isShuffle ? "#fff" : "rgba(255,255,255,0.5)"}
              />
            </Pressable>

            <AnimatedPressable
              onPress={() => {
                haptic();
                skipPrev();
              }}
              onPressIn={prevPress.onPressIn}
              onPressOut={prevPress.onPressOut}
              style={prevPress.animatedStyle}
            >
              <Image
                source="sf:backward.fill"
                style={{ width: 32, height: 32 }}
                tintColor="white"
              />
            </AnimatedPressable>

            <AnimatedPressable
              onPress={() => {
                haptic();
                togglePlayback();
              }}
              onPressIn={playPress.onPressIn}
              onPressOut={playPress.onPressOut}
              style={[
                {
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: "#fff",
                  alignItems: "center",
                  justifyContent: "center",
                },
                playPress.animatedStyle,
              ]}
            >
              <Image
                source={isPlaying ? "sf:pause.fill" : "sf:play.fill"}
                style={{ width: 28, height: 28 }}
                tintColor="#000"
              />
            </AnimatedPressable>

            <AnimatedPressable
              onPress={() => {
                haptic();
                skipNext();
              }}
              onPressIn={nextPress.onPressIn}
              onPressOut={nextPress.onPressOut}
              style={nextPress.animatedStyle}
            >
              <Image
                source="sf:forward.fill"
                style={{ width: 32, height: 32 }}
                tintColor="white"
              />
            </AnimatedPressable>

            <Pressable
              onPress={() => {
                haptic();
                cycleRepeatMode();
              }}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <Image
                source={repeatMode === "one" ? "sf:repeat.1" : "sf:repeat"}
                style={{ width: 22, height: 22 }}
                tintColor={
                  repeatMode !== "off" ? "#fff" : "rgba(255,255,255,0.5)"
                }
              />
            </Pressable>
          </View>

          <View style={{ flex: 1 }} />

          <VolumeSlider />
        </>
      )}
    </View>
  );
}
