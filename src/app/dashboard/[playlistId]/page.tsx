import { supabaseAdmin } from "@/lib/supabase-admin";
import { notFound } from "next/navigation";
import DashboardClient from "@/app/dashboard/[playlistId]/DashboardClient";

interface Props {
  params: Promise<{ playlistId: string }>;
}

export default async function DashboardPage({ params }: Props) {
  const { playlistId } = await params;

  const { data: playlist } = await supabaseAdmin
    .from("playlists")
    .select("*")
    .eq("id", playlistId)
    .single();

  if (!playlist) notFound();

  const { data: videos } = await supabaseAdmin
    .from("videos")
    .select("*")
    .eq("playlist_id", playlistId)
    .order("created_at", { ascending: true });

  return <DashboardClient playlist={playlist} initialVideos={videos ?? []} />;
}
