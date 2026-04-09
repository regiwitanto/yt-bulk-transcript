# Changelog — The Transcript Tank

All development progress is documented here chronologically.

---

## [Unreleased]

> Items planned but not yet started.

- Phase 2: Supabase tables + Google Auth
- Phase 3: Dashboard UI + sequential loop
- Phase 4: Export (Blob / JSZip)
- Phase 5: Vercel deploy + Buy Me a Coffee links

---

## [0.1.0] — 2026-04-09

### Phase 1 — The Core (API Testing)

#### Added
- Initialized Next.js 14 project with TypeScript and Tailwind CSS (App Router)
- Configured `shadcn/ui` with default theme
- Installed `youtube-transcript` npm library
- Created `src/lib/youtube.ts` — typed wrapper around `youtube-transcript` that fetches and joins transcript segments into a single plain-text string
- Created `src/app/api/test-transcript/route.ts` — a `GET` endpoint that accepts a `?videoId=` query param and logs/returns the raw transcript for manual testing

#### Goal achieved
> Successfully able to fetch and return a full transcript for any YouTube video via the test API route.
