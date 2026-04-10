import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import DashboardClient from "@/app/dashboard/[playlistId]/DashboardClient";

interface Props {
  params: Promise<{ playlistId: string }>;
}

export default async function DashboardPage({ params }: Props) {
  const { playlistId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: playlist } = await supabaseAdmin
    .from("playlists")
    .select("*")
    .eq("id", playlistId)
    .single();

  if (!playlist) notFound();
  if (playlist.user_id !== user?.id) notFound();

  const { data: videos } = await supabaseAdmin
    .from("videos")
    .select("*")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: true });

  return <DashboardClient playlist={playlist} initialVideos={videos ?? []} />;
}
