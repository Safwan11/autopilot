import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { ago } from "@/lib/format";
import { Card, CardHeader, Chips, Notice, PageHeader } from "@/components/ui";
import { CvUpload } from "@/components/cv-upload";
import { ProfileForm } from "@/components/profile-form";

export const metadata = { title: "Profile & CV" };

export default async function ProfilePage(props: PageProps<"/profile">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id));

  return (
    <>
      <PageHeader title="Profile & CV" description="JobPilot matches jobs against this profile. Upload your CV to fill it in, then fix anything it got wrong." />
      {sp.welcome && !profile && (
        <div className="mb-5"><Notice tone="good">Welcome, {user.name}! Start by uploading your CV — it takes a few seconds.</Notice></div>
      )}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Your CV" description="Your file isn't stored — only the text we read from it." />
            <div className="p-5">
              <CvUpload current={profile?.cvFileName ? { name: profile.cvFileName, when: ago(profile.cvUploadedAt) } : null} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Profile details" />
            <ProfileForm key={profile?.cvUploadedAt?.toISOString() ?? "new"} profile={profile} fallbackName={user.name ?? ""} fallbackEmail={user.email} />
          </Card>
        </div>
        <aside className="space-y-5">
          <Card className="p-5">
            <h3 className="text-sm font-semibold">Skills on file</h3>
            <p className="mt-0.5 text-xs text-mute">{profile?.skills?.length ?? 0} skills</p>
            <div className="mt-3">{profile?.skills?.length ? <Chips items={profile.skills} tone="good" /> : <p className="text-sm text-mute">None yet.</p>}</div>
          </Card>
          <Card className="p-5 text-sm text-ink-2">
            <h3 className="font-semibold text-ink">Tips for better matches</h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-4">
              <li>List tools by name (Postman, Jira, Oracle Fusion), not just “testing”.</li>
              <li>Add the titles you&apos;re targeting, even if you haven&apos;t held them yet.</li>
              <li>Keep years of experience accurate — it&apos;s compared with each job&apos;s requirement.</li>
            </ul>
          </Card>
        </aside>
      </div>
    </>
  );
}
