export default function HistoryLoading() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header skeleton */}
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <div className="h-6 w-48 rounded bg-muted animate-pulse" />
        <div className="flex items-center gap-3">
          <div className="h-4 w-32 rounded bg-muted animate-pulse hidden sm:block" />
          <div className="h-8 w-20 rounded bg-muted animate-pulse" />
        </div>
      </header>

      <main className="flex-1 px-6 py-10 max-w-3xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-32 rounded bg-muted animate-pulse" />
          <div className="h-8 w-36 rounded bg-muted animate-pulse" />
        </div>

        <div className="rounded-lg border divide-y">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-4">
              <div className="h-4 w-4 rounded bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-4 w-16 rounded bg-muted animate-pulse shrink-0" />
              <div className="h-8 w-20 rounded bg-muted animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
