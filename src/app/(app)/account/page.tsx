import { requireUser } from "@/lib/auth";
import { aiEnabled } from "@/lib/ai";
import { day } from "@/lib/format";
import { Badge, Button, Card, CardHeader, PageHeader } from "@/components/ui";
import { AccountForm, DeleteAccountForm } from "@/components/account-forms";
import { signOutEverywhere } from "@/app/actions/settings";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="Account" description={`Member since ${day(user.createdAt)}.`} />
      <div className="max-w-3xl space-y-5">
        <Card>
          <CardHeader title="Your details" />
          <AccountForm name={user.name ?? ""} email={user.email} />
        </Card>
        <Card>
          <CardHeader title="App features" description="Set by the site owner in Vercel → Settings → Environment Variables." />
          <ul className="divide-y divide-line text-sm">
            <li className="flex items-center justify-between gap-3 px-5 py-3.5">
              <span><span className="font-medium">AI scoring & cover letters</span><span className="block text-xs text-mute">ANTHROPIC_API_KEY</span></span>
              {aiEnabled() ? <Badge tone="good">On</Badge> : <Badge>Off — using built-in scoring</Badge>}
            </li>
            <li className="flex items-center justify-between gap-3 px-5 py-3.5">
              <span><span className="font-medium">Daily automatic search</span><span className="block text-xs text-mute">CRON_SECRET</span></span>
              {process.env.CRON_SECRET ? <Badge tone="good">On</Badge> : <Badge>Off</Badge>}
            </li>
          </ul>
        </Card>
        <Card>
          <CardHeader title="Sessions" description="Signed in on another device you don't recognise?" action={<form action={signOutEverywhere}><Button variant="secondary" type="submit">Sign out everywhere</Button></form>} />
        </Card>
        <Card className="border-bad/25">
          <CardHeader title="Delete account" />
          <DeleteAccountForm email={user.email} />
        </Card>
      </div>
    </>
  );
}
