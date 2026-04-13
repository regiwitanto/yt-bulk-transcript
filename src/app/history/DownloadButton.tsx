"use client";

import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DownloadButton({ playlistId }: { playlistId: string }) {
  const [downloading, setDownloading] = useState<"txt" | "json" | null>(null);

  function handleDownload(format: "txt" | "json") {
    if (downloading) return;
    setDownloading(format);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    window.location.href = `/api/download/${playlistId}?format=${format}&tz=${encodeURIComponent(tz)}`;
    setTimeout(() => setDownloading(null), 5000);
  }

  const baseClass = cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0");
  const busy = downloading !== null;

  return (
    <div className="flex shrink-0">
      {/* .txt button */}
      <button
        onClick={() => handleDownload("txt")}
        disabled={busy}
        title="Download as plain text"
        className={cn(
          baseClass,
          "rounded-r-none border-r-0",
          busy && "opacity-60 cursor-not-allowed",
        )}
      >
        {downloading === "txt" ? "…" : ".txt"}
      </button>

      {/* .json button */}
      <button
        onClick={() => handleDownload("json")}
        disabled={busy}
        title="Download as JSON (structured, AI-ready)"
        className={cn(
          baseClass,
          "rounded-l-none",
          busy && "opacity-60 cursor-not-allowed",
        )}
      >
        {downloading === "json" ? "…" : ".json"}
      </button>
    </div>
  );
}
