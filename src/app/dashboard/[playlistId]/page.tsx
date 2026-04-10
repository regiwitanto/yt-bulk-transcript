import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import DashboardClient from "@/app/dashboard/[playlistId]/DashboardClient";
import type { Database } from "@/lib/database.types";

type Video = Database["public"]["Tables"]["videos"]["Row"];

interface Props {
  params: Promise<{ playlistId: string }>;
}

export default async function DashboardPage({ params }: Props) {
  const { playlistId } = await params;

  // Fire all three requests in parallel — playlistId is known upfront.
  // Ownership check happens after they resolve; no DB round-trip savings lost.
  // Transcript text is excluded from the page load — it can be megabytes for large
  // playlists and is only needed at download time (served by /api/download).
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    { data: playlist },
    { data: videos },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabaseAdmin.from("playlists").select("*").eq("id", playlistId).single(),
    supabaseAdmin
      .from("videos")
      .select(
        "id, playlist_id, yt_video_id, title, status, retry_count, position, created_at",
      )
      .eq("playlist_id", playlistId)
      .order("position", { ascending: true }),
  ]);

  if (!playlist) notFound();
  if (playlist.user_id !== user?.id) notFound();

  return (
    <DashboardClient
      playlist={playlist}
      initialVideos={(videos ?? []) as Video[]}
    />
  );
}
