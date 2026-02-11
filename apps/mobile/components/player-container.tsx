import { useCallback } from "react";
import { Dimensions, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { usePlayerStore } from "@/stores/player-store";
import { MiniPlayer } from "@/components/mini-player";
import { FullscreenPlayer } from "@/components/fullscreen-player";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const MINI_HEIGHT = 66;
const SNAP_THRESHOLD = 0.3;
const SPRING_CONFIG = { damping: 20, stiffness: 200, mass: 0.8 };

export function PlayerContainer({ tabBarHeight }: { tabBarHeight: number }) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const progress = useSharedValue(0);
  const startY = useSharedValue(0);

  const expand = useCallback(() => {
    progress.value = withSpring(1, SPRING_CONFIG);
  }, [progress]);

  const collapse = useCallback(() => {
    progress.value = withSpring(0, SPRING_CONFIG);
  }, [progress]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startY.value = progress.value;
    })
    .onUpdate((e) => {
      const dragProgress = -e.translationY / (SCREEN_HEIGHT - MINI_HEIGHT);
      progress.value = Math.max(0, Math.min(1, startY.value + dragProgress));
    })
    .onEnd((e) => {
      const velocity = -e.velocityY / (SCREEN_HEIGHT - MINI_HEIGHT);
      if (velocity > 0.5 || (progress.value > SNAP_THRESHOLD && velocity > -0.5)) {
        progress.value = withSpring(1, SPRING_CONFIG);
      } else {
        progress.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const containerStyle = useAnimatedStyle(() => ({
    height: interpolate(
      progress.value,
      [0, 1],
      [MINI_HEIGHT, SCREEN_HEIGHT]
    ),
    bottom: interpolate(
      progress.value,
      [0, 1],
      [tabBarHeight + 4, 0]
    ),
    boxShadow: progress.value < 0.3 ? "0 -2px 12px rgba(0,0,0,0.3)" : "none",
  }));

  const miniOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.3], [1, 0]),
    pointerEvents: progress.value < 0.3 ? "auto" as const : "none" as const,
  }));

  const fullOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.3, 0.6], [0, 1]),
    pointerEvents: progress.value > 0.3 ? "auto" as const : "none" as const,
  }));

  const tabBarAnimStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(progress.value, [0, 0.5], [0, tabBarHeight]),
      },
    ],
    opacity: interpolate(progress.value, [0, 0.3], [1, 0]),
  }));

  if (!currentTrack) return null;

  return (
    <>
      <Animated.View style={[{ position: "absolute", left: 0, right: 0 }, tabBarAnimStyle]}>
        {null}
      </Animated.View>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.container,
            containerStyle,
          ]}
        >
          <Animated.View style={[StyleSheet.absoluteFill, miniOpacity]}>
            <MiniPlayer onExpand={expand} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, fullOpacity]}>
            <FullscreenPlayer onCollapse={collapse} />
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "#000",
    zIndex: 10,
    overflow: "hidden",
  },
});
