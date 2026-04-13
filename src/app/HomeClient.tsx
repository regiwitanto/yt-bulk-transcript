"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const STEPS = [
  { title: "Paste any YouTube URL", desc: "Playlist or single video" },
  { title: "We detect & fetch", desc: "Auto-detects what you pasted" },
  { title: "Download as .txt or .json", desc: "One clean file, ready to use" },
];

const USE_CASES = [
  { icon: "🎓", title: "Students", desc: "Save lecture notes without rewatching hours of video" },
  { icon: "📝", title: "Content Creators", desc: "Repurpose videos into blogs, newsletters, and threads" },
  { icon: "🤖", title: "AI & LLM", desc: "Build structured JSON datasets ready for AI ingestion" },
  { icon: "🎧", title: "Podcasters", desc: "Read and search episode transcripts instantly" },
  { icon: "🌍", title: "Language Learners", desc: "Study real speech patterns from authentic content" },
  { icon: "📊", title: "Researchers", desc: "Analyze and compare content across entire channels" },
];

// Examples shown to new users — single video for guests (no login needed),
// playlist for signed-in users who can extract full playlists.
const EXAMPLE_VIDEO_URL = "https://www.youtube.com/watch?v=jNQXAC9IVRw"; // "Me at the Zoo" — first ever YouTube video
const EXAMPLE_PLAYLIST_URL =
  "https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab"; // 3Blue1Brown: Essence of Linear Algebra

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

