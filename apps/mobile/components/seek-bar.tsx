import { useState, useCallback } from "react";
import { View, Text } from "react-native";
import { usePlayerStore } from "@/stores/player-store";
import { formatTime } from "@bitperfect/shared";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from "react-native-reanimated";

const MONO_FONT = process.env.EXPO_OS === "ios" ? "ui-monospace" : "monospace";

export function SeekBar() {
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const seekTo = usePlayerStore((s) => s.seekTo);

  const [barWidth, setBarWidth] = useState(0);
  const isSeeking = useSharedValue(false);
  const seekProgress = useSharedValue(0);

  const onLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number } } }) => {
      setBarWidth(e.nativeEvent.layout.width);
    },
    []
  );

  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  const currentProgress =
    duration > 0 ? clamp(position / duration, 0, 1) : 0;

  const handleSeekEnd = useCallback(
    (fraction: number) => {
      if (duration > 0) {
        seekTo(fraction * duration);
      }
    },
    [duration, seekTo]
  );

  const panGesture = Gesture.Pan()
    .onStart((e) => {
      isSeeking.value = true;
      if (barWidth > 0) {
        seekProgress.value = clamp(e.x / barWidth, 0, 1);
      }
    })
    .onUpdate((e) => {
      if (barWidth > 0) {
        seekProgress.value = clamp(e.x / barWidth, 0, 1);
      }
    })
    .onEnd(() => {
      runOnJS(handleSeekEnd)(seekProgress.value);
      isSeeking.value = false;
    });

  const tapGesture = Gesture.Tap().onEnd((e) => {
    if (barWidth > 0) {
      const fraction = clamp(e.x / barWidth, 0, 1);
      seekProgress.value = fraction;
      runOnJS(handleSeekEnd)(fraction);
    }
  });

  const gesture = Gesture.Race(panGesture, tapGesture);

  const fillStyle = useAnimatedStyle(() => {
    const progress = isSeeking.value ? seekProgress.value : currentProgress;
    return {
      width: `${progress * 100}%`,
    };
  });

  const thumbStyle = useAnimatedStyle(() => {
    const progress = isSeeking.value ? seekProgress.value : currentProgress;
    return {
      left: `${progress * 100}%`,
      transform: [{ translateX: -8 }, { translateY: -6.5 }],
    };
  });

  return (
    <View style={{ paddingHorizontal: 24 }}>
      <GestureDetector gesture={gesture}>
        <Animated.View onLayout={onLayout} style={{ position: "relative" }}>
          <View
            style={{
              height: 3,
              backgroundColor: "rgba(255,255,255,0.2)",
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
                  backgroundColor: "white",
                },
              ]}
            />
            <Animated.View
              style={[
                thumbStyle,
                {
                  position: "absolute",
                  top: 0,
                  width: 16,
                  height: 16,
                  borderRadius: 9999,
                  backgroundColor: "white",
                },
              ]}
            />
          </View>
        </Animated.View>
      </GestureDetector>

      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: 12,
            fontFamily: MONO_FONT,
            fontVariant: ["tabular-nums"],
          }}
        >
          {formatTime(position)}
        </Text>
        <Text
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: 12,
            fontFamily: MONO_FONT,
            fontVariant: ["tabular-nums"],
          }}
        >
          {formatTime(duration)}
        </Text>
      </View>
    </View>
  );
}
