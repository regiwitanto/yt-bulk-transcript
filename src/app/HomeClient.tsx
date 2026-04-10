"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
    if (hasVideo) return "single"; // v= always means a specific video
    if (hasList) return "playlist";
    return "unknown";
  } catch {
    return "unknown";
  }
}

interface Props {
  userEmail: string | null;
}

export default function HomeClient({ userEmail }: Props) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Single video result
  const [transcript, setTranscript] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string | null>(null);
  const [videoChannel, setVideoChannel] = useState<string | null>(null);
  const [fetchDuration, setFetchDuration] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    },
    [],
  );

  async function copyTranscript() {
    if (!transcript) return;
    await navigator.clipboard.writeText(transcript);
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  }

  async function handleExtract(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setTranscript(null);
    setVideoTitle(null);
    setVideoChannel(null);
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
        if (!userEmail) {
          setError("__playlist_login__");
          setLoading(false);
          return;
        }
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
        if (data.duplicate) {
          if (data.newVideos > 0) {
            setInfo(
              `${data.newVideos} new video${data.newVideos !== 1 ? "s" : ""} found and queued. Redirecting…`,
            );
            router.push(`/dashboard/${data.playlistId}`);
          } else {
            setError(
              "You've already transcribed this playlist. View it in your history.",
            );
          }
          return;
        }
        router.push(`/dashboard/${data.playlistId}`);
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
        setVideoTitle(data.title ?? null);
        setVideoChannel(data.channelName ?? null);
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

    // Strip characters invalid in filenames on Windows/macOS/Linux: \ / : * ? " < > |
    const sanitize = (s: string) => s.replace(/[\\/:*?"<>|]/g, "").trim();

    const channel = videoChannel ? sanitize(videoChannel) : null;
    const title = videoTitle
      ? sanitize(videoTitle)
      : (() => {
          try {
            const parsed = new URL(url);
            return (
              parsed.searchParams.get("v") ||
              parsed.pathname.split("/").filter(Boolean).pop() ||
              "video"
            );
          } catch {
            return "video";
          }
        })();

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

    const prefix = channel ? `${channel} - ${title}` : title;
    a.download = `${prefix} - ${ts}.txt`;
    a.click();
    URL.revokeObjectURL(blobUrl);
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background border-b px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="font-bold text-lg tracking-tight hover:opacity-80 transition-opacity"
        >
          YouTube Bulk Transcript
        </Link>
        <div className="flex items-center gap-3">
          {userEmail ? (
            <>
              <Link
                href="/history"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                History
              </Link>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {userEmail}
              </span>
              <button
                type="button"
                disabled={signingOut}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                )}
                onClick={async () => {
                  setSigningOut(true);
                  await fetch("/api/auth/signout", { method: "POST" });
                  window.location.href = "/";
                }}
              >
                {signingOut ? "Signing out…" : "Sign Out"}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center gap-6">
        <div className="max-w-2xl space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Extract transcripts from any YouTube video or playlist
          </h1>
          <p className="text-muted-foreground text-lg">
            Paste a YouTube URL and download the transcript as a .txt file.
          </p>
        </div>

        <div className="w-full max-w-xl flex flex-col gap-3">
          <form onSubmit={handleExtract} className="flex flex-col gap-3">
            <label htmlFor="yt-url" className="sr-only">
              YouTube URL
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="yt-url"
                  type="url"
                  placeholder="https://youtube.com/playlist?list=PL... or watch?v=..."
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (!e.target.value.trim()) {
                      setTranscript(null);
                      setFetchDuration(null);
                      setError("");
                    }
                  }}
                  className="pr-8"
                  disabled={loading}
                  aria-describedby={error ? "yt-url-error" : undefined}
                />
                {url && !loading && (
                  <button
                    type="button"
                    onClick={() => {
                      setUrl("");
                      setTranscript(null);
                      setFetchDuration(null);
                      setError("");
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Clear"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 8.586L6.707 5.293a1 1 0 00-1.414 1.414L8.586 10l-3.293 3.293a1 1 0 101.414 1.414L10 11.414l3.293 3.293a1 1 0 001.414-1.414L11.414 10l3.293-3.293a1 1 0 00-1.414-1.414L10 8.586z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>
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
                {error === "__playlist_login__" ? (
                  <>
                    Playlist extraction requires an account.{" "}
                    <Link href="/login" className="underline hover:opacity-80">
                      Sign in for free
                    </Link>{" "}
                    to use it. Single videos work without one.
                  </>
                ) : (
                  error
                )}
              </p>
            )}
            {!error &&
              !loading &&
              url &&
              (() => {
                const type = detectUrlType(url);
                if (type === "unknown") return null;
                return (
                  <p className="text-xs text-muted-foreground text-left">
                    Detected:{" "}
                    {type === "playlist" ? "Playlist" : "Single video"}
                  </p>
                );
              })()}
            {info && (
              <p
                className="text-sm text-muted-foreground text-left"
                role="status"
              >
                {info}
              </p>
            )}
          </form>

          {transcript && (
            <div className="w-full flex flex-col gap-2 text-left border rounded-lg px-4 py-3">
              <div>
                {videoTitle && (
                  <p className="font-semibold text-sm truncate">{videoTitle}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {videoChannel}
                  {videoChannel && fetchDuration !== null && " · "}
                  {fetchDuration !== null &&
                    `Fetched in ${(fetchDuration / 1000).toFixed(1)}s`}
                </p>
              </div>
              <textarea
                readOnly
                value={transcript}
                rows={10}
                aria-label="Transcript"
                className="w-full rounded-md border bg-muted px-3 py-2 text-sm font-mono resize-y"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={copyTranscript}
                  className="flex-1"
                >
                  {copied ? "Copied!" : "Copy"}
                </Button>
                <Button
                  variant="outline"
                  onClick={downloadSingle}
                  className="flex-1"
                >
                  Download (.txt)
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="w-full max-w-2xl pt-6 border-t">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground text-center mb-4">
            How it works
          </p>
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
