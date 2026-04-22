import { NextRequest, NextResponse } from "next/server";

// Proxy audio streams from Tidal CDN.
// The CDN checks Referer/Origin and rejects requests from third-party origins.
// By proxying server-side we strip those headers — the CDN sees a plain fetch
// with no Referer/Origin and serves the audio.
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  // Only allow known Tidal CDN domains
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  const allowed = [
    "lgf.audio.tidal.com",
    "amz-pr-fa.audio.tidal.com",
    "amz-eu-fa.audio.tidal.com",
    "amz-us-fa.audio.tidal.com",
    "audio.tidal.com",
  ];

  if (!allowed.some((domain) => parsed.hostname.endsWith(domain))) {
    return new NextResponse("Domain not allowed", { status: 403 });
  }

  // Forward Range header for seeking support
  const range = request.headers.get("range");
  const headers: HeadersInit = {
    "User-Agent": "Mozilla/5.0",
  };
  if (range) headers["Range"] = range;

  const response = await fetch(url, { headers });

  if (!response.ok && response.status !== 206) {
    return new NextResponse("Upstream error", { status: response.status });
  }

  const responseHeaders = new Headers();
  // Forward relevant headers from CDN response
  for (const key of ["content-type", "content-length", "content-range", "accept-ranges"]) {
    const val = response.headers.get(key);
    if (val) responseHeaders.set(key, val);
  }
  // Allow browser to cache the audio
  responseHeaders.set("cache-control", "public, max-age=3600");

  return new NextResponse(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}
