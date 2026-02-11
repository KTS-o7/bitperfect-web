import { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { usePlayerStore } from "@/stores/player-store";
import { api } from "@/lib/api";
import type { SyncedLyric } from "@bitperfect/shared/api/types";

const LINE_HEIGHT = 48;

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

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 200 }}
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
                fontSize: i === activeIndex ? 24 : 20,
                fontWeight: i === activeIndex ? "700" : "500",
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
