import { eq } from "drizzle-orm";
import { db } from "@/db";
import { preferences, profiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { AUTO_SOURCES, LINK_SOURCES, enabledAuto, enabledLinks } from "@/lib/sources";
import { Card, PageHeader } from "@/components/ui";
import { PreferencesForm } from "@/components/preferences-form";
import { SourceHealth } from "@/components/source-health";

export const metadata = { title: "Preferences" };

const pick = ({ id, name, description, region }: { id: string; name: string; description: string; region: string }) => ({ id, name, description, region });

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
    autoSearch: prefs?.autoSearch ?? false,
    autoOn: enabledAuto(prefs?.sources).map((s) => s.id),
    linksOn: enabledLinks(prefs?.linkSources).map((s) => s.id),
  };
  return (
    <>
      <PageHeader title="Preferences" description="Tell JobPilot what to look for and where. Saving re-scores every job you already have." />
      <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
        <Card>
          <PreferencesForm
            prefs={value}
            autoSources={AUTO_SOURCES.map(pick)}
            linkSources={LINK_SOURCES.map(pick)}
            cronReady={Boolean(process.env.CRON_SECRET)}
          />
        </Card>
        <aside><SourceHealth /></aside>
      </div>
    </>
  );
}
