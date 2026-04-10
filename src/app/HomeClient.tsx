"use client";

import { Fragment, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const PLAYLIST_STEPS = [
  { title: "Paste playlist URL", desc: "Any public YouTube playlist" },
  { title: "We fetch transcripts", desc: "Each video processed in sequence" },
  { title: "Download as .txt", desc: "One clean file, ready to use" },
];

const SINGLE_STEPS = [
  { title: "Paste video URL", desc: "Any public YouTube video" },
  { title: "We fetch the transcript", desc: "Captions extracted instantly" },
  { title: "Read or download", desc: "Copy it or save as .txt" },
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

interface Props {
  userEmail: string | null;
}

type Tab = "playlist" | "single";

export default function HomeClient({ userEmail }: Props) {
  const [tab, setTab] = useState<Tab>("playlist");

  // Playlist state
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [playlistError, setPlaylistError] = useState("");
  const [playlistLoading, setPlaylistLoading] = useState(false);

  // Single video state
  const [videoUrl, setVideoUrl] = useState("");
  const [videoError, setVideoError] = useState("");
  const [videoLoading, setVideoLoading] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [fetchDuration, setFetchDuration] = useState<number | null>(null);

  async function handleExtractPlaylist(e: React.FormEvent) {
    e.preventDefault();
    setPlaylistError("");
    if (!playlistUrl.trim()) {
      setPlaylistError("Please enter a YouTube playlist URL.");
      return;
    }
    setPlaylistLoading(true);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: playlistUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPlaylistError(
          data.error ??
            "Something went wrong. Make sure the playlist is public and the URL contains ?list=",
        );
        return;
      }
      window.location.href = `/dashboard/${data.playlistId}`;
    } catch {
      setPlaylistError(
        "Network error. Please check your connection and try again.",
      );
    } finally {
      setPlaylistLoading(false);
    }
  }

  async function handleExtractSingle(e: React.FormEvent) {
    e.preventDefault();
    setVideoError("");
    setTranscript(null);
    setFetchDuration(null);
    if (!videoUrl.trim()) {
      setVideoError("Please enter a YouTube video URL.");
      return;
    }
    setVideoLoading(true);
    try {
      const t0 = Date.now();
      const res = await fetch("/api/single-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVideoError(data.error ?? "Failed to fetch transcript.");
        return;
      }
      setFetchDuration(Date.now() - t0);
      setTranscript(data.transcript);
    } catch {
      setVideoError(
        "Network error. Please check your connection and try again.",
      );
    } finally {
      setVideoLoading(false);
    }
  }

  function downloadSingle() {
    if (!transcript) return;
    const blob = new Blob([transcript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const slug = videoUrl
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60)
      .toLowerCase();
    a.download = `${slug}-transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight">
          YouTube Bulk Transcript
        </span>
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
            {tab === "playlist"
              ? "Paste a playlist URL and download every transcript as a single .txt file."
              : "Paste a video URL and download its transcript as a .txt file."}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-lg border overflow-hidden w-fit">
          <button
            onClick={() => setTab("playlist")}
            className={cn(
              "px-5 py-2 text-sm font-medium transition-colors",
              tab === "playlist"
                ? "bg-foreground text-background"
                : "bg-background text-foreground hover:bg-muted",
            )}
          >
            Playlist
          </button>
          <button
            onClick={() => setTab("single")}
            className={cn(
              "px-5 py-2 text-sm font-medium transition-colors",
              tab === "single"
                ? "bg-foreground text-background"
                : "bg-background text-foreground hover:bg-muted",
            )}
          >
            Single Video
          </button>
        </div>

        {tab === "playlist" ? (
          <form
            onSubmit={handleExtractPlaylist}
            className="w-full max-w-xl flex flex-col gap-3"
          >
            <label htmlFor="playlist-url" className="sr-only">
              YouTube Playlist URL
            </label>
            <div className="flex gap-2">
              <Input
                id="playlist-url"
                type="url"
                placeholder="https://youtube.com/playlist?list=PL..."
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                className="flex-1"
                disabled={playlistLoading}
                aria-describedby={playlistError ? "playlist-error" : undefined}
              />
              <Button
                type="submit"
                disabled={playlistLoading}
                className="flex items-center gap-2"
              >
                {playlistLoading ? (
                  <>
                    <Spinner /> Fetching
                  </>
                ) : (
                  "Extract Transcripts"
                )}
              </Button>
            </div>
            {playlistError && (
              <p
                id="playlist-error"
                className="text-sm text-destructive text-left"
                role="alert"
              >
                {playlistError}
              </p>
            )}
          </form>
        ) : (
          <div className="w-full max-w-xl flex flex-col gap-4">
            <form
              onSubmit={handleExtractSingle}
              className="flex flex-col gap-3"
            >
              <label htmlFor="video-url" className="sr-only">
                YouTube Video URL
              </label>
              <div className="flex gap-2">
                <Input
                  id="video-url"
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="flex-1"
                  disabled={videoLoading}
                  aria-describedby={videoError ? "video-error" : undefined}
                />
                <Button
                  type="submit"
                  disabled={videoLoading}
                  className="flex items-center gap-2"
                >
                  {videoLoading ? (
                    <>
                      <Spinner /> Fetching
                    </>
                  ) : (
                    "Extract Transcript"
                  )}
                </Button>
              </div>
              {videoError && (
                <p
                  id="video-error"
                  className="text-sm text-destructive text-left"
                  role="alert"
                >
                  {videoError}
                </p>
              )}
            </form>

            {transcript && (
              <div className="flex flex-col gap-3 text-left">
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
          </div>
        )}

        {/* How it works */}
        <div className="w-full max-w-2xl pt-6 border-t">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
            {(tab === "playlist" ? PLAYLIST_STEPS : SINGLE_STEPS).map(
              (step, i) => (
                <Fragment key={i}>
                  <div className="flex flex-col items-center gap-2 text-center flex-1">
                    <div className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-bold shrink-0">
                      {i + 1}
                    </div>
                    <p className="font-semibold text-sm">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.desc}</p>
                  </div>
                  {i < 2 && (
                    <div className="text-muted-foreground sm:mt-3 rotate-90 sm:rotate-0"></div>
                  )}
                </Fragment>
              ),
            )}
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
