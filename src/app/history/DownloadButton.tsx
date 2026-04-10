"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DownloadButton({ playlistId }: { playlistId: string }) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    window.location.href = `/api/download/${playlistId}?tz=${encodeURIComponent(tz)}`;
  }

  return (
    <a
      href={`/api/download/${playlistId}`}
      onClick={handleClick}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
      title="Download transcripts"
    >
      Download
    </a>
  );
}
