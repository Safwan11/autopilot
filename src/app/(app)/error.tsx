"use client";
import { Button } from "@/components/ui";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm text-mute">{error.digest ? `Reference: ${error.digest}` : error.message}</p>
      <Button variant="secondary" onClick={reset}>Try again</Button>
    </div>
  );
}
