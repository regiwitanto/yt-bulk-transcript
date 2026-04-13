"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DownloadButton } from "./DownloadButton";
import type { Database } from "@/lib/database.types";

type PlaylistRow = Database["public"]["Tables"]["playlists"]["Row"];
type Playlist = PlaylistRow & { video_count: number };

const PAGE_SIZE = 10;

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Complete",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "text-muted-foreground",
  processing: "text-primary",
  completed: "text-green-700 dark:text-green-500",
};

interface Props {
  initialRows: Playlist[];
  page: number;
  totalPages: number;
  totalCount: number;
  succeededMap: Record<string, number>;
  thumbMap: Record<string, string>;
}

export default function HistoryClient({
  initialRows,
  page,
  totalPages,
  totalCount,
  succeededMap,
  thumbMap,
}: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<Playlist[]>(initialRows);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [crossPageAll, setCrossPageAll] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const allPageSelected = rows.length > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0 && !allPageSelected;
  const showCrossPageBanner =
    allPageSelected && totalPages > 1 && !crossPageAll;

  // Set the native indeterminate state so the checkbox shows ☐ partway (not just checked/unchecked).
  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  function toggleAll() {
    if (allPageSelected) {
      setSelected(new Set());
      setCrossPageAll(false);
    } else {
      setSelected(new Set(rows.map((r) => r.id)));
      setCrossPageAll(false);
    }
    setPendingDelete(false);
  }

  function toggleOne(id: string) {
    setPendingDelete(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDelete() {
    if (!crossPageAll && selected.size === 0) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const body = crossPageAll
        ? { deleteAll: true }
        : { ids: Array.from(selected) };
      const res = await fetch("/api/playlists", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setDeleteError("Delete failed. Please try again.");
        return;
      }

      if (crossPageAll) {
        // All deleted — go to page 1 (will show empty state)
        setCrossPageAll(false);
        setSelected(new Set());
        router.push("/history?page=1");
        router.refresh();
        return;
      }

      const ids = Array.from(selected);
      // Optimistic: remove deleted rows locally
      setRows((prev) => prev.filter((r) => !selected.has(r.id)));
      setSelected(new Set());

      // If page is now empty and not page 1, go back
      const remaining = rows.length - ids.length;
      if (remaining === 0 && page > 1) {
        router.push(`/history?page=${page - 1}`);
      } else {
        router.refresh();
      }
    } finally {
      setDeleting(false);
      setPendingDelete(false);
    }
  }

  return (
    <>
      {/* Floating Bulk Action Bar */}
      {(selected.size > 0 || crossPageAll) && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 shadow-xl border bg-background/90 backdrop-blur-md px-4 py-3 rounded-2xl animate-in slide-in-from-bottom-8">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">
              {crossPageAll
                ? `All ${totalCount} selected`
                : `${selected.size} selected`}
            </span>
            {pendingDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {crossPageAll
                    ? `Delete all ${totalCount} playlists?`
                    : `Delete ${selected.size} playlist${selected.size !== 1 ? "s" : ""}?`}
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Yes, delete"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPendingDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setPendingDelete(true)}
              >
                {crossPageAll
                  ? `Delete all ${totalCount}`
                  : `Delete ${selected.size}`}
              </Button>
            )}
          </div>
          {showCrossPageBanner && (
            <div className="text-sm text-center bg-muted/50 rounded-md px-4 py-2">
              All {rows.length} on this page are selected.{" "}
              <button
                onClick={() => setCrossPageAll(true)}
                className="underline font-medium hover:text-foreground"
              >
                Select all {totalCount} across all pages
              </button>
            </div>
          )}
          {crossPageAll && (
            <div className="text-sm text-center bg-destructive/10 text-destructive rounded-md px-4 py-2">
              All {totalCount} playlists are selected and will be deleted.{" "}
              <button
                onClick={() => {
                  setCrossPageAll(false);
                  setSelected(new Set());
                }}
                className="underline font-medium"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {deleteError && (
        <div
          className="flex items-center justify-between gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 mb-3"
          role="alert"
        >
          <span>{deleteError}</span>
          <button
            type="button"
            onClick={() => setDeleteError("")}
            className="shrink-0 hover:opacity-70 transition-opacity"
            aria-label="Dismiss error"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="text-center py-20 flex flex-col items-center gap-3 text-muted-foreground">
          <p className="text-base font-medium text-foreground">
            No transcripts yet
          </p>
          <p className="text-sm">
            Extract a playlist or single video to see it here.
          </p>
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "mt-2",
            )}
          >
            New Transcript
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {/* Select-all header row */}
          <div className="flex items-center gap-3 px-4 py-2 bg-muted/30">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allPageSelected}
              onChange={toggleAll}
              className="h-4 w-4 cursor-pointer"
              aria-label="Select all on this page"
            />
            <span className="text-xs text-muted-foreground">
              {allPageSelected
                ? `All ${rows.length} on this page selected`
                : selected.size > 0
                  ? `${selected.size} of ${rows.length} selected on this page`
                  : "Select all on this page"}
            </span>
          </div>

          {rows.map((playlist, i) => {
            const rowNum = (page - 1) * PAGE_SIZE + i + 1;
            return (
              <div
                key={playlist.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-4 transition-colors border-l-2",
                  selected.has(playlist.id)
                    ? "border-l-primary bg-muted/80"
                    : "border-l-transparent hover:bg-muted/50",
                )}
              >
                <input
                  type="checkbox"
                  checked={selected.has(playlist.id)}
                  onChange={() => toggleOne(playlist.id)}
                  className="h-4 w-4 cursor-pointer shrink-0"
                  aria-label={`Select ${playlist.title}`}
                />
                <span className="text-xs text-muted-foreground w-5 shrink-0 text-right">
                  {rowNum}.
                </span>
                {thumbMap[playlist.id] && (
                  <img
                    src={`https://img.youtube.com/vi/${thumbMap[playlist.id]}/default.jpg`}
                    alt=""
                    width={60}
                    height={45}
                    className="rounded shrink-0 object-cover w-[60px] h-[45px] bg-muted"
                    loading="lazy"
                  />
                )}
                <Link
                  href={`/dashboard/${playlist.id}`}
                  className="flex-1 min-w-0 hover:opacity-80 transition-opacity"
                >
                  <p className="text-sm font-medium truncate">
                    {playlist.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {playlist.channel_name && (
                      <span>
                        {playlist.channel_name}
                        {" · "}
                      </span>
                    )}
                    {new Date(playlist.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                    {" · "}
                    {playlist.video_count} video
                    {playlist.video_count !== 1 ? "s" : ""}
                  </p>
                </Link>
                <span
                  className={cn(
                    "text-xs font-medium shrink-0",
                    STATUS_COLOR[playlist.status] ?? "text-muted-foreground",
                  )}
                >
                  {STATUS_LABEL[playlist.status] ?? playlist.status}
                </span>
                {playlist.status === "completed" &&
                (succeededMap[playlist.id] ?? 0) > 0 ? (
                  <DownloadButton playlistId={playlist.id} />
                ) : (
                  <div className="flex shrink-0 opacity-40 cursor-not-allowed pointer-events-none">
                    <span
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "rounded-r-none border-r-0",
                      )}
                    >
                      .txt
                    </span>
                    <span
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "rounded-l-none",
                      )}
                    >
                      .json
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <Link
            href={`/history?page=${page - 1}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              page <= 1 && "opacity-40 pointer-events-none",
            )}
            aria-disabled={page <= 1}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5 mr-1"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            Previous
          </Link>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Link
            href={`/history?page=${page + 1}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              page >= totalPages && "opacity-40 pointer-events-none",
            )}
            aria-disabled={page >= totalPages}
          >
            Next
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5 ml-1"
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
          </Link>
        </div>
      )}
    </>
  );
}
