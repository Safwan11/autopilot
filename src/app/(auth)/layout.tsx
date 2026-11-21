import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { Logo } from "@/components/logo";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getUser()) redirect("/dashboard");
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="mb-8"><Logo /></div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
