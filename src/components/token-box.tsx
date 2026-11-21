"use client";
import { useState, useTransition } from "react";
import { KeyRound, Loader2, Trash2 } from "lucide-react";
import { createImportToken, deleteImportToken } from "@/app/actions/importer";
import { Button, Notice } from "./ui";
import { CopyButton } from "./copy-button";

export function TokenBox({ hasToken, createdLabel, appUrl }: { hasToken: boolean; createdLabel: string | null; appUrl: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-line bg-paper px-3 py-2 text-sm">
        <div className="text-xs text-mute">JobPilot address (paste into the extension)</div>
        <div className="flex items-center justify-between gap-2">
          <code className="num truncate">{appUrl}</code>
          <CopyButton text={appUrl} />
        </div>
      </div>
      {token ? (
        <div className="space-y-2">
          <Notice tone="good">Copy this token now — for your security it won&apos;t be shown again.</Notice>
          <div className="flex items-center justify-between gap-2 rounded-lg border border-accent/40 bg-card px-3 py-2">
            <code className="num truncate text-sm">{token}</code>
            <CopyButton text={token} />
          </div>
        </div>
      ) : (
        hasToken && <p className="text-sm text-ink-2">You have an active token{createdLabel ? ` (created ${createdLabel})` : ""}. Create a new one if you lost it — the old one stops working.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => start(async () => setToken((await createImportToken()).token))} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
          {hasToken || token ? "Create a new token" : "Create token"}
        </Button>
        {(hasToken || token) && (
          <Button variant="danger" disabled={pending} onClick={() => start(async () => { await deleteImportToken(); setToken(null); })}>
            <Trash2 className="size-4" />Disconnect extension
          </Button>
        )}
      </div>
    </div>
  );
}
