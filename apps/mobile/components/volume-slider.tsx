import { useState, useCallback } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from "react-native-reanimated";
import { usePlayerStore } from "@/stores/player-store";

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

export function VolumeSlider() {
  const volume = usePlayerStore((s) => s.volume);
  const setVolume = usePlayerStore((s) => s.setVolume);

  const [barWidth, setBarWidth] = useState(0);
  const isDragging = useSharedValue(false);
  const dragVolume = useSharedValue(0);

  const onLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number } } }) => {
      setBarWidth(e.nativeEvent.layout.width);
    },
    []
  );

  const handleVolumeChange = useCallback(
    (v: number) => {
      setVolume(v);
    },
    [setVolume]
  );

  const panGesture = Gesture.Pan()
    .onStart((e) => {
      isDragging.value = true;
      if (barWidth > 0) {
        dragVolume.value = clamp(e.x / barWidth, 0, 1);
        runOnJS(handleVolumeChange)(clamp(e.x / barWidth, 0, 1));
      }
    })
    .onUpdate((e) => {
      if (barWidth > 0) {
        const v = clamp(e.x / barWidth, 0, 1);
        dragVolume.value = v;
        runOnJS(handleVolumeChange)(v);
      }
    })
    .onEnd(() => {
      isDragging.value = false;
    });

  const tapGesture = Gesture.Tap().onEnd((e) => {
    if (barWidth > 0) {
      const v = clamp(e.x / barWidth, 0, 1);
      dragVolume.value = v;
      runOnJS(handleVolumeChange)(v);
    }
  });

  const gesture = Gesture.Race(panGesture, tapGesture);

  const fillStyle = useAnimatedStyle(() => {
    const v = isDragging.value ? dragVolume.value : volume;
    return { width: `${v * 100}%` };
  });

  const thumbStyle = useAnimatedStyle(() => {
    const v = isDragging.value ? dragVolume.value : volume;
    return {
      left: `${v * 100}%`,
      transform: [{ translateX: -6 }, { translateY: -5 }],
    };
  });

  const speakerIcon =
    volume === 0
      ? "sf:speaker.slash.fill"
      : volume < 0.5
        ? "sf:speaker.wave.1.fill"
        : "sf:speaker.wave.2.fill";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 24,
        gap: 12,
      }}
    >
      <Image
        source={speakerIcon}
        style={{ width: 16, height: 16 }}
        tintColor="rgba(255,255,255,0.4)"
      />
      <View style={{ flex: 1 }}>
        <GestureDetector gesture={gesture}>
          <Animated.View onLayout={onLayout} style={{ position: "relative" }}>
            <View
              style={{
                height: 3,
                backgroundColor: "rgba(255,255,255,0.15)",
                borderRadius: 9999,
                marginVertical: 8,
              }}
            >
              <Animated.View
                style={[
                  fillStyle,
                  {
                    height: "100%",
                    borderRadius: 9999,
                    backgroundColor: "rgba(255,255,255,0.6)",
                  },
                ]}
              />
              <Animated.View
                style={[
                  thumbStyle,
                  {
                    position: "absolute",
                    top: 0,
                    width: 12,
                    height: 12,
                    borderRadius: 9999,
                    backgroundColor: "white",
                  },
                ]}
              />
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}
