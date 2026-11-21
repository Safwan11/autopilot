import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-5 text-center">
      <p className="num text-sm text-mute">404</p>
      <h1 className="text-2xl font-semibold">This page doesn&apos;t exist</h1>
      <ButtonLink href="/dashboard" variant="secondary">Back to dashboard</ButtonLink>
    </div>
  );
}
