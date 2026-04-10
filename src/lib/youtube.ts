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
    // Try "en" first. If that exact code isn't found, the error message
    // lists all available codes — we pick the best English variant from
    // that same error (no extra network round-trip to YouTube).
    try {
      const segments = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: "en",
      });
      return segments.map((s) => s.text).join(" ");
    } catch (err) {
      if (!(err instanceof YoutubeTranscriptNotAvailableLanguageError)) {
        throw err;
      }
      // Parse available languages out of the error message and pick the
      // best English variant (en-US, en-GB, …) or fall back to tracks[0].
      const msg = (err as Error).message;
      const langsMatch = msg.match(/Available languages: (.+)$/);
      const availableLangs = langsMatch?.[1]?.split(", ") ?? [];
      const lang = availableLangs.find((l) => l.startsWith("en"));
      // lang=undefined → library picks tracks[0] (primary language)
      const segments = await YoutubeTranscript.fetchTranscript(
        videoId,
        lang ? { lang } : undefined,
      );
      return segments.map((s) => s.text).join(" ");
    }
  }

  const text = await Promise.race([
    fetchWithFallback(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Transcript fetch timed out")), 25_000),
    ),
  ]);
  return { videoId, text };
}
