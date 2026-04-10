export interface PlaylistVideo {
  videoId: string;
  title: string;
}

export interface PlaylistInfo {
  title: string;
  videos: PlaylistVideo[];
}

/**
 * Extracts a playlist ID from a full YouTube playlist URL.
 * Supports formats:
 *   https://www.youtube.com/playlist?list=PLxxxxxx
 *   https://youtube.com/playlist?list=PLxxxxxx
 */
export function extractPlaylistId(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("list");
  } catch {
    return null;
  }
}

/**
 * Scrapes a YouTube playlist page and extracts all video IDs and titles
 * by parsing the embedded ytInitialData JSON blob. No external libraries needed.
 */
export async function fetchPlaylistInfo(playlistId: string): Promise<PlaylistInfo> {
  const url = `https://www.youtube.com/playlist?list=${playlistId}`;

  const response = await fetch(url, {
    headers: {
      // Present as a real browser to get the full page with ytInitialData
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`YouTube responded with status ${response.status}`);
  }

  const html = await response.text();

  // Extract the ytInitialData JSON that YouTube embeds in every page.
  // We slice the string manually to avoid needing the dotAll (`s`) regex flag.
  const markerIndex = html.indexOf("var ytInitialData = ");
  const jsonStart = markerIndex !== -1 ? html.indexOf("{", markerIndex) : -1;
  const jsonEnd = jsonStart !== -1 ? html.indexOf("</script>", jsonStart) : -1;
  const rawJson = jsonStart !== -1 && jsonEnd !== -1
    ? html.slice(jsonStart, jsonEnd).replace(/;\s*$/, "").trimEnd()
    : null;
  const match = rawJson ? [null, rawJson] : null;
  if (!match) {
    throw new Error("Could not find ytInitialData in page. YouTube may have changed its structure.");
  }

  const data = JSON.parse(match[1]!);

  // Navigate the ytInitialData tree to find video entries
  const contents: unknown[] =
    data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]
      ?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]
      ?.itemSectionRenderer?.contents?.[0]
      ?.playlistVideoListRenderer?.contents ?? [];

  if (contents.length === 0) {
    throw new Error("No videos found. The playlist may be private or empty.");
  }

  const videos: PlaylistVideo[] = [];

  for (const item of contents) {
    const renderer = (item as Record<string, unknown>).playlistVideoRenderer as
      | Record<string, unknown>
      | undefined;
    if (!renderer) continue;

    const videoId = renderer.videoId as string | undefined;
    const titleRuns = (renderer.title as Record<string, unknown> | undefined)?.runs as
      | { text: string }[]
      | undefined;
    const title = titleRuns?.[0]?.text ?? "Untitled";

    if (videoId) {
      videos.push({ videoId, title });
    }
  }

  // Playlist title
  const playlistTitle: string =
    data?.header?.playlistHeaderRenderer?.title?.simpleText ??
    data?.metadata?.playlistMetadataRenderer?.title ??
    "Untitled Playlist";

  return { title: playlistTitle, videos };
}
