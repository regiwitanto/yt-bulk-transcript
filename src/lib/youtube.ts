import {
  YoutubeTranscript,
  YoutubeTranscriptNotAvailableLanguageError,
} from "youtube-transcript";

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
  async function fetchWithFallback(): Promise<string> {
    let segments;
    try {
      // Prefer English — works for most English videos in one round-trip.
      segments = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: "en",
      });
    } catch (err) {
      if (!(err instanceof YoutubeTranscriptNotAvailableLanguageError)) {
        // Propagate immediately — no transcript, rate-limited, unavailable, etc.
        throw err;
      }
      // "en" track not found by exact code. The error message contains the full
      // list of available language codes, e.g. "Available languages: ar, en-US, fr".
      // Find any en-* variant (en-US, en-GB, en-AU…) before giving up on English.
      const msg = (err as Error).message;
      const langsMatch = msg.match(/Available languages: (.+)$/);
      const availableLangs = langsMatch?.[1]?.split(", ") ?? [];
      const enVariant = availableLangs.find((l) => l.startsWith("en"));
      if (enVariant) {
        // e.g. "en-US" is at position 4 in a list where Arabic is position 0 —
        // find() picks it regardless of order.
        segments = await YoutubeTranscript.fetchTranscript(videoId, {
          lang: enVariant,
        });
      } else {
        // No English track at all — fall back to tracks[0] (primary language).
        segments = await YoutubeTranscript.fetchTranscript(videoId);
      }
    }
    return segments.map((s) => s.text).join(" ");
  }

  const text = await Promise.race([
    fetchWithFallback(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Transcript fetch timed out")), 25_000),
    ),
  ]);
  return { videoId, text };
}
