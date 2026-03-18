/**
 * API Route: YouTube Transcript Fetcher
 *
 * GET /api/youtube/transcript?url=<youtube_url>
 *
 * Fetches the auto-generated or manual captions from a YouTube video
 * without requiring an API key. Uses YouTube's internal timedtext endpoint.
 */

import { NextRequest, NextResponse } from 'next/server';

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // raw video ID
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n/g, ' ');
}

async function fetchTranscript(videoId: string): Promise<{ text: string; title: string }> {
  // Fetch the YouTube watch page
  const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!watchRes.ok) {
    throw new Error(`Failed to fetch YouTube page: ${watchRes.status}`);
  }

  const html = await watchRes.text();

  // Extract video title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : videoId;

  // Extract ytInitialPlayerResponse
  const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;/s);
  if (!playerResponseMatch) {
    throw new Error('Could not find player data on page. The video may be age-restricted or unavailable.');
  }

  let playerResponse: Record<string, unknown>;
  try {
    playerResponse = JSON.parse(playerResponseMatch[1]);
  } catch {
    throw new Error('Failed to parse player response JSON');
  }

  // Navigate to caption tracks
  const captionTracks = (
    playerResponse?.captions as Record<string, unknown>
  )?.playerCaptionsTracklistRenderer as Record<string, unknown>;

  const tracks = captionTracks?.captionTracks as Array<{
    baseUrl: string;
    languageCode: string;
    name?: { simpleText?: string };
    kind?: string;
  }>;

  if (!tracks?.length) {
    throw new Error('No captions available for this video. The video may not have subtitles enabled.');
  }

  // Prefer manual English, then auto-generated English, then first available
  const track =
    tracks.find(t => t.languageCode === 'en' && t.kind !== 'asr') ||
    tracks.find(t => t.languageCode === 'en') ||
    tracks.find(t => t.languageCode?.startsWith('en')) ||
    tracks[0];

  // Fetch the timedtext XML
  const transcriptRes = await fetch(track.baseUrl);
  if (!transcriptRes.ok) {
    throw new Error(`Failed to fetch transcript: ${transcriptRes.status}`);
  }

  const xml = await transcriptRes.text();

  // Parse XML text elements into plain text
  const segments = xml.match(/<text[^>]*>([^<]*)<\/text>/g) || [];
  const text = segments
    .map(seg => decodeHtmlEntities(seg.replace(/<[^>]+>/g, '')))
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) {
    throw new Error('Transcript is empty after parsing');
  }

  return { text, title };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing required parameter: url' }, { status: 400 });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return NextResponse.json(
      { error: 'Invalid YouTube URL. Supported formats: youtube.com/watch?v=ID, youtu.be/ID' },
      { status: 400 }
    );
  }

  try {
    const { text, title } = await fetchTranscript(videoId);
    return NextResponse.json({
      success: true,
      videoId,
      title,
      transcript: text,
      charCount: text.length,
      wordCount: text.split(/\s+/).length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error fetching transcript';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
