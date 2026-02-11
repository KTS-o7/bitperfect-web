# Search Components Usage

This directory contains tactile retro-styled UI components for displaying search results including tracks, albums, artists, and playlists.

## Components

### 1. SearchResults

Main container component that handles different content types.

```tsx
import { SearchResults } from '@/components/search';

// For Tracks
<SearchResults
  tracks={trackData}
  contentType="tracks"
  totalNumberOfItems={300}
  offset={0}
  limit={25}
/>

// For Albums
<SearchResults
  albums={albumData}
  contentType="albums"
  totalNumberOfItems={50}
/>

// For Artists
<SearchResults
  artists={artistData}
  contentType="artists"
/>

// For Playlists
<SearchResults
  playlists={playlistData}
  contentType="playlists"
/>
```

### 2. AlbumCard

Displays album information with cover art, title, artist, and metadata.

**Props:**

- `album`: Album object with id, title, cover, artist info, etc.
- `onClick?`: Optional callback when album is clicked

**Design Features:**

- Square album cover with hover scale effect
- Gray gradient background
- Box shadow with translation effect on hover
- Release year badge
- Track count and duration display

### 3. ArtistCard

Displays artist information with circular profile picture.

**Props:**

- `artist`: Artist object with id, name, picture, popularity, etc.
- `onClick?`: Optional callback when artist is clicked

**Design Features:**

- Circular profile picture
- Purple/pink gradient background
- Popularity progress bar
- Verified badge for popular artists (popularity > 50)
- Artist type label

### 4. PlaylistCard

Displays playlist information with cover, tracks count, and metadata.

**Props:**

- `playlist`: Playlist object with uuid, title, image, tracks, etc.
- `onClick?`: Optional callback when playlist is clicked

**Design Features:**

- Square cover with play button overlay on hover
- Green/teal gradient background
- Public/Private badge
- Track count and duration display
- Playlist type badge

## Type Definitions

### Album

```typescript
interface Album {
  id: number;
  title: string;
  cover: string;
  releaseDate?: string;
  numberOfTracks?: number;
  duration?: number;
  artist?: { id: number; name: string };
  artists?: Array<{ id: number; name: string }>;
}
```

### Artist

```typescript
interface Artist {
  id: number;
  name: string;
  picture?: string;
  type?: string;
  popularity?: number;
  bio?: string;
}
```

### Playlist

```typescript
interface Playlist {
  uuid: string;
  title: string;
  description?: string;
  image?: string;
  squareImage?: string;
  numberOfTracks?: number;
  duration?: number;
  creator?: { id: number; name: string };
  type?: string;
  publicPlaylist?: boolean;
}
```

## Design System

All cards follow a consistent tactile retro design language:

- **Box Shadows**: `shadow-[4px_4px_0px_0px_rgba(...)]` for tactile depth
- **Hover Effects**: Translate up and left with increased shadow
- **Borders**: 2px solid borders with appropriate color themes
- **Gradients**: Subtle gradient backgrounds
- **Typography**: Mix of bold headings and mono fonts for metadata
- **Color Themes**:
  - Albums: Gray tones
  - Artists: Purple/Pink
  - Playlists: Green/Teal
  - Tracks: Blue/Neutral (existing)

## View Modes

The SearchResults component supports two view modes:

- **Grid View**: Responsive grid layout (1-4 columns based on screen size)
- **List View**: Single column layout

Toggle buttons are provided in the header to switch between views.

## Example Data Structure

Based on the Tidal API response format:

```json
{
  "version": "2.0",
  "data": {
    "limit": 25,
    "offset": 0,
    "totalNumberOfItems": 300,
    "items": [
      {
        "id": 159580614,
        "title": "Tu Jaane Na",
        "duration": 342,
        "album": {
          "id": 159580603,
          "title": "Ajab Prem Ki Ghazab Kahani",
          "cover": "92319cdc-d027-4e51-95e2-713ef2d6b625"
        },
        "artist": {
          "id": 3529900,
          "name": "Pritam",
          "picture": null
        }
      }
    ]
  }
}
```

## Integration Tips

1. **Image URLs**: Convert Tidal cover IDs to full URLs:

   ```typescript
   const coverUrl = `https://resources.tidal.com/images/${cover.replace(
     /-/g,
     "/"
   )}/750x750.jpg`;
   ```

2. **Error Handling**: All image components include `onError` handlers with fallback placeholders

3. **Dark Mode**: Full dark mode support with appropriate color transitions

4. **Accessibility**: Hover states, focus indicators, and semantic HTML

5. **Performance**: Next.js Image component with proper sizing and lazy loading
