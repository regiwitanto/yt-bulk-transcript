"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/database.types";

const buttonVariantOutlineSm = cn(
  buttonVariants({ variant: "outline", size: "sm" }),
);

type Playlist = Database["public"]["Tables"]["playlists"]["Row"];
type Video = Database["public"]["Tables"]["videos"]["Row"];
type VideoStatus = Video["status"];

interface Props {
  playlist: Playlist;
  initialVideos: Video[];
}

const STATUS_BADGE: Record<
  VideoStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    spinning?: boolean;
  }
> = {
  success: { label: "Success", variant: "default" },
  processing: { label: "Processing…", variant: "secondary", spinning: true },
  queued: { label: "Queued", variant: "outline" },
  no_transcript: { label: "No Transcript", variant: "outline" },
  error: { label: "Error", variant: "destructive" },
};

export default function DashboardClient({ playlist, initialVideos }: Props) {
  const [videos, setVideos] = useState<Video[]>(initialVideos);
  const runningRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const [dismissed, setDismissed] = useState(() => {
    const alreadyDone = initialVideos.filter(
      (v) => v.status === "success" || v.status === "no_transcript",
    ).length;
    return alreadyDone === initialVideos.length && initialVideos.length > 0;
  });
  const [started, setStarted] = useState(playlist.status === "pending");
  const [videoDurations, setVideoDurations] = useState<Record<string, number>>(
    {},
  );
  const [totalSeconds, setTotalSeconds] = useState<number | null>(null);

  const done = videos.filter(
    (v) => v.status === "success" || v.status === "no_transcript",
  ).length;
  const total = videos.length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const isComplete = done === total && total > 0;

  const updateVideoStatus = useCallback(
    (
      id: string,
      status: VideoStatus,
      transcript?: string,
      durationMs?: number,
    ) => {
      setVideos((prev) =>
        prev.map((v) =>
          v.id === id
            ? { ...v, status, transcript: transcript ?? v.transcript }
            : v,
        ),
      );
      if (durationMs !== undefined) {
        setVideoDurations((prev) => ({ ...prev, [id]: durationMs }));
      }
    },
    [],
  );

  const runLoop = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    startTimeRef.current = Date.now();

    // Fire-and-forget — we don't need to wait for the DB write before
    // starting transcription. Workers begin immediately.
    fetch("/api/playlist-status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: playlist.id, status: "processing" }),
    });

    const queue = videos.filter(
      (v) => v.status === "queued" || v.status === "processing",
    );

    // Process up to CONCURRENCY videos simultaneously.
    // Each worker pulls the next unstarted video from the queue until exhausted.
    const CONCURRENCY = 5;
    let qi = 0;

    const processOne = async (video: Video, attempt = 0): Promise<void> => {
      setVideos((prev) =>
        prev.map((v) =>
          v.id === video.id ? { ...v, status: "processing" } : v,
        ),
      );
      const t0 = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 28_000);
      try {
        const res = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: video.id,
            ytVideoId: video.yt_video_id,
            retryCount: (video.retry_count ?? 0) + attempt,
          }),
          signal: controller.signal,
        });
        const result = await res.json();
        const elapsed = Date.now() - t0;
        // Transient failure — retry with exponential backoff (max 2 extra attempts)
        if (result.status === "queued" && attempt < 2) {
          const delay = 1_000 * 2 ** attempt + Math.random() * 500;
          await new Promise((r) => setTimeout(r, delay));
          return processOne(video, attempt + 1);
        }
        updateVideoStatus(
          video.id,
          result.status ?? "error",
          result.transcript,
          elapsed,
        );
      } catch {
        const elapsed = Date.now() - t0;
        updateVideoStatus(video.id, "error", undefined, elapsed);
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const worker = async () => {
      while (qi < queue.length) {
        const video = queue[qi++]; // atomic read+increment before any await
        await processOne(video);
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker),
    );

    setTotalSeconds(
      Math.round((Date.now() - (startTimeRef.current ?? Date.now())) / 1000),
    );

    // Fire-and-forget — modal appears immediately after all videos finish.
    fetch("/api/playlist-status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: playlist.id, status: "completed" }),
    });

    runningRef.current = false;
  }, [videos, updateVideoStatus, playlist.id]);

  // Keep a stable ref to the latest runLoop so the started-effect can call it
  // without becoming a dep (which would cause infinite re-runs).
  const runLoopRef = useRef(runLoop);
  useEffect(() => {
    runLoopRef.current = runLoop;
  }, [runLoop]);

  // Shared download handler — fetch+Blob so errors surface and we know when done.
  const downloadTranscripts = useCallback(async () => {
    setDownloading(true);
    setDownloadError("");
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch(
        `/api/download/${playlist.id}?tz=${encodeURIComponent(tz)}`,
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDownloadError(
          (data as { error?: string }).error ?? "Download failed. Please try again.",
        );
        return;
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? `transcripts-${playlist.id}.txt`;
      a.href = objectUrl;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setDownloading(false);
    }
  }, [playlist.id]);

  // Start processing only when user triggers it (or on mount if already complete)
  useEffect(() => {
    if (isComplete) {
      // All videos already done — ensure DB status is consistent
      fetch("/api/playlist-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: playlist.id, status: "completed" }),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (started && !isComplete) {
      // Call via ref so we always get the latest runLoop without making it
      // a dep here (which would re-run the effect on every video status change).
      runLoopRef.current();
    }
    // isComplete intentionally excluded: we only want to fire once when the
    // user clicks Resume, not re-fire whenever progress updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background border-b px-6 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-bold text-lg truncate">{playlist.title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {playlist.channel_name && (
                <span className="text-xs text-muted-foreground">
                  {playlist.channel_name}
                </span>
              )}
              {playlist.channel_name && (
                <span className="text-xs text-muted-foreground">&middot;</span>
              )}
              <span
                className={cn(
                  "text-xs font-medium",
                  isComplete
                    ? "text-green-700 dark:text-green-500"
                    : "text-muted-foreground",
                )}
              >
                {isComplete
                  ? "Complete"
                  : started
                    ? `Processing ${done} / ${total}`
                    : `${done} / ${total} done — paused`}
              </span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {isComplete && dismissed && (
              <Button
                size="sm"
                disabled={downloading}
                onClick={downloadTranscripts}
              >
                {downloading ? "Preparing…" : "Download (.txt)"}
              </Button>
            )}
            {!isComplete && !started && (
              <Button size="sm" onClick={() => setStarted(true)}>
                Resume
              </Button>
            )}
            <Link href="/history" className={buttonVariantOutlineSm}>
              History
            </Link>
            <Link href="/" className={buttonVariantOutlineSm}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5 mr-1"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Home
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground tabular-nums w-9 text-right shrink-0">
            {progress}%
          </span>
        </div>
      </header>

      {/* Video list */}
      <main className="flex-1 px-6 py-4">
        <div className="rounded-lg border divide-y">
          {videos.map((video, i) => {
            const badge = STATUS_BADGE[video.status];
            return (
              <div key={video.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xs text-muted-foreground w-8 shrink-0 text-right">
                  {i + 1}.
                </span>
                <span className="flex-1 text-sm truncate">{video.title}</span>
                {videoDurations[video.id] !== undefined && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {(videoDurations[video.id] / 1000).toFixed(1)}s
                  </span>
                )}
                <Badge
                  variant={badge.variant}
                  className="flex items-center gap-1"
                >
                  {badge.spinning && (
                    <svg
                      className="animate-spin h-3 w-3 shrink-0"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                  )}
                  {badge.label}
                </Badge>
              </div>
            );
          })}
        </div>
      </main>

      {/* Scroll-to-top button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className={cn(
            buttonVariantOutlineSm,
            "fixed bottom-6 left-1/2 -translate-x-1/2 z-40",
          )}
          aria-label="Back to top"
        >
          ↑ Top
        </button>
      )}

      {/* Completion export modal */}
      {isComplete && !dismissed && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="done-title"
        >
          <div className="bg-background rounded-xl shadow-xl p-6 max-w-md w-full space-y-4 text-center relative">
            <button
              onClick={() => setDismissed(true)}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <h2 id="done-title" className="text-2xl font-bold">
              All done!
            </h2>
            <div className="text-muted-foreground space-y-1">
              {(() => {
                const succeeded = videos.filter(
                  (v) => v.status === "success",
                ).length;
                const noTranscript = videos.filter(
                  (v) => v.status === "no_transcript",
                ).length;
                return (
                  <>
                    <p>
                      <span className="text-foreground font-medium">
                        {succeeded}
                      </span>{" "}
                      of {total} transcripts fetched
                      {totalSeconds !== null && (
                        <>
                          {" "}
                          in{" "}
                          {totalSeconds >= 60
                            ? `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`
                            : `${totalSeconds}s`}
                        </>
                      )}
                      .
                    </p>
                    {noTranscript > 0 && (
                      <p className="text-sm">
                        {noTranscript} video{noTranscript !== 1 ? "s" : ""} had
                        no transcript available.
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
            <div className="flex flex-col gap-2">
              <Button
                disabled={downloading}
                onClick={downloadTranscripts}
                size="lg"
              >
                {downloading ? "Preparing…" : "Download Transcripts (.txt)"}
              </Button>
              {downloadError && (
                <p role="alert" className="text-sm text-destructive">
                  {downloadError}
                </p>
              )}
              <Link
                href="/history"
                className={cn(buttonVariantOutlineSm, "text-center")}
              >
                View History
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              Finding this useful?{" "}
              <a
                href="https://buymeacoffee.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                Buy Me a Coffee
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
