"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-30 bg-background border-b px-6 py-4 flex items-center justify-between">
        <div className="min-w-0">
          <p className="font-bold text-lg truncate">Dashboard</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href="/history"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            History
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Home
          </Link>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground max-w-sm">
            We couldn&apos;t load this playlist. This is usually a temporary
            issue — please try again.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => reset()}>Try again</Button>
          <Button variant="outline" asChild>
            <Link href="/history">My History</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
