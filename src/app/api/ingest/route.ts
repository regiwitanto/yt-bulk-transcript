import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import { extractPlaylistId, fetchPlaylistInfo } from "@/lib/playlist";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { url } = body as { url?: string };

  if (!url) {
    return NextResponse.json(
      { error: "Missing required field: url" },
      { status: 400 },
    );
  }

  // Get authenticated user (null if not signed in)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  // 1. Extract playlist ID from URL
  const playlistId = extractPlaylistId(url);
  if (!playlistId) {
    return NextResponse.json(
      {
        error: "Invalid YouTube playlist URL. Make sure it contains ?list=...",
      },
      { status: 400 },
    );
  }

  // 2. Scrape playlist info (title + video list) from YouTube
  let playlistInfo;
  try {
    playlistInfo = await fetchPlaylistInfo(playlistId);
    console.log(
      `[ingest] Fetched ${playlistInfo.videos.length} videos for playlist ${playlistId}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch playlist from YouTube", detail: message },
      { status: 502 },
    );
  }

  if (playlistInfo.videos.length === 0) {
    return NextResponse.json(
      { error: "Playlist is empty or private" },
      { status: 422 },
    );
  }

  // 3. Insert playlist row
  const { data: playlist, error: playlistError } = await supabaseAdmin
    .from("playlists")
    .insert({
      user_id: userId ?? null,
      url,
      title: playlistInfo.title,
      channel_name: playlistInfo.channelName,
      status: "pending",
    })
    .select()
    .single();

  if (playlistError || !playlist) {
    return NextResponse.json(
      { error: "Failed to save playlist", detail: playlistError?.message },
      { status: 500 },
    );
  }

  // 4. Insert all videos as queued rows, in chunks of 100 (PostgREST limit guard)
  const videoRows = playlistInfo.videos.map((v) => ({
    playlist_id: playlist.id,
    yt_video_id: v.videoId,
    title: v.title,
    status: "queued" as const,
    retry_count: 0,
  }));

  const CHUNK_SIZE = 100;
  for (let i = 0; i < videoRows.length; i += CHUNK_SIZE) {
    const chunk = videoRows.slice(i, i + CHUNK_SIZE);
    const { error: videosError } = await supabaseAdmin
      .from("videos")
      .insert(chunk);
    if (videosError) {
      return NextResponse.json(
        { error: "Failed to save videos", detail: videosError.message },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    playlistId: playlist.id,
    title: playlistInfo.title,
    totalVideos: playlistInfo.videos.length,
  });
}
