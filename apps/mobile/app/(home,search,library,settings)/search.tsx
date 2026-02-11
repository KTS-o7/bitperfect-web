import { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, ScrollView, ActivityIndicator } from "react-native";
import { useNavigation } from "expo-router";
import { Image } from "expo-image";
import { TrackRow } from "@/components/track-row";
import { AlbumCard } from "@/components/album-card";
import { ArtistRow } from "@/components/artist-row";
import { useSearchAll } from "@/hooks/use-search-all";
import { usePlayerStore } from "@/stores/player-store";
import type { Track, Album, Artist } from "@bitperfect/shared/api/types";

const MONO_FONT = process.env.EXPO_OS === "ios" ? "ui-monospace" : "monospace";

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigation = useNavigation();
  const { tracks, albums, artists, loading } = useSearchAll(searchQuery);
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

  const handleTrackPress = useCallback(
    (track: Track) => {
      playTrack(track, tracks);
    },
    [playTrack, tracks],
  );

  const renderItem = useCallback(
    ({ item }: { item: Track }) => <TrackRow track={item} onPress={handleTrackPress} />,
    [handleTrackPress],
  );

  const keyExtractor = useCallback((item: Track) => String(item.id), []);

  const isSearching = searchQuery.trim().length > 0;

  if (!isSearching) {
    return <SearchPrompt />;
  }

  const hasResults = tracks.length > 0 || albums.length > 0 || artists.length > 0;

  return (
    <FlatList
      data={tracks}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: "#000" }}
      contentContainerStyle={{ paddingBottom: 96 }}
      keyboardDismissMode="on-drag"
      ListHeaderComponent={
        <ListHeader
          artists={artists}
          albums={albums}
          hasTracks={tracks.length > 0}
          loading={loading}
        />
      }
      ListEmptyComponent={
        loading ? <LoadingState /> : hasResults ? null : <EmptySearchState />
      }
    />
  );
}

function ListHeader({
  artists,
  albums,
  hasTracks,
  loading,
}: {
  artists: Artist[];
  albums: Album[];
  hasTracks: boolean;
  loading: boolean;
}) {
  if (loading && artists.length === 0 && albums.length === 0 && !hasTracks) {
    return null;
  }

  return (
    <View>
      {artists.length > 0 && (
        <View>
          <SectionHeader title="ARTISTS" />
          {artists.map((artist) => (
            <ArtistRow key={artist.id} artist={artist} />
          ))}
        </View>
      )}

      {albums.length > 0 && (
        <View>
          <SectionHeader title="ALBUMS" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 8 }}
          >
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </ScrollView>
        </View>
      )}

      {hasTracks && <SectionHeader title="SONGS" />}
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 }}>
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
    </View>
  );
}

function SearchPrompt() {
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
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

function EmptySearchState() {
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
  );
}
