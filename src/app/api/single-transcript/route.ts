import { NextRequest, NextResponse } from "next/server";
import { fetchTranscript } from "@/lib/youtube";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { videoUrl } = body as { videoUrl?: string };

  if (!videoUrl) {
    return NextResponse.json(
      { error: "Missing required field: videoUrl" },
      { status: 400 },
    );
  }

  // Extract video ID from URL or treat as raw ID
  let videoId: string | null = null;
  try {
    const url = new URL(videoUrl);
    videoId =
      url.searchParams.get("v") ??
      (url.hostname === "youtu.be" ? url.pathname.slice(1) : null);
  } catch {
    // Not a URL — treat as raw video ID
    videoId = videoUrl.trim();
  }

  if (!videoId) {
    return NextResponse.json(
      { error: "Could not extract video ID. Paste a full YouTube video URL." },
      { status: 400 },
    );
  }

  try {
    const result = await fetchTranscript(videoId);
    return NextResponse.json({ transcript: result.text, videoId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const isNoTranscript =
      message.toLowerCase().includes("no transcript") ||
      message.toLowerCase().includes("disabled") ||
      message.toLowerCase().includes("could not find");

    return NextResponse.json(
      {
        error: isNoTranscript
          ? "This video has no transcript available."
          : "Failed to fetch transcript.",
        detail: message,
      },
      { status: isNoTranscript ? 422 : 502 },
    );
  }
}
