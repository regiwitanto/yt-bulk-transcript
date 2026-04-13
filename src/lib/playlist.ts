export interface PlaylistVideo {
  videoId: string;
  title: string;
}

export interface PlaylistInfo {
  title: string;
  channelName: string | null;
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

const YT_BROWSE_URL = "https://www.youtube.com/youtubei/v1/browse";
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

/** Extract a string value from inline HTML using a simple key:"value" pattern. */
function extractInlineValue(html: string, key: string): string | null {
  const idx = html.indexOf(`"${key}":"`);
  if (idx === -1) return null;
  const start = idx + key.length + 4; // skip key":"
  const end = html.indexOf('"', start);
  return end !== -1 ? html.slice(start, end) : null;
}

function extractVideosFromContents(contents: unknown[]): {
  videos: PlaylistVideo[];
  continuationToken: string | null;
} {
  const videos: PlaylistVideo[] = [];
  let continuationToken: string | null = null;

  for (const item of contents) {
    const obj = item as Record<string, unknown>;

    // Normal video entry
    const renderer = obj.playlistVideoRenderer as
      | Record<string, unknown>
      | undefined;
    if (renderer) {
      const videoId = renderer.videoId as string | undefined;
      const titleRuns = (renderer.title as Record<string, unknown> | undefined)
        ?.runs as { text: string }[] | undefined;
      const title = titleRuns?.[0]?.text ?? "Untitled";
      if (videoId) videos.push({ videoId, title });
      continue;
    }

    // Continuation token entry — used to fetch next page
    const continuation = obj.continuationItemRenderer as
      | Record<string, unknown>
      | undefined;
    if (continuation) {
      const endpoint = continuation.continuationEndpoint as
        | Record<string, unknown>
        | undefined;

      // Path 1: direct continuationCommand (API continuation responses)
      const direct = endpoint?.continuationCommand as
        | Record<string, unknown>
        | undefined;
      if (direct?.token) {
        continuationToken = direct.token as string;
        continue;
      }

      // Path 2: commandExecutorCommand.commands[].continuationCommand (initial page HTML)
      const commands = (
        endpoint?.commandExecutorCommand as Record<string, unknown> | undefined
      )?.commands as Record<string, unknown>[] | undefined;
      if (commands) {
        for (const cmd of commands) {
          const cc = cmd.continuationCommand as
            | Record<string, unknown>
            | undefined;
          if (cc?.token) {
            continuationToken = cc.token as string;
            break;
          }
        }
      }
    }
  }

  return { videos, continuationToken };
}

/**
 * Scrapes a YouTube playlist page and extracts ALL video IDs and titles,
 * following continuation tokens to handle playlists with more than 100 videos.
 */
export async function fetchPlaylistInfo(
  playlistId: string,
): Promise<PlaylistInfo> {
  const url = `https://www.youtube.com/playlist?list=${playlistId}`;

  const response = await fetch(url, { headers: BROWSER_HEADERS });
  if (!response.ok) {
    throw new Error(`YouTube responded with status ${response.status}`);
  }

  const html = await response.text();

  // Extract ytInitialData JSON embedded in the page
  const markerIndex = html.indexOf("var ytInitialData = ");
  const jsonStart = markerIndex !== -1 ? html.indexOf("{", markerIndex) : -1;
  const jsonEnd = jsonStart !== -1 ? html.indexOf("</script>", jsonStart) : -1;
  const rawJson =
    jsonStart !== -1 && jsonEnd !== -1
      ? html.slice(jsonStart, jsonEnd).replace(/;\s*$/, "").trimEnd()
      : null;

  if (!rawJson) {
    throw new Error(
      "Could not find ytInitialData in page. YouTube may have changed its structure.",
    );
  }

  const data = JSON.parse(rawJson);

  // Extract API key and client version directly from the raw HTML
  // (more reliable than parsing the full ytcfg JSON blob)
  const apiKey =
    extractInlineValue(html, "INNERTUBE_API_KEY") ??
    process.env.INNERTUBE_API_KEY_FALLBACK;
  const clientVersion =
    extractInlineValue(html, "INNERTUBE_CLIENT_VERSION") ?? "2.20240101.00.00";

  // Navigate the ytInitialData tree to find the playlist video list
  const initialContents: unknown[] =
    data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer
      ?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer
      ?.contents?.[0]?.playlistVideoListRenderer?.contents ?? [];

  if (initialContents.length === 0) {
    throw new Error("No videos found. The playlist may be private or empty.");
  }

  // Playlist title
  const playlistTitle: string =
    data?.header?.playlistHeaderRenderer?.title?.simpleText ??
    data?.metadata?.playlistMetadataRenderer?.title ??
    "Untitled Playlist";

  // Channel name
  const channelName: string | null =
    data?.sidebar?.playlistSidebarRenderer?.items?.[1]
      ?.playlistSidebarSecondaryInfoRenderer?.videoOwner?.videoOwnerRenderer
      ?.title?.runs?.[0]?.text ?? null;

  const allVideos: PlaylistVideo[] = [];
  let { videos, continuationToken } =
    extractVideosFromContents(initialContents);
  allVideos.push(...videos);
  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[playlist] Initial page: ${videos.length} videos, continuationToken: ${continuationToken ? continuationToken.slice(0, 40) + "…" : "none"}`,
    );
  }

  // Follow continuation tokens to get videos beyond the first ~100
  let page = 2;
  while (continuationToken) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[playlist] Fetching page ${page} with continuation token…`);
    }
    const contResponse = await fetch(`${YT_BROWSE_URL}?key=${apiKey}`, {
      method: "POST",
      headers: {
        ...BROWSER_HEADERS,
        "Content-Type": "application/json",
        "x-youtube-client-name": "1",
        "x-youtube-client-version": clientVersion,
        origin: "https://www.youtube.com",
        referer: "https://www.youtube.com/",
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB",
            clientVersion,
            hl: "en",
            gl: "US",
          },
        },
        continuation: continuationToken,
      }),
    });

    if (!contResponse.ok) {
      if (process.env.NODE_ENV !== "production") {
        console.log(
          `[playlist] Continuation request failed: HTTP ${contResponse.status}`,
        );
      }
      break;
    }

    const contData = await contResponse.json();

    // The continuation response nests content differently
    const contContents: unknown[] =
      contData?.onResponseReceivedActions?.[0]?.appendContinuationItemsAction
        ?.continuationItems ?? [];

    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[playlist] Page ${page}: contContents.length=${contContents.length}`,
      );
    }
    if (contContents.length === 0) break;

    const result = extractVideosFromContents(contContents);
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[playlist] Page ${page}: ${result.videos.length} more videos, next token: ${result.continuationToken ? "yes" : "none"}`,
      );
    }
    allVideos.push(...result.videos);
    continuationToken = result.continuationToken;
    page++;
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[playlist] Total videos fetched: ${allVideos.length}`);
  }

  return { title: playlistTitle, channelName, videos: allVideos };
}
