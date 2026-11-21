export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded-md bg-ink/8" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-ink/5" />)}</div>
      <div className="h-80 rounded-xl bg-ink/5" />
    </div>
  );
}
