import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || '';
  const artist = searchParams.get('artist') || '';
  const album = searchParams.get('album') || '';
  const duration = searchParams.get('duration') || '';
  const source = searchParams.get('source') || 'apple,lyricsplus,musixmatch,spotify';

  const lyricsUrl = `https://lyricsplus.prjktla.workers.dev/v2/lyrics/get?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}&album=${encodeURIComponent(album)}&duration=${encodeURIComponent(duration)}&source=${encodeURIComponent(source)}`;

  try {
    const response = await fetch(lyricsUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch lyrics' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Lyrics proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
