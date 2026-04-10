import { NextRequest, NextResponse } from "next/server";
import { fetchTranscript } from "@/lib/youtube";

export async function GET(request: NextRequest) {
  const videoId = request.nextUrl.searchParams.get("videoId");

  if (!videoId) {
    return NextResponse.json(
      { error: "Missing required query param: videoId" },
      { status: 400 },
    );
  }

  try {
    const result = await fetchTranscript(videoId);
    console.log(
      `[test-transcript] Fetched ${result.text.length} chars for video ${videoId}`,
    );
    return NextResponse.json({ videoId, transcript: result.text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch transcript", detail: message },
      { status: 500 },
    );
  }
}
