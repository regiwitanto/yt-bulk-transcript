# YouTube Bulk Transcript — Project SSOT (v1.1)

> **Objective:** A high-reliability SaaS to bulk-download YouTube transcripts from massive playlists, optimized for data analysts and researchers.

---

## 1. Core Principles

| Principle                    | Description                                                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Reliability First**        | Every video is treated as an atomic task. If one fails, the system retries; if the browser closes, the system resumes. |
| **Speed through Simplicity** | Minimal processing. Plain text output. No heavy formatting.                                                            |
| **Zero-Cost Infrastructure** | Built on Next.js, Supabase (Free Tier), and unofficial scraping libraries to bypass expensive API quotas.              |
| **Global Accessibility**     | Professional English UI with a "Buy Me a Coffee" monetization model for low-friction growth.                           |

---

## 2. Technical Stack

| Layer               | Technology                                              |
| ------------------- | ------------------------------------------------------- |
| **Frontend**        | Next.js 14+ (App Router), TypeScript, Tailwind CSS      |
| **UI Components**   | shadcn/ui — Button, Input, Card, Progress, Toast, Badge |
| **Backend**         | Next.js Serverless Functions                            |
| **Database & Auth** | Supabase (PostgreSQL + Google OAuth)                    |
| **Scraping Engine** | `youtube-transcript` (Node library)                     |
| **Monetization**    | Buy Me a Coffee (External Link)                         |

---

## 3. Database Schema (Supabase)

### `profiles`

| Column         | Type      | Description                            |
| -------------- | --------- | -------------------------------------- |
| `id`           | UUID (PK) | References `auth.users`.               |
| `email`        | Text      | User's Google email.                   |
| `is_supporter` | Boolean   | Manually toggled for users who donate. |

### `playlists`

| Column    | Type      | Description                          |
| --------- | --------- | ------------------------------------ |
| `id`      | UUID (PK) | Unique playlist tracking ID.         |
| `user_id` | UUID (FK) | References `profiles.id`.            |
| `url`     | Text      | The original YouTube Playlist URL.   |
| `title`   | Text      | Playlist name fetched from YouTube.  |
| `status`  | Enum      | `pending`, `processing`, `completed` |

### `videos`

| Column        | Type      | Description                                                 |
| ------------- | --------- | ----------------------------------------------------------- |
| `id`          | UUID (PK) | Unique video tracking ID.                                   |
| `playlist_id` | UUID (FK) | References `playlists.id`.                                  |
| `yt_video_id` | Text      | The `dQw4w9...` YouTube video ID.                           |
| `title`       | Text      | Video title.                                                |
| `transcript`  | Text      | Raw text content (plain text).                              |
| `status`      | Enum      | `queued`, `processing`, `success`, `no_transcript`, `error` |
| `retry_count` | Int       | Increments on failure (Max: 3).                             |

---

## 4. Frontend Roadmap (Page-by-Page)

### Page 1: Landing Page (`/`)

- **Header:** Logo (YouTube Bulk Transcript) + "Sign In" button
- **Hero Section:**
  - Headline: _Bulk YouTube Transcript Downloader_
  - Sub-headline: _Extract clean text from massive playlists reliably. Fast, free, and built for analysts._
  - Input Area: Large URL input + **Extract Now** button
- **Footer:** "Support this project: [Buy Me a Coffee]" link

### Page 2: Login Page (`/login`)

- **Design:** Simple Card centered on screen
- **Primary Action:** "Continue with Google" button
- **Value Prop:** _"Sign in to save your progress and resume large downloads anytime."_

### Page 3: Dashboard (`/dashboard/[playlistId]`)

- **Header Info:** Playlist title + current progress (e.g., `Processing 12/150`)
- **Progress Bar:** Top-mounted `Progress` component (shadcn)
- **Main List:** Table or `ScrollArea` showing all videos in the queue
- **Status Badges:**
  - `success` → Green
  - `processing` → Blue (pulse)
  - `queued` → Gray
  - `no_transcript` → Yellow
- **Sticky Controls:** Pause / Resume and "Support the Dev" buttons

### Page 4: Export Modal (on Completion)

- **Trigger:** Appears when `Total Success + No Transcript == Total Videos`
- **Primary Button:** Download `.txt` — all transcripts combined into one file, each video separated by its title as a header
- **Closing Call:** _"Finding this useful? [Buy Me a Coffee]."_

---

## 5. Execution Order (Step-by-Step)

### Phase 1 — The Core (API Testing)

- [ ] Initialize Next.js + shadcn/ui
- [ ] Create `lib/youtube.ts` to test `youtube-transcript` fetching
- **Goal:** Successfully log a 1-hour video transcript in the console

### Phase 2 — The Logic (Database & Queue)

- [ ] Set up Supabase tables and Google Auth
- [ ] Build the "Ingestion" API: User pastes URL → Server fetches list of IDs → Saves to `videos` table as `queued`
- **Goal:** A playlist URL is converted into rows in the database

### Phase 3 — The Orchestrator (Dashboard)

- [ ] Build the Dashboard UI with shadcn components
- [ ] Implement the Sequential Loop:
  1. Pick first `queued` video
  2. Call `/api/transcribe`
  3. Update DB to `success`
  4. Trigger next video
- **Goal:** Watch the progress bar move as videos turn green

### Phase 4 — Export & Cleanup

- [ ] Build client-side download logic using `Blob` or JSZip
- [ ] Implement "Resume" logic: on page load, find any `processing` or `queued` videos and restart the loop

### Phase 5 — Launch & Support

- [ ] Add "Buy Me a Coffee" links
- [ ] Deploy to Vercel
- [ ] Share with data communities

---

## 6. Safety & Reliability Guardrails

| Guardrail                     | Details                                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Client-Side Trigger**       | The browser triggers the API, using the user's IP/session to avoid YouTube blocking the server IP.               |
| **Stateless API**             | `/api/transcribe` handles one video at a time — fast and within Vercel's 10-second timeout.                      |
| **Data Persistence**          | If the browser crashes, transcripts already saved in Supabase are safe. Refreshing the page resumes the process. |
| **Auto-Cleanup** _(Optional)_ | Delete transcripts older than 48 hours for non-supporters to keep the database light.                            |
