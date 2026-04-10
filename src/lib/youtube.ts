import { YoutubeTranscript } from "youtube-transcript";

export interface TranscriptResult {
  videoId: string;
  text: string;
}

/**
 * Fetches the transcript for a single YouTube video and joins all
 * segments into one plain-text string. Throws if no transcript is available.
 */
export async function fetchTranscript(
  videoId: string,
): Promise<TranscriptResult> {
  let segments;
  try {
    segments = await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" });
  } catch {
    // English not available — fall back to whatever the first track is
    segments = await YoutubeTranscript.fetchTranscript(videoId);
  }
  const text = segments.map((s) => s.text).join(" ");
  return { videoId, text };
}
