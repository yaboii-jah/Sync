export default function AdminLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-10 lg:py-10">
      <div className="h-4 w-32 animate-pulse rounded bg-accent-primary" />
      <div className="mt-3 h-10 w-72 animate-pulse rounded bg-accent-primary" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-28 animate-pulse rounded-2xl border border-border-default bg-accent-primary/20" />
        ))}
      </div>
    </div>
  );
}
