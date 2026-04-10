import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { playlistId } = await params;
  const tz = req.nextUrl.searchParams.get("tz") ?? "UTC";

  const { data: playlist } = await supabaseAdmin
    .from("playlists")
    .select("title, channel_name, created_at, user_id")
    .eq("id", playlistId)
    .single();

  if (!playlist) {
    return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
  }

  if (playlist.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: videos } = await supabaseAdmin
    .from("videos")
    .select("title, transcript, status")
    .eq("playlist_id", playlistId)
    .eq("status", "success")
    .order("position", { ascending: true });

  if (!videos || videos.length === 0) {
    return NextResponse.json(
      { error: "No transcripts available" },
      { status: 404 },
    );
  }

  const text = videos
    .map((v, i) => `=== ${i + 1}. ${v.title} ===\n\n${v.transcript}`)
    .join("\n\n\n");

  const sanitize = (s: string) => s.replace(/[\\/:*?"<>|]/g, "").trim();
  const title = sanitize(playlist.title);
  const channel = playlist.channel_name
    ? sanitize(playlist.channel_name)
    : null;
  const prefix = channel ? `${channel} - ${title}` : title;
  const d = new Date(playlist.created_at);
  // Format in user's local timezone
  const localStr = d
    .toLocaleString("en-CA", { timeZone: tz, hour12: false })
    .replace(", ", "_")
    .replace(/:/g, "-")
    .replace(/\//g, "-");
  const ts = localStr.slice(0, 19); // YYYY-MM-DD_HH-MM-SS
  const filename = `${prefix} - ${ts}.txt`;

  return new NextResponse(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
