import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications, jobs } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { Nav } from "@/components/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [[saved], [active]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(jobs).where(and(eq(jobs.userId, user.id), eq(jobs.status, "saved"))),
    db.select({ n: sql<number>`count(*)::int` }).from(applications).where(and(eq(applications.userId, user.id), sql`${applications.status} in ('applied','interviewing','offer')`)),
  ]);
  return (
    <div className="min-h-dvh">
      <Nav name={user.name ?? "You"} email={user.email} counts={{ "/jobs": saved?.n ?? 0, "/applications": active?.n ?? 0 }} />
      <main className="lg:pl-60">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
