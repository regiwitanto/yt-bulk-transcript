export default function DashboardLoading() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header skeleton */}
      <header className="sticky top-0 z-30 bg-background border-b px-6 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="h-5 w-48 rounded bg-muted animate-pulse" />
            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
          </div>
          <div className="flex gap-2 shrink-0">
            <div className="h-8 w-20 rounded bg-muted animate-pulse" />
            <div className="h-8 w-16 rounded bg-muted animate-pulse" />
          </div>
        </div>
        <div className="h-2 w-full rounded-full bg-muted animate-pulse" />
      </header>

      {/* Video list skeleton */}
      <main className="flex-1 px-6 py-4">
        <div className="rounded-lg border divide-y">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-4 rounded bg-muted animate-pulse shrink-0" />
              <div className="flex-1 h-4 rounded bg-muted animate-pulse" />
              <div className="w-16 h-5 rounded-full bg-muted animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
