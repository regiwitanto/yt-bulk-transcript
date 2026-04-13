import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/database.types";
import HistoryClient from "./HistoryClient";
import { SignOutButton } from "./SignOutButton";
import { ThemeToggle } from "@/components/theme-toggle";

type PlaylistRow = Database["public"]["Tables"]["playlists"]["Row"];
type Playlist = PlaylistRow & { video_count: number };

const PAGE_SIZE = 10;

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: raw, count: totalCount } = await supabaseAdmin
    .from("playlists")
    .select("*, videos(count)", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  const totalPages = Math.ceil((totalCount ?? 0) / PAGE_SIZE);

  const rows: Playlist[] = (raw ?? []).map((p) => {
    const { videos, ...rest } = p as PlaylistRow & {
      videos: { count: number }[];
    };
    return { ...rest, video_count: videos?.[0]?.count ?? 0 };
  });

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-30 bg-background border-b px-6 py-4 flex items-center justify-between">
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
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      <main className="flex-1 px-6 py-10 max-w-3xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My History</h1>
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            New Transcript
          </Link>
        </div>

        <HistoryClient
          key={page}
          initialRows={rows}
          page={page}
          totalPages={totalPages}
          totalCount={totalCount ?? 0}
        />
      </main>
    </div>
  );
}
