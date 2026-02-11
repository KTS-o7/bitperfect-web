# NativeWind to StyleSheet Migration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove NativeWind/Tailwind CSS and replace all `className` props with standard React Native `StyleSheet.create` inline styles across the mobile app.

**Architecture:** Direct 1:1 replacement of Tailwind utility classes with equivalent React Native style objects. Imports switch from custom `@/src/tw` wrappers back to `react-native` and `expo-image` directly. NativeWind config, dependencies, and wrapper components are deleted.

**Tech Stack:** React Native StyleSheet, expo-image, expo-router

---

### Task 1: Remove NativeWind Configuration & Dependencies

**Files:**
- Delete: `apps/mobile/src/global.css`
- Delete: `apps/mobile/nativewind-env.d.ts`
- Delete: `apps/mobile/postcss.config.mjs`
- Delete: `apps/mobile/src/tw/index.tsx`
- Delete: `apps/mobile/src/tw/image.tsx`
- Modify: `apps/mobile/metro.config.js`
- Modify: `apps/mobile/tsconfig.json`
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/package.json`

**Step 1: Update metro.config.js — remove NativeWind wrapper**

```js
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [monorepoRoot];

// Resolve from local node_modules first, then monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Pin react/react-native to the mobile app's copies to prevent duplicates
const pinnedModules = {
  react: path.resolve(projectRoot, "node_modules/react"),
  "react-native": path.resolve(projectRoot, "node_modules/react-native"),
};

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (pinnedModules[moduleName]) {
    return {
      type: "sourceFile",
      filePath: require.resolve(moduleName, { paths: [projectRoot] }),
    };
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
```

**Step 2: Update tsconfig.json — remove nativewind-env.d.ts**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"]
}
```

**Step 3: Update app/_layout.tsx — remove CSS import**

Remove line 1: `import "@/src/global.css";`

**Step 4: Remove NativeWind dependencies from package.json**

Remove these from `dependencies`:
- `"@tailwindcss/postcss": "^4.1.18"`
- `"nativewind": "^5.0.0-preview.2"`
- `"react-native-css": "^0.0.0-nightly.5ce6396"`
- `"tailwind-merge": "^3.4.0"`
- `"tailwindcss": "^4.1.18"`

Also remove `"clsx": "^2.1.1"` (no longer needed without className merging).

**Step 5: Delete NativeWind files**

```bash
rm apps/mobile/src/global.css
rm apps/mobile/nativewind-env.d.ts
rm apps/mobile/postcss.config.mjs
rm -rf apps/mobile/src/tw/
```

**Step 6: Run npm install to clean lockfile**

```bash
cd apps/mobile && npm install
```

**Step 7: Commit**

```bash
git add -A apps/mobile/src/tw apps/mobile/src/global.css apps/mobile/nativewind-env.d.ts apps/mobile/postcss.config.mjs apps/mobile/metro.config.js apps/mobile/tsconfig.json apps/mobile/app/_layout.tsx apps/mobile/package.json apps/mobile/package-lock.json
git commit -m "chore(mobile): remove nativewind config, wrappers, and dependencies"
```

---

### Task 2: Convert library.tsx and settings.tsx (simplest screens)

**Files:**
- Modify: `apps/mobile/app/(home,search,library,settings)/library.tsx`
- Modify: `apps/mobile/app/(home,search,library,settings)/settings.tsx`

**Step 1: Rewrite library.tsx**

```tsx
import { ScrollView, Text } from "react-native";

export default function LibraryScreen() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: "#000" }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      <Text style={{ color: "#fff", fontSize: 16 }}>Library</Text>
    </ScrollView>
  );
}
```

**Step 2: Rewrite settings.tsx**

```tsx
import { ScrollView, Text } from "react-native";

export default function SettingsScreen() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: "#000" }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      <Text style={{ color: "#fff", fontSize: 16 }}>Settings</Text>
    </ScrollView>
  );
}
```

**Step 3: Commit**

```bash
git add apps/mobile/app/\(home,search,library,settings\)/library.tsx apps/mobile/app/\(home,search,library,settings\)/settings.tsx
git commit -m "refactor(mobile): migrate library and settings screens to StyleSheet"
```

---

### Task 3: Convert album/[id].tsx

**Files:**
- Modify: `apps/mobile/app/(home,search,library,settings)/album/[id].tsx`

**Step 1: Rewrite album/[id].tsx**

```tsx
import { useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import { ScrollView, Text } from "react-native";

export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <>
      <Stack.Screen options={{ title: "Album" }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: "#000" }}
        contentContainerStyle={{ padding: 16, gap: 16 }}
      >
        <Text style={{ color: "#fff", fontSize: 16 }}>Album {id}</Text>
      </ScrollView>
    </>
  );
}
```

**Step 2: Commit**

```bash
git add "apps/mobile/app/(home,search,library,settings)/album/[id].tsx"
git commit -m "refactor(mobile): migrate album screen to StyleSheet"
```

---

### Task 4: Convert seek-bar.tsx

**Files:**
- Modify: `apps/mobile/components/seek-bar.tsx`

**Step 1: Rewrite seek-bar.tsx**

Replace `@/src/tw` imports with `react-native`. Convert all `className` to `style` props. Uses inline styles per Expo guidelines (prefer inline over `StyleSheet.create` unless reusing).

```tsx
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

  const remaining = duration - position;

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
            fontFamily: process.env.EXPO_OS === "ios" ? "ui-monospace" : "monospace",
            fontVariant: ["tabular-nums"],
          }}
        >
          {formatTime(position)}
        </Text>
        <Text
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: 12,
            fontFamily: process.env.EXPO_OS === "ios" ? "ui-monospace" : "monospace",
            fontVariant: ["tabular-nums"],
          }}
        >
          -{formatTime(remaining > 0 ? remaining : 0)}
        </Text>
      </View>
    </View>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/components/seek-bar.tsx
git commit -m "refactor(mobile): migrate seek-bar to StyleSheet"
```

---

### Task 5: Convert track-row.tsx

**Files:**
- Modify: `apps/mobile/components/track-row.tsx`

**Key conversions:**
- `active:opacity-60` → Pressable `style` function: `({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]`
- `object-cover` on Image → `contentFit="cover"` prop
- `font-mono` → `fontFamily: process.env.EXPO_OS === "ios" ? "ui-monospace" : "monospace"`
- `tabular-nums` → `fontVariant: ["tabular-nums"]`
- `text-white/90` → `color: "rgba(255,255,255,0.9)"`

**Step 1: Rewrite track-row.tsx**

```tsx
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

export function TrackRow({
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
}
```

**Step 2: Commit**

```bash
git add apps/mobile/components/track-row.tsx
git commit -m "refactor(mobile): migrate track-row to StyleSheet"
```

---

### Task 6: Convert mini-player.tsx

**Files:**
- Modify: `apps/mobile/components/mini-player.tsx`

**Step 1: Rewrite mini-player.tsx**

```tsx
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
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);

  if (!currentTrack) return null;

  const coverUrl = currentTrack.album?.cover
    ? api.getCoverUrl(currentTrack.album.cover, "160")
    : null;
  const title = getTrackTitle(currentTrack);
  const artists = getTrackArtists(currentTrack);
  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

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
        backgroundColor: "#000",
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.1)",
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
    </Pressable>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/components/mini-player.tsx
git commit -m "refactor(mobile): migrate mini-player to StyleSheet"
```

---

### Task 7: Convert lyrics-view.tsx

**Files:**
- Modify: `apps/mobile/components/lyrics-view.tsx`

**Key conversion:** Conditional `className` for active/inactive lyrics lines → conditional style arrays.

**Step 1: Rewrite lyrics-view.tsx**

```tsx
import { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { usePlayerStore } from "@/stores/player-store";
import { api } from "@/lib/api";
import { getTrackTitle, getTrackArtists } from "@bitperfect/shared";
import type { SyncedLyric } from "@bitperfect/shared/api/types";

const LINE_HEIGHT = 32;

export function LyricsView() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const position = usePlayerStore((s) => s.position);
  const [lyrics, setLyrics] = useState<SyncedLyric[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const activeIndexRef = useRef(-1);

  useEffect(() => {
    if (!currentTrack) {
      setLyrics([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLyrics([]);

    api.fetchLyrics(currentTrack).then((data) => {
      if (cancelled) return;
      setLyrics(data?.parsed ?? []);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [currentTrack?.id]);

  const activeIndex = lyrics.length > 0
    ? lyrics.reduce((acc, lyric, i) => (lyric.time <= position ? i : acc), -1)
    : -1;

  useEffect(() => {
    if (activeIndex >= 0 && activeIndex !== activeIndexRef.current) {
      activeIndexRef.current = activeIndex;
      scrollViewRef.current?.scrollTo({
        y: activeIndex * LINE_HEIGHT,
        animated: true,
      });
    }
  }, [activeIndex]);

  if (!currentTrack) return null;

  const title = getTrackTitle(currentTrack);
  const artists = getTrackArtists(currentTrack);
  const coverUrl = currentTrack.album?.cover
    ? api.getCoverUrl(currentTrack.album.cover, "160")
    : null;

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            overflow: "hidden",
            backgroundColor: "rgba(255,255,255,0.05)",
          }}
        >
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Image
                source="sf:music.note"
                style={{ width: 24, height: 24 }}
                tintColor="rgba(255,255,255,0.2)"
              />
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
          <Text
            style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {artists}
          </Text>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 80,
            }}
          >
            <ActivityIndicator color="rgba(255,255,255,0.5)" />
          </View>
        ) : lyrics.length === 0 ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 80,
            }}
          >
            <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 16 }}>
              No lyrics available
            </Text>
          </View>
        ) : (
          lyrics.map((line, i) => (
            <Text
              key={i}
              style={{
                lineHeight: LINE_HEIGHT,
                paddingHorizontal: 24,
                color: i === activeIndex ? "#fff" : "rgba(255,255,255,0.3)",
                fontSize: i === activeIndex ? 18 : 16,
                fontWeight: i === activeIndex ? "700" : "400",
              }}
            >
              {line.text || "\u00A0"}
            </Text>
          ))
        )}
      </ScrollView>
    </View>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/components/lyrics-view.tsx
git commit -m "refactor(mobile): migrate lyrics-view to StyleSheet"
```

---

### Task 8: Convert fullscreen-player.tsx

**Files:**
- Modify: `apps/mobile/components/fullscreen-player.tsx`

**Key conversions:**
- `active:opacity-60` on Pressable → `style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}`
- `Dimensions.get("window")` → keep as-is (already used for ART_SIZE calculation)
- `object-cover` → `contentFit="cover"` prop on Image

**Step 1: Rewrite fullscreen-player.tsx**

```tsx
import { View, Text, Pressable, Dimensions } from "react-native";
import { Image } from "expo-image";
import { usePlayerStore } from "@/stores/player-store";
import { api } from "@/lib/api";
import { getTrackTitle, getTrackArtists, deriveTrackQuality } from "@bitperfect/shared";
import * as Haptics from "expo-haptics";
import { SeekBar } from "@/components/seek-bar";
import { LyricsView } from "@/components/lyrics-view";

interface FullscreenPlayerProps {
  onCollapse: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ART_SIZE = Math.min(SCREEN_WIDTH - 48, 300);
const MONO_FONT = process.env.EXPO_OS === "ios" ? "ui-monospace" : "monospace";

function haptic() {
  if (process.env.EXPO_OS === "ios") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export function FullscreenPlayer({ onCollapse }: FullscreenPlayerProps) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlayback = usePlayerStore((s) => s.togglePlayback);
  const skipNext = usePlayerStore((s) => s.skipNext);
  const skipPrev = usePlayerStore((s) => s.skipPrev);
  const showLyrics = usePlayerStore((s) => s.showLyrics);
  const toggleLyrics = usePlayerStore((s) => s.toggleLyrics);

  if (!currentTrack) return null;

  const title = getTrackTitle(currentTrack);
  const artists = getTrackArtists(currentTrack);
  const quality = deriveTrackQuality(currentTrack);
  const coverUrl = currentTrack.album?.cover
    ? api.getCoverUrl(currentTrack.album.cover, "640")
    : null;

  if (showLyrics) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", paddingTop: 12, paddingBottom: 40 }}>
        <Pressable
          onPress={onCollapse}
          style={{ alignItems: "center", marginTop: 12 }}
        >
          <View
            style={{
              width: 36,
              height: 5,
              borderRadius: 9999,
              backgroundColor: "rgba(255,255,255,0.3)",
            }}
          />
        </Pressable>

        <LyricsView />

        <View style={{ marginTop: 16 }}>
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
            onPress={() => { haptic(); skipPrev(); }}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Image source="sf:backward.fill" style={{ width: 28, height: 28 }} tintColor="white" />
          </Pressable>
          <Pressable
            onPress={() => { haptic(); togglePlayback(); }}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Image
              source={isPlaying ? "sf:pause.fill" : "sf:play.fill"}
              style={{ width: 44, height: 44 }}
              tintColor="white"
            />
          </Pressable>
          <Pressable
            onPress={() => { haptic(); skipNext(); }}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Image source="sf:forward.fill" style={{ width: 28, height: 28 }} tintColor="white" />
          </Pressable>
        </View>

        <View style={{ alignItems: "center", marginTop: 16 }}>
          <Pressable
            onPress={() => { haptic(); toggleLyrics(); }}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Image source="sf:quote.bubble" style={{ width: 22, height: 22 }} tintColor="white" />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000", paddingTop: 12, paddingBottom: 40 }}>
      <Pressable
        onPress={onCollapse}
        style={{ alignItems: "center", marginTop: 12 }}
      >
        <View
          style={{
            width: 36,
            height: 5,
            borderRadius: 9999,
            backgroundColor: "rgba(255,255,255,0.3)",
          }}
        />
      </Pressable>

      <View style={{ alignItems: "center", marginTop: 32, marginBottom: 24 }}>
        <View
          style={{
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.1)",
            overflow: "hidden",
            width: ART_SIZE,
            height: ART_SIZE,
          }}
        >
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={200}
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
                style={{ width: 48, height: 48 }}
                tintColor="rgba(255,255,255,0.2)"
              />
            </View>
          )}
        </View>
      </View>

      <Text
        style={{
          color: "#fff",
          fontSize: 18,
          fontWeight: "700",
          textAlign: "center",
          paddingHorizontal: 24,
        }}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {title}
      </Text>
      <Text
        style={{
          color: "rgba(255,255,255,0.5)",
          fontSize: 14,
          textAlign: "center",
          paddingHorizontal: 24,
          marginTop: 4,
        }}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {artists}
      </Text>

      {quality && (
        <View
          style={{
            alignSelf: "center",
            marginTop: 8,
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
          onPress={() => { haptic(); skipPrev(); }}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Image source="sf:backward.fill" style={{ width: 28, height: 28 }} tintColor="white" />
        </Pressable>

        <Pressable
          onPress={() => { haptic(); togglePlayback(); }}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Image
            source={isPlaying ? "sf:pause.fill" : "sf:play.fill"}
            style={{ width: 44, height: 44 }}
            tintColor="white"
          />
        </Pressable>

        <Pressable
          onPress={() => { haptic(); skipNext(); }}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Image source="sf:forward.fill" style={{ width: 28, height: 28 }} tintColor="white" />
        </Pressable>
      </View>

      <View style={{ alignItems: "center", marginTop: 32 }}>
        <Pressable
          onPress={() => { haptic(); toggleLyrics(); }}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Image
            source="sf:quote.bubble"
            style={{ width: 22, height: 22 }}
            tintColor="rgba(255,255,255,0.5)"
          />
        </Pressable>
      </View>
    </View>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/components/fullscreen-player.tsx
git commit -m "refactor(mobile): migrate fullscreen-player to StyleSheet"
```

---

### Task 9: Convert home.tsx

**Files:**
- Modify: `apps/mobile/app/(home,search,library,settings)/home.tsx`

**Step 1: Rewrite home.tsx**

```tsx
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { TrackRow } from "@/components/track-row";
import { useRecentlyPlayed } from "@/hooks/use-recently-played";
import { usePlayerStore } from "@/stores/player-store";
import type { Track } from "@bitperfect/shared/api/types";

const MONO_FONT = process.env.EXPO_OS === "ios" ? "ui-monospace" : "monospace";

export default function HomeScreen() {
  const {
    tracks: recentTracks,
    loading: recentLoading,
  } = useRecentlyPlayed();
  const playTrack = usePlayerStore((s) => s.playTrack);

  const handleTrackPress = (track: Track) => {
    playTrack(track, recentTracks);
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: "#000" }}
      contentContainerStyle={{ paddingBottom: 96 }}
    >
      <RecentlyPlayedSection
        tracks={recentTracks}
        loading={recentLoading}
        onTrackPress={handleTrackPress}
      />
    </ScrollView>
  );
}

function RecentlyPlayedSection({
  tracks,
  loading,
  onTrackPress,
}: {
  tracks: Track[];
  loading: boolean;
  onTrackPress: (track: Track) => void;
}) {
  return (
    <View>
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
          RECENTLY PLAYED
        </Text>
        {tracks.length > 0 && (
          <Text
            style={{
              fontSize: 11,
              fontFamily: MONO_FONT,
              color: "rgba(255,255,255,0.3)",
              fontVariant: ["tabular-nums"],
            }}
          >
            {tracks.length}
          </Text>
        )}
      </View>

      {loading ? (
        <View style={{ paddingVertical: 40, alignItems: "center" }}>
          <ActivityIndicator color="rgba(255,255,255,0.5)" />
        </View>
      ) : tracks.length === 0 ? (
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
      ) : (
        tracks.map((track) => (
          <TrackRow key={track.id} track={track} onPress={onTrackPress} />
        ))
      )}
    </View>
  );
}
```

**Step 2: Commit**

```bash
git add "apps/mobile/app/(home,search,library,settings)/home.tsx"
git commit -m "refactor(mobile): migrate home screen to StyleSheet"
```

---

### Task 10: Convert search.tsx

**Files:**
- Modify: `apps/mobile/app/(home,search,library,settings)/search.tsx`

**Step 1: Rewrite search.tsx**

```tsx
import { useState, useEffect } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useNavigation } from "expo-router";
import { Image } from "expo-image";
import { TrackRow } from "@/components/track-row";
import { useSearchTracks } from "@/hooks/use-search";
import { usePlayerStore } from "@/stores/player-store";
import type { Track } from "@bitperfect/shared/api/types";

const MONO_FONT = process.env.EXPO_OS === "ios" ? "ui-monospace" : "monospace";

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigation = useNavigation();
  const {
    results,
    loading: searchLoading,
    total,
  } = useSearchTracks(searchQuery);
  const playTrack = usePlayerStore((s) => s.playTrack);

  useEffect(() => {
    navigation.setOptions({
      headerSearchBarOptions: {
        placeholder: "Search music...",
        autoCapitalize: "none",
        hideWhenScrolling: false,
        textColor: "#fff",
        tintColor: "#fff",
        hintTextColor: "rgba(255,255,255,0.4)",
        headerIconColor: "#fff",
        onChangeText: (e: { nativeEvent: { text: string } }) => {
          setSearchQuery(e.nativeEvent.text);
        },
        onCancelButtonPress: () => {
          setSearchQuery("");
        },
      },
    });
  }, [navigation]);

  const handleTrackPress = (track: Track) => {
    playTrack(track, results);
  };

  const isSearching = searchQuery.trim().length > 0;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: "#000" }}
      contentContainerStyle={{ paddingBottom: 96 }}
      keyboardDismissMode="on-drag"
    >
      {isSearching ? (
        <SearchResultsSection
          results={results}
          loading={searchLoading}
          total={total}
          onTrackPress={handleTrackPress}
        />
      ) : (
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
              source="sf:magnifyingglass"
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
              SEARCH MUSIC
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
              Find tracks, albums, and artists
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function SearchResultsSection({
  results,
  loading,
  total,
  onTrackPress,
}: {
  results: Track[];
  loading: boolean;
  total: number;
  onTrackPress: (track: Track) => void;
}) {
  return (
    <View>
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
          {loading ? "SEARCHING..." : `${total} RESULTS`}
        </Text>
      </View>

      {loading ? (
        <View style={{ paddingVertical: 40, alignItems: "center" }}>
          <ActivityIndicator color="rgba(255,255,255,0.5)" />
        </View>
      ) : results.length === 0 ? (
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
              source="sf:magnifyingglass"
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
              NO RESULTS
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
              Try different keywords
            </Text>
          </View>
        </View>
      ) : (
        results.map((track) => (
          <TrackRow key={track.id} track={track} onPress={onTrackPress} />
        ))
      )}
    </View>
  );
}
```

**Step 2: Commit**

```bash
git add "apps/mobile/app/(home,search,library,settings)/search.tsx"
git commit -m "refactor(mobile): migrate search screen to StyleSheet"
```

---

### Task 11: Verify build and test

**Step 1: Start Metro bundler to verify no import errors**

```bash
cd apps/mobile && npx expo start --clear
```

**Step 2: Verify no remaining NativeWind references**

```bash
grep -r "className" apps/mobile/app/ apps/mobile/components/ --include="*.tsx" --include="*.ts"
grep -r "@/src/tw" apps/mobile/ --include="*.tsx" --include="*.ts"
grep -r "nativewind" apps/mobile/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json"
```

Expected: No matches for any of the above.

**Step 3: Final commit if any fixups needed**

```bash
git add -A apps/mobile/
git commit -m "chore(mobile): verify nativewind fully removed, clean up"
```

---

## Tailwind → StyleSheet Conversion Reference

| Tailwind | StyleSheet |
|----------|-----------|
| `flex-1` | `flex: 1` |
| `flex-row` | `flexDirection: "row"` |
| `items-center` | `alignItems: "center"` |
| `justify-center` | `justifyContent: "center"` |
| `justify-between` | `justifyContent: "space-between"` |
| `self-center` | `alignSelf: "center"` |
| `gap-N` | `gap: N * 4` |
| `px-N` | `paddingHorizontal: N * 4` |
| `py-N` | `paddingVertical: N * 4` |
| `pt-N` | `paddingTop: N * 4` |
| `pb-N` | `paddingBottom: N * 4` |
| `mt-N` | `marginTop: N * 4` |
| `mb-N` | `marginBottom: N * 4` |
| `p-N` | `padding: N * 4` |
| `w-N` | `width: N * 4` |
| `h-N` | `height: N * 4` |
| `w-full` | `width: "100%"` |
| `h-full` | `height: "100%"` |
| `max-w-[300px]` | `maxWidth: 300` |
| `bg-black` | `backgroundColor: "#000"` |
| `bg-white/5` | `backgroundColor: "rgba(255,255,255,0.05)"` |
| `text-white` | `color: "#fff"` |
| `text-white/50` | `color: "rgba(255,255,255,0.5)"` |
| `border-white/10` | `borderColor: "rgba(255,255,255,0.1)"` |
| `border` | `borderWidth: 1` |
| `border-b` | `borderBottomWidth: 1` |
| `border-t` | `borderTopWidth: 1` |
| `text-lg` | `fontSize: 18` |
| `text-base` | `fontSize: 16` |
| `text-sm` | `fontSize: 14` |
| `text-xs` | `fontSize: 12` |
| `text-[15px]` | `fontSize: 15` |
| `font-bold` | `fontWeight: "700"` |
| `font-semibold` | `fontWeight: "600"` |
| `font-medium` | `fontWeight: "500"` |
| `font-mono` | `fontFamily: MONO_FONT` (platform-specific) |
| `uppercase` | `textTransform: "uppercase"` |
| `text-center` | `textAlign: "center"` |
| `tracking-widest` | `letterSpacing: 1.5` |
| `tracking-wider` | `letterSpacing: 0.8` |
| `tracking-wide` | `letterSpacing: 0.5` |
| `tabular-nums` | `fontVariant: ["tabular-nums"]` |
| `rounded-full` | `borderRadius: 9999` |
| `overflow-hidden` | `overflow: "hidden"` |
| `object-cover` | `contentFit: "cover"` (expo-image prop) |
| `active:opacity-60` | `style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}` |
| `contentContainerClassName` | `contentContainerStyle` prop |
