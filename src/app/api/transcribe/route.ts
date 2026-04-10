import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { fetchTranscript } from "@/lib/youtube";

export const maxDuration = 60;

const MAX_RETRIES = 3;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  // getSession() validates the JWT locally from the cookie — no Supabase
  // network round-trip. Safe here because ownership was already verified
  // server-side when the dashboard page loaded. For a 50-video playlist
  // this saves 50 sequential auth HTTP requests.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    id,
    ytVideoId,
    retryCount: clientRetryCount,
  } = body as {
    id?: string;
    ytVideoId?: string;
    retryCount?: number;
  };

  if (!id || !ytVideoId) {
    return NextResponse.json(
      { error: "Missing required fields: id, ytVideoId" },
      { status: 400 },
    );
  }

  // Verify the video belongs to the session user — prevents IDOR.
  // We look up the playlist owner via a subquery on playlists.
  const { data: videoRow } = await supabaseAdmin
    .from("videos")
    .select("playlist_id")
    .eq("id", id)
    .single();
  if (!videoRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { data: playlistRow } = await supabaseAdmin
    .from("playlists")
    .select("user_id")
    .eq("id", videoRow.playlist_id)
    .single();
  if (!playlistRow || playlistRow.user_id !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Mark as processing
  await supabaseAdmin
    .from("videos")
    .update({ status: "processing" })
    .eq("id", id);

  try {
    const result = await fetchTranscript(ytVideoId);

    await supabaseAdmin
      .from("videos")
      .update({ status: "success", transcript: result.text })
      .eq("id", id);

    return NextResponse.json({ status: "success", transcript: result.text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const isNoTranscript =
      message.toLowerCase().includes("no transcript") ||
      message.toLowerCase().includes("disabled") ||
      message.toLowerCase().includes("could not find");

    // Use retry count from client to avoid an extra SELECT round-trip.
    // Fall back to a DB fetch only if not provided (e.g. direct API calls).
    let retryCount: number;
    if (clientRetryCount !== undefined) {
      retryCount = clientRetryCount + 1;
    } else {
      const { data: video } = await supabaseAdmin
        .from("videos")
        .select("retry_count")
        .eq("id", id)
        .single();
      retryCount = (video?.retry_count ?? 0) + 1;
    }

    if (isNoTranscript) {
      await supabaseAdmin
        .from("videos")
        .update({ status: "no_transcript", retry_count: retryCount })
        .eq("id", id);
      return NextResponse.json({ status: "no_transcript" });
    }

    const newStatus = retryCount >= MAX_RETRIES ? "error" : "queued";
    await supabaseAdmin
      .from("videos")
      .update({ status: newStatus, retry_count: retryCount })
      .eq("id", id);

    return NextResponse.json(
      { status: newStatus, detail: message },
      { status: newStatus === "error" ? 500 : 200 },
    );
  }
}