/** Returns true when a URL has both v= (specific video) and list= (playlist). */
function isVideoInPlaylist(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    return (
      parsed.searchParams.has("v") && parsed.searchParams.has("list")
    );
  } catch {
    return false;
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
  const [needsLogin, setNeedsLogin] = useState(false);

  // Single video result
  const [transcript, setTranscript] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
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
    setNeedsLogin(false);
    setTranscript(null);
    setVideoId(null);
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
          setNeedsLogin(true);
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
        setVideoId(data.videoId ?? null);
        setVideoTitle(data.title ?? null);
        setVideoChannel(data.channelName ?? null);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function downloadSingle(format: "txt" | "json") {
    if (!transcript) return;

    const sanitize = (s: string) => s.replace(/[\\/:*?"<>|]/g, "").trim();
    const channel = videoChannel ? sanitize(videoChannel) : null;
    const safeTitle = videoTitle
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
    const prefix = channel ? `${channel} - ${safeTitle}` : safeTitle;

    let content: string;
    let mime: string;
    if (format === "json") {
      const payload = {
        video: {
          title: videoTitle ?? null,
          channel: videoChannel ?? null,
          url: videoId
            ? `https://www.youtube.com/watch?v=${videoId}`
            : url,
          exported_at: new Date().toISOString(),
        },
        transcript,
      };
      content = JSON.stringify(payload, null, 2);
      mime = "application/json";
    } else {
      content = transcript;
      mime = "text/plain";
    }

    const blob = new Blob([content], { type: mime });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `${prefix} - ${ts}.${format}`;
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
          <ThemeToggle />
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center gap-5">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground bg-muted/60">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" aria-hidden="true" />
            Free &middot; No API key &middot; Single videos need no account
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Extract transcripts from any YouTube video or playlist
          </h1>
          <p className="text-muted-foreground text-lg">
            Paste a YouTube URL and download the transcript as <strong>.txt</strong> or <strong>.json</strong>.
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
                      setVideoId(null);
                      setFetchDuration(null);
                      setError("");
                      setNeedsLogin(false);
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
                      setVideoId(null);
                      setFetchDuration(null);
                      setError("");
                      setNeedsLogin(false);
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
            {!url && !loading && (
              <button
                type="button"
                onClick={() => {
                  setUrl(userEmail ? EXAMPLE_PLAYLIST_URL : EXAMPLE_VIDEO_URL);
                  setError("");
                  setNeedsLogin(false);
                }}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 text-left transition-colors"
              >
                {userEmail
                  ? "Try with an example playlist →"
                  : "Try with an example video (no sign-in needed) →"}
              </button>
            )}
            {(error || needsLogin) && (
              <p
                id="yt-url-error"
                className="text-sm text-destructive text-left"
                role="alert"
              >
                {needsLogin ? (
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
              !needsLogin &&
              !loading &&
              !transcript &&
              url &&
              (() => {
                const type = detectUrlType(url);
                if (type === "unknown") return null;
                const mixed = isVideoInPlaylist(url);
                return (
                  <div className="text-xs text-muted-foreground text-left space-y-1">
                    <p>
                      Detected:{" "}
                      {type === "playlist" ? "Playlist" : "Single video"}
                    </p>
                    {mixed && (
                      <p>
                        This URL points to a video inside a playlist. To
                        extract the full playlist, use the playlist URL
                        without the <code className="font-mono">v=</code>{" "}
                        parameter.
                      </p>
                    )}
                  </div>
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
            <div className="w-full flex flex-col gap-2 text-left bg-card border rounded-lg px-4 py-3">
              <div className="flex items-start gap-3">
                {videoId && (
                  <a
                    href={`https://www.youtube.com/watch?v=${videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    <img
                      src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                      alt=""
                      width={120}
                      height={68}
                      className="rounded object-cover w-[120px] h-[68px] bg-muted"
                    />
                  </a>
                )}
                <div className="min-w-0 flex-1">
                  {videoTitle && (
                    videoId ? (
                      <a
                        href={`https://www.youtube.com/watch?v=${videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-sm text-primary underline underline-offset-2 truncate flex items-center gap-1"
                      >
                        <span className="truncate">{videoTitle}</span>
                        <svg className="h-3 w-3 shrink-0 opacity-60" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
                          <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/>
                        </svg>
                      </a>
                    ) : (
                      <p className="font-semibold text-sm truncate">{videoTitle}</p>
                    )
                  )}
                  <p className="text-xs text-muted-foreground">
                    {videoChannel}
                    {videoChannel && fetchDuration !== null && " · "}
                    {fetchDuration !== null &&
                      `Fetched in ${(fetchDuration / 1000).toFixed(1)}s`}
                  </p>
                </div>
              </div>
              <textarea
                readOnly
                value={transcript}
                rows={10}
                aria-label="Transcript"
                className="w-full rounded-md border bg-muted px-3 py-2 text-sm font-mono resize-y"
              />
              <p className="text-xs text-right text-muted-foreground -mt-1">
                {transcript.split(/\s+/).filter(Boolean).length.toLocaleString()} words
                {" · "}
                {transcript.length.toLocaleString()} chars
              </p>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={copyTranscript}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    copied
                      ? "text-green-600 dark:text-green-400"
                      : "text-muted-foreground",
                  )}
                >
                  {copied ? (
                    <span className="flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Copied!
                    </span>
                  ) : "Copy text"}
                </button>
                <div className="flex gap-1.5 shrink-0">
                  <Button size="sm" onClick={() => downloadSingle("txt")}>
                    Download .txt
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => downloadSingle("json")}>
                    .json
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="w-full max-w-2xl pt-5 border-t">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
            {STEPS.map((step, i) => (
              <Fragment key={i}>
                <div className="flex flex-col items-center gap-2 text-center flex-1">
                  <div className="w-9 h-9 rounded-full border-2 border-foreground/20 bg-muted text-foreground flex items-center justify-center text-sm font-bold shrink-0">
                    {i + 1}
                  </div>
                  <p className="font-semibold text-sm">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-muted-foreground shrink-0 sm:mt-2.5 rotate-90 sm:rotate-0"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </Fragment>
            ))}
          </div>
        </div>

        {/* Use cases */}
        <section className="w-full max-w-2xl pt-8 border-t">
          <p className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-5">
            Who uses this
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
            {USE_CASES.map((uc) => (
              <div
                key={uc.title}
                className="flex flex-col gap-1.5 rounded-lg border bg-card p-3"
              >
                <span className="text-2xl leading-none">{uc.icon}</span>
                <p className="font-semibold text-sm">{uc.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {uc.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t px-6 py-4">
        <div className="flex items-center justify-center gap-3 flex-wrap text-sm text-muted-foreground">
          <span>
            Support this project:{" "}
            <a
              href={process.env.NEXT_PUBLIC_BMAC_URL ?? "https://buymeacoffee.com"}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Buy Me a Coffee
            </a>
          </span>
          <span aria-hidden="true">·</span>
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms
          </Link>
        </div>
      </footer>
    </div>
  );
}
