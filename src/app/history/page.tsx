import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/database.types";
import { DownloadButton } from "./DownloadButton";

type PlaylistRow = Database["public"]["Tables"]["playlists"]["Row"];
type Playlist = PlaylistRow & { video_count: number };

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch playlists with video counts
  const { data: raw } = await supabaseAdmin
    .from("playlists")
    .select("*, videos(count)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const rows: Playlist[] = (raw ?? []).map((p) => {
    const { videos, ...rest } = p as PlaylistRow & {
      videos: { count: number }[];
    };
    return { ...rest, video_count: videos?.[0]?.count ?? 0 };
  });

  const STATUS_LABEL: Record<string, string> = {
    pending: "Pending",
    processing: "Processing",
    completed: "Complete",
  };

  const STATUS_COLOR: Record<string, string> = {
    pending: "text-muted-foreground",
    processing: "text-blue-500",
    completed: "text-green-600",
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="font-bold text-lg tracking-tight hover:opacity-80 transition-opacity"
        >
          YouTube Bulk Transcript
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {user.email}
          </span>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Sign Out
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 px-6 py-10 max-w-3xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My History</h1>
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            + New Transcript
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">No transcripts yet.</p>
            <p className="text-sm mt-1">
              <Link href="/" className="underline hover:text-foreground">
                Extract your first playlist
              </Link>
            </p>
          </div>
        ) : (
          <div className="rounded-lg border divide-y">
            {rows.map((playlist) => (
              <div
                key={playlist.id}
                className="flex items-center gap-3 px-4 py-4"
              >
                <a
                  href={`/dashboard/${playlist.id}`}
                  className="flex-1 min-w-0 hover:opacity-80 transition-opacity"
                >
                  <p className="text-sm font-medium truncate">
                    {playlist.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {playlist.channel_name && (
                      <span className="mr-1">
                        {playlist.channel_name} &middot;
                      </span>
                    )}
                    {new Date(playlist.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                    {" · "}
                    {playlist.video_count} video
                    {playlist.video_count !== 1 ? "s" : ""}
                  </p>
                </a>
                <span
                  className={cn(
                    "text-xs font-medium shrink-0",
                    STATUS_COLOR[playlist.status] ?? "text-muted-foreground",
                  )}
                >
                  {STATUS_LABEL[playlist.status] ?? playlist.status}
                </span>
                {playlist.status === "completed" ? (
                  <DownloadButton playlistId={playlist.id} />
                ) : (
                  <span
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "shrink-0 opacity-40 cursor-not-allowed pointer-events-none",
                    )}
                  >
                    Download
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
