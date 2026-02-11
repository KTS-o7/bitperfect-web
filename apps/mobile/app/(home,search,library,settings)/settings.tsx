import { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, Switch, Alert } from "react-native";
import * as Application from "expo-application";
import { api } from "@/lib/api";
import { getSetting, setSetting, clearRecentlyPlayed } from "@/lib/database";
import { setAudioModeAsync } from "expo-audio";

const MONO_FONT = process.env.EXPO_OS === "ios" ? "ui-monospace" : "monospace";

const QUALITY_OPTIONS = ["LOSSLESS", "HIGH", "LOW", "HI_RES_LOSSLESS"] as const;

function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      style={{
        fontFamily: MONO_FONT,
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: 1.5,
        color: "rgba(255,255,255,0.4)",
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 8,
      }}
    >
      {title}
    </Text>
  );
}

function RowGroup({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        marginHorizontal: 16,
        borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.05)",
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  );
}

function Row({
  label,
  value,
  onPress,
  isLast,
  right,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  isLast?: boolean;
  right?: React.ReactNode;
}) {
  const content = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: "rgba(255,255,255,0.08)",
      }}
    >
      <Text style={{ fontSize: 16, color: "#fff" }}>{label}</Text>
      {right ?? (
        <Text style={{ fontSize: 16, color: "rgba(255,255,255,0.4)" }}>
          {value}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

export default function SettingsScreen() {
  const [audioQuality, setAudioQuality] = useState(() =>
    getSetting("audio_quality", "LOSSLESS")
  );
  const [bgPlayback, setBgPlayback] = useState(
    () => getSetting("bg_playback", "true") === "true"
  );
  const [cacheTotal, setCacheTotal] = useState(
    () => api.getCacheStats().total
  );

  const handleQualityPress = useCallback(() => {
    Alert.alert(
      "Audio Quality",
      "Select streaming quality",
      QUALITY_OPTIONS.map((q) => ({
        text: q,
        onPress: () => {
          setAudioQuality(q);
          setSetting("audio_quality", q);
        },
        style: q === audioQuality ? ("cancel" as const) : ("default" as const),
      }))
    );
  }, [audioQuality]);

  const handleBgPlaybackToggle = useCallback(
    (value: boolean) => {
      setBgPlayback(value);
      setSetting("bg_playback", value ? "true" : "false");
      setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: value,
      });
    },
    []
  );

  const handleClearCache = useCallback(() => {
    Alert.alert("Clear Cache", "This will clear all cached data and recently played history.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          await api.clearCache();
          clearRecentlyPlayed();
          setCacheTotal(0);
        },
      },
    ]);
  }, []);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: "#000" }}
    >
      <SectionHeader title="Playback" />
      <RowGroup>
        <Row
          label="Audio Quality"
          value={audioQuality}
          onPress={handleQualityPress}
        />
        <Row
          label="Background Playback"
          isLast
          right={
            <Switch
              value={bgPlayback}
              onValueChange={handleBgPlaybackToggle}
              trackColor={{ false: "rgba(255,255,255,0.1)", true: "#fff" }}
              thumbColor={bgPlayback ? "#000" : "#888"}
            />
          }
        />
      </RowGroup>

      <SectionHeader title="Storage" />
      <RowGroup>
        <Row label="Cache" value={`${cacheTotal} items`} />
        <Row
          label="Clear Cache"
          isLast
          onPress={handleClearCache}
          right={
            <Text style={{ fontSize: 16, color: "#ff3b30" }}>Clear</Text>
          }
        />
      </RowGroup>

      <SectionHeader title="About" />
      <RowGroup>
        <Row
          label="Version"
          value={Application.nativeApplicationVersion ?? "1.0.0"}
        />
        <Row
          label="Build"
          value={Application.nativeBuildVersion ?? "1"}
          isLast
        />
      </RowGroup>

      <View style={{ height: 48 }} />
    </ScrollView>
  );
}
