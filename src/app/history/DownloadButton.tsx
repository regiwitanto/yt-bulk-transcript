"use client";

import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DownloadButton({ playlistId }: { playlistId: string }) {
  const [downloading, setDownloading] = useState(false);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    setDownloading(true);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    window.location.href = `/api/download/${playlistId}?tz=${encodeURIComponent(tz)}`;
    setTimeout(() => setDownloading(false), 5000);
  }

  return (
    <a
      href={`/api/download/${playlistId}`}
      onClick={downloading ? (e) => e.preventDefault() : handleClick}
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "shrink-0",
        downloading && "opacity-60 pointer-events-none",
      )}
      title="Download transcripts"
    >
      {downloading ? "Preparing…" : "Download"}
    </a>
  );
}
