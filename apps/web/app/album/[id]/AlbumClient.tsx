"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Album, Track } from "@/lib/api/types";
import {
  useAudioPlayer,
  usePlaybackState,
  useQueue,
} from "@/contexts/AudioPlayerContext";
import { Play, Pause, Music2, Heart } from "lucide-react";
import { getTrackTitle, getTrackArtists, formatTime } from "@/lib/api/utils";
import { AudioPlayer } from "@/components/player/AudioPlayer";
import { Header } from "@/components/layout/Header";
import { usePersistence } from "@/contexts/PersistenceContext";

interface AlbumClientProps {
  album: Album;
  tracks: Track[];
}

export function AlbumClient({ album, tracks }: AlbumClientProps) {
  const router = useRouter();

  // Use split contexts for state
  const { isPlaying } = usePlaybackState();
  const { currentTrack } = useQueue();

  // Still need AudioPlayerContext for methods
  const { setQueue, togglePlayPause } = useAudioPlayer();

  const { toggleLikeTrack, isLiked } = usePersistence();

  const handlePlayAlbum = () => {
    if (tracks.length > 0) {
      setQueue(tracks, 0);
    }
  };

  const handlePlayTrack = (track: Track, index: number) => {
    if (currentTrack?.id === track.id) {
      togglePlayPause();
    } else {
      setQueue(tracks, index);
    }
  };

  const totalDuration = tracks.reduce((acc, track) => acc + track.duration, 0);
  const formatTotalDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs} hr ${mins} min`;
    return `${mins} min`;
  };

  const coverUrl = album?.cover
    ? `https://resources.tidal.com/images/${album.cover.replace(
      /-/g,
      "/"
    )}/1280x1280.jpg`
    : null;

  const artistName =
    album?.artist?.name || album?.artists?.[0]?.name || "Unknown Artist";

  const year = album?.releaseDate
    ? new Date(album.releaseDate).getFullYear()
    : null;

  const isAlbumPlaying =
    currentTrack && tracks.some((t) => t.id === currentTrack.id);

  return (
    <div className="relative min-h-screen w-full bg-background text-foreground transition-colors duration-300">
      <Header showBack />

      {/* Content Container */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Album Header Section - Brutalist Layout */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-12 mb-12 pb-8 border-b border-foreground/10">
          {/* Album Art - Square with Border */}
          <div className="relative shrink-0 w-[280px] md:w-[320px] aspect-square border border-foreground/10 overflow-hidden bg-foreground/5">
            {coverUrl ? (
              <Image
                src={coverUrl}
                alt={album.title}
                width={320}
                height={320}
                sizes="(max-width: 768px) 280px, 320px"
                quality={90}
                className="object-cover"
                priority={true}
              />
            ) : (
              <div className="w-full h-full bg-foreground/5 flex items-center justify-center">
                <Music2 className="w-20 h-20 text-foreground/20" />
              </div>
            )}
          </div>

          {/* Album Info */}
          <div className="flex-1 min-w-0 space-y-6">
            <div>
              <div className="text-[9px] tracking-widest uppercase text-foreground/40 font-mono mb-3">
                Album
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-medium text-foreground tracking-tight leading-tight mb-4">
                {album.title}
              </h1>

              <div className="text-base text-foreground/70 mb-4">{artistName}</div>

              {/* Album Metadata Grid */}
              <div className="flex items-center gap-6 pt-4 border-t border-foreground/10">
                {year && (
                  <div>
                    <div className="text-[9px] tracking-widest uppercase text-foreground/40 font-mono mb-1">
                      Year
                    </div>
                    <div className="text-sm font-mono tabular-nums text-foreground/70">
                      {year}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-[9px] tracking-widest uppercase text-foreground/40 font-mono mb-1">
                    Tracks
                  </div>
                  <div className="text-sm font-mono tabular-nums text-foreground/70">
                    {tracks.length}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] tracking-widest uppercase text-foreground/40 font-mono mb-1">
                    Duration
                  </div>
                  <div className="text-sm font-mono tabular-nums text-foreground/70">
                    {formatTotalDuration(totalDuration)}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={handlePlayAlbum}
                className="px-6 py-3 border-2 border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background transition-all flex items-center gap-2 font-mono uppercase text-xs tracking-widest"
              >
                {isAlbumPlaying && isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Play Album</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Track List - Brutalist Table */}
        <div className="border-t border-foreground/10">
          {/* Table Header */}
          <div className="sticky top-[73px] z-20 bg-background/95 backdrop-blur-xl border-b border-foreground/10">
            <div className="grid grid-cols-[40px_1fr_40px] lg:grid-cols-[50px_1fr_120px_80px_40px] gap-4 px-6 py-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">
                #
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">
                Title
              </span>
              <span className="hidden md:block text-[10px] font-mono uppercase tracking-widest text-foreground/40 text-right">
                Album
              </span>
              <span className="hidden lg:block text-[10px] font-mono uppercase tracking-widest text-foreground/40 text-right">
                Plays
              </span>
              <span className="hidden lg:block text-[10px] font-mono uppercase tracking-widest text-foreground/40 text-right">
                Time
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-foreground/40 text-right">

              </span>
            </div>
          </div>

          {/* Track Rows */}
          <div>
            {tracks.map((track, index) => {
              const isCurrent = currentTrack?.id === track.id;

              return (
                <div
                  key={track.id}
                  onClick={() => handlePlayTrack(track, index)}
                  className={`grid grid-cols-[40px_1fr_40px] lg:grid-cols-[50px_1fr_120px_80px_40px] gap-4 items-center px-6 py-3 border-b border-foreground/10 cursor-pointer transition-all duration-200 hover:bg-foreground/[0.02] ${isCurrent
                    ? "border-l-[3px] border-l-foreground pl-[21px]"
                    : "border-l-[3px] border-l-transparent"
                    }`}
                >
                  {/* Track Number */}
                  <div className="text-center">
                    <span
                      className={`text-sm font-mono ${isCurrent ? "text-foreground" : "text-foreground/40"
                        }`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  {/* Title & Artist */}
                  <div className="min-w-0">
                    <h3
                      className={`font-medium text-[15px] truncate transition-colors ${isCurrent
                        ? "text-foreground"
                        : "text-foreground/90 hover:text-foreground"
                        }`}
                    >
                      {getTrackTitle(track)}
                    </h3>
                    <p
                      className={`text-[13px] truncate transition-colors ${isCurrent
                        ? "text-foreground/70"
                        : "text-foreground/50 hover:text-foreground/70"
                        }`}
                    >
                      {getTrackArtists(track)}
                    </p>
                  </div>

                  {/* Album - Hidden on mobile */}
                  <div className="hidden md:block min-w-0 text-right">
                    <span className="text-[13px] text-foreground/30 italic truncate block">
                      {album.title}
                    </span>
                  </div>

                  {/* Popularity - Hidden on mobile */}
                  <div className="hidden lg:block text-right">
                    <span className="text-[12px] font-mono text-foreground/40 tabular-nums">
                      {track.popularity || "-"}
                    </span>
                  </div>

                  {/* Duration - Hidden on mobile */}
                  <div className="hidden lg:block text-right">
                    <span className="text-[12px] font-mono text-foreground/40 tabular-nums">
                      {formatTime(track.duration)}
                    </span>
                  </div>

                  {/* Like Button */}
                  <div className="text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLikeTrack(track);
                      }}
                      className="p-2 transition-transform active:scale-95 group/heart"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 transition-all ${isLiked(track.id)
                          ? "fill-red-500 text-red-500 scale-110"
                          : "text-foreground/20 group-hover/heart:text-foreground/40 group-hover/heart:scale-110"
                          }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fixed Audio Player */}
      <AudioPlayer />
    </div>
  );
}
