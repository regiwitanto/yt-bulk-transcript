"use client";

import { Fragment, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const STEPS = [
  { title: "Paste any YouTube URL", desc: "Playlist or single video" },
  { title: "We detect & fetch", desc: "Auto-detects what you pasted" },
  { title: "Download as .txt", desc: "One clean file, ready to use" },
];

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
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
  );
}

function detectUrlType(raw: string): "playlist" | "single" | "unknown" {
  try {
    const parsed = new URL(raw);
    const hasList = parsed.searchParams.has("list");
    const hasVideo = parsed.searchParams.has("v");
    const isYoutuBe = parsed.hostname === "youtu.be";

    if (isYoutuBe) return "single";
    if (hasList && !hasVideo) return "playlist";
    if (hasList && hasVideo) return "playlist"; // video inside a playlist â†’ treat as playlist
    if (hasVideo) return "single";
    return "unknown";
  } catch {
    return "unknown";
  }
}

interface Props {
  userEmail: string | null;
}

export default function HomeClient({ userEmail }: Props) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Single video result
  const [transcript, setTranscript] = useState<string | null>(null);
  const [fetchDuration, setFetchDuration] = useState<number | null>(null);

  async function handleExtract(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setTranscript(null);
    setFetchDuration(null);

    if (!url.trim()) {
      setError("Please enter a YouTube URL.");
      return;
    }

    const type = detectUrlType(url);
    if (type === "unknown") {
      setError(
        "Could not detect a YouTube video or playlist from that URL. Make sure it contains ?v= or ?list=",
      );
      return;
    }

    setLoading(true);
    try {
      if (type === "playlist") {
        const res = await fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Something went wrong fetching the playlist.");
          return;
        }
        window.location.href = `/dashboard/${data.playlistId}`;
      } else {
        const t0 = Date.now();
        const res = await fetch("/api/single-transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoUrl: url }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Failed to fetch transcript.");
          return;
        }
        setFetchDuration(Date.now() - t0);
        setTranscript(data.transcript);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function downloadSingle() {
    if (!transcript) return;
    const blob = new Blob([transcript], { type: "text/plain" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    let videoId: string;
    try {
      const parsed = new URL(url);
      videoId =
        parsed.searchParams.get("v") ||
        parsed.pathname.split("/").filter(Boolean).pop() ||
        "video";
    } catch {
      videoId = "video";
    }
    const date = new Date().toISOString().slice(0, 10);
    a.download = `${videoId}-transcript-${date}.txt`;
    a.click();
    URL.revokeObjectURL(blobUrl);
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <a
          href="/"
          className="font-bold text-lg tracking-tight hover:opacity-80 transition-opacity"
        >
          YouTube Bulk Transcript
        </a>
        <div className="flex items-center gap-3">
          {userEmail ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {userEmail}
              </span>
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                  )}
                >
                  Sign Out
                </button>
              </form>
            </>
          ) : (
            <a
              href="/login"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Sign In
            </a>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center gap-10">
        <div className="max-w-2xl space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            YouTube Bulk Transcript Extractor
          </h1>
          <p className="text-muted-foreground text-lg">
            Paste a playlist or video URL &mdash; we&apos;ll detect it
            automatically.
          </p>
        </div>

        <form
          onSubmit={handleExtract}
          className="w-full max-w-xl flex flex-col gap-3"
        >
          <label htmlFor="yt-url" className="sr-only">
            YouTube URL
          </label>
          <div className="flex gap-2">
            <Input
              id="yt-url"
              type="url"
              placeholder="https://youtube.com/playlist?list=PL... or watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
              disabled={loading}
              aria-describedby={error ? "yt-url-error" : undefined}
            />
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 shrink-0"
            >
              {loading ? (
                <>
                  <Spinner /> Fetching
                </>
              ) : (
                "Extract"
              )}
            </Button>
          </div>
          {error && (
            <p
              id="yt-url-error"
              className="text-sm text-destructive text-left"
              role="alert"
            >
              {error}
            </p>
          )}
        </form>

        {transcript && (
          <div className="w-full max-w-xl flex flex-col gap-3 text-left">
            {fetchDuration !== null && (
              <p className="text-xs text-muted-foreground">
                Fetched in {(fetchDuration / 1000).toFixed(1)}s
              </p>
            )}
            <textarea
              readOnly
              value={transcript}
              rows={10}
              className="w-full rounded-md border bg-muted px-3 py-2 text-sm font-mono resize-y"
            />
            <Button variant="outline" onClick={downloadSingle}>
              Download Transcript (.txt)
            </Button>
          </div>
        )}

        {/* How it works */}
        <div className="w-full max-w-2xl pt-6 border-t">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
            {STEPS.map((step, i) => (
              <Fragment key={i}>
                <div className="flex flex-col items-center gap-2 text-center flex-1">
                  <div className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-bold shrink-0">
                    {i + 1}
                  </div>
                  <p className="font-semibold text-sm">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="text-muted-foreground sm:mt-3 rotate-90 sm:rotate-0">
                    &rarr;
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t px-6 py-4 text-center text-sm text-muted-foreground">
        Support this project:{" "}
        <a
          href="https://buymeacoffee.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          Buy Me a Coffee
        </a>
      </footer>
    </div>
  );
}
