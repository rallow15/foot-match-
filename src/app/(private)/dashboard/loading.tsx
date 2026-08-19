export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="space-y-6">
        <div className="h-10 w-1/3 animate-pulse rounded bg-ink-3" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-24 animate-pulse rounded bg-ink-3" />
          <div className="h-24 animate-pulse rounded bg-ink-3" />
          <div className="h-24 animate-pulse rounded bg-ink-3" />
        </div>
        <div className="h-64 animate-pulse rounded bg-ink-3" />
        <div className="h-64 animate-pulse rounded bg-ink-3" />
      </div>
    </div>
  );
}
