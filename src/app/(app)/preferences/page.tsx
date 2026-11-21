import { eq } from "drizzle-orm";
import { db } from "@/db";
import { preferences, profiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { SOURCES } from "@/lib/sources";
import { Card, PageHeader } from "@/components/ui";
import { PreferencesForm } from "@/components/preferences-form";

export const metadata = { title: "Preferences" };

export default async function PreferencesPage() {
  const user = await requireUser();
  const [[prefs], [profile]] = await Promise.all([
    db.select().from(preferences).where(eq(preferences.userId, user.id)),
    db.select().from(profiles).where(eq(profiles.userId, user.id)),
  ]);
  const value = {
    keywords: prefs?.keywords?.length ? prefs.keywords : profile?.titles?.slice(0, 4) ?? [],
    locations: prefs?.locations ?? [],
    remote: prefs?.remote ?? true,
    hybrid: prefs?.hybrid ?? true,
    onsite: prefs?.onsite ?? true,
    minScore: prefs?.minScore ?? 55,
    maxAgeDays: prefs?.maxAgeDays ?? 30,
    excludeKeywords: prefs?.excludeKeywords ?? [],
    excludeCompanies: prefs?.excludeCompanies ?? [],
    sources: prefs?.sources ?? [],
    autoSearch: prefs?.autoSearch ?? false,
  };
  return (
    <>
      <PageHeader title="Preferences" description="Tell Autopilot what to look for. Saving re-scores every job you already have." />
      <Card>
        <PreferencesForm
          prefs={value}
          sources={SOURCES.map(({ id, name, description }) => ({ id, name, description }))}
          cronReady={Boolean(process.env.CRON_SECRET)}
        />
      </Card>
    </>
  );
}
