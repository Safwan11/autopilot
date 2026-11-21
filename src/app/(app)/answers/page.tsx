import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { answers } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { AnswerForm } from "@/components/tracker";
import { CopyButton } from "@/components/copy-button";

export const metadata = { title: "Answer library" };

const SUGGESTED = [
  "What is your notice period?",
  "What are your salary expectations?",
  "Do you require visa sponsorship?",
  "Why do you want to work here?",
  "Describe a difficult production issue you resolved.",
  "Are you willing to relocate?",
];

export default async function AnswersPage() {
  const user = await requireUser();
  const list = await db.select().from(answers).where(eq(answers.userId, user.id)).orderBy(desc(answers.updatedAt));
  const missing = SUGGESTED.filter((q) => !list.some((a) => a.question.toLowerCase() === q.toLowerCase()));

  return (
    <>
      <PageHeader title="Answer library" description="Write your answers to the questions application forms keep asking, once. Copy them from any job page." />
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {list.length === 0 && <Card className="p-6 text-sm text-mute">No saved answers yet. Add your first one on the right.</Card>}
          {list.map((a) => (
            <Card key={a.id}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <div className="font-medium">{a.question}</div>
                    <p className="mt-1 whitespace-pre-line text-sm text-ink-2 group-open:hidden">{a.answer}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1">
                    <CopyButton text={a.answer} />
                    <span className="text-xs text-mute group-open:hidden">Edit</span>
                  </span>
                </summary>
                <div className="border-t border-line px-5 py-4"><AnswerForm answer={a} /></div>
              </details>
            </Card>
          ))}
        </div>
        <aside className="space-y-5">
          <Card>
            <CardHeader title="Add an answer" />
            <div className="p-5"><AnswerForm /></div>
          </Card>
          {missing.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold">Common questions to prepare</h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-ink-2">{missing.map((q) => <li key={q}>{q}</li>)}</ul>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
