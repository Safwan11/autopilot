import "server-only";
import ExcelJS from "exceljs";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, jobs, profiles, runs, answers } from "@/db/schema";

const HEADER = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } } as const;

function styleSheet(ws: ExcelJS.Worksheet) {
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = HEADER;
  header.alignment = { vertical: "middle" };
  header.height = 22;
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
}

export async function buildWorkbook(userId: string): Promise<Buffer> {
  const [allJobs, apps, allRuns, [profile], qa] = await Promise.all([
    db.select().from(jobs).where(eq(jobs.userId, userId)).orderBy(desc(jobs.score)),
    db.select().from(applications).where(eq(applications.userId, userId)).orderBy(desc(applications.appliedAt)),
    db.select().from(runs).where(eq(runs.userId, userId)).orderBy(desc(runs.startedAt)),
    db.select().from(profiles).where(eq(profiles.userId, userId)),
    db.select().from(answers).where(eq(answers.userId, userId)),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "JobPilot";
  wb.created = new Date();

  // Summary
  const sum = wb.addWorksheet("Summary");
  sum.columns = [{ header: "Metric", key: "k", width: 32 }, { header: "Value", key: "v", width: 40 }];
  const byStatus = (s: string) => apps.filter((a) => a.status === s).length;
  [
    ["Generated", new Date().toISOString().slice(0, 16).replace("T", " ")],
    ["Candidate", profile?.fullName ?? ""],
    ["Jobs discovered", allJobs.length],
    ["Strong matches (70+)", allJobs.filter((j) => j.score >= 70).length],
    ["Saved jobs", allJobs.filter((j) => j.status === "saved").length],
    ["Applications", apps.length],
    ["Interviewing", byStatus("interviewing")],
    ["Offers", byStatus("offer")],
    ["Rejected", byStatus("rejected")],
    ["Searches run", allRuns.length],
  ].forEach(([k, v]) => sum.addRow({ k, v }));
  styleSheet(sum);

  // Jobs
  const js = wb.addWorksheet("Jobs");
  js.columns = [
    { header: "Score", key: "score", width: 8 },
    { header: "Title", key: "title", width: 40 },
    { header: "Company", key: "company", width: 26 },
    { header: "Location", key: "location", width: 24 },
    { header: "Mode", key: "mode", width: 10 },
    { header: "Salary", key: "salary", width: 16 },
    { header: "Status", key: "status", width: 10 },
    { header: "Source", key: "source", width: 12 },
    { header: "Posted", key: "posted", width: 12 },
    { header: "Matched skills", key: "matched", width: 40 },
    { header: "Gaps", key: "missing", width: 30 },
    { header: "Link", key: "link", width: 50 },
  ];
  for (const j of allJobs) {
    const row = js.addRow({
      score: j.score, title: j.title, company: j.company, location: j.location ?? "", mode: j.remoteType ?? "",
      salary: j.salary ?? "", status: j.status, source: j.source, posted: j.postedAt ? j.postedAt.toISOString().slice(0, 10) : "",
      matched: (j.matchedSkills ?? []).join(", "), missing: (j.missingSkills ?? []).join(", "), link: j.applyUrl || j.url,
    });
    row.getCell("link").value = { text: j.applyUrl || j.url, hyperlink: j.applyUrl || j.url };
    row.getCell("link").font = { color: { argb: "FF2563EB" }, underline: true };
  }
  styleSheet(js);
  js.addConditionalFormatting({
    ref: `A2:A${Math.max(2, allJobs.length + 1)}`,
    rules: [{ type: "colorScale", priority: 1, cfvo: [{ type: "num", value: 30 }, { type: "num", value: 60 }, { type: "num", value: 90 }], color: [{ argb: "FFFCA5A5" }, { argb: "FFFDE68A" }, { argb: "FF86EFAC" }] }],
  });

  // Applications
  const as = wb.addWorksheet("Applications");
  as.columns = [
    { header: "Applied", key: "applied", width: 12 },
    { header: "Company", key: "company", width: 26 },
    { header: "Title", key: "title", width: 36 },
    { header: "Status", key: "status", width: 14 },
    { header: "Follow up", key: "follow", width: 12 },
    { header: "Contact", key: "contact", width: 24 },
    { header: "Salary", key: "salary", width: 14 },
    { header: "Notes", key: "notes", width: 50 },
    { header: "Link", key: "url", width: 50 },
  ];
  for (const a of apps) {
    as.addRow({
      applied: a.appliedAt.toISOString().slice(0, 10), company: a.company, title: a.title, status: a.status,
      follow: a.followUpAt ? a.followUpAt.toISOString().slice(0, 10) : "", contact: a.contact ?? "", salary: a.salary ?? "",
      notes: a.notes ?? "", url: a.url ?? "",
    });
  }
  styleSheet(as);
  for (let r = 2; r <= apps.length + 1; r++) {
    as.getCell(`D${r}`).dataValidation = {
      type: "list", allowBlank: false, formulae: ['"applied,interviewing,offer,rejected,withdrawn"'],
    };
  }

  // Searches
  const rs = wb.addWorksheet("Searches");
  rs.columns = [
    { header: "Started", key: "started", width: 18 },
    { header: "Status", key: "status", width: 11 },
    { header: "Queries", key: "queries", width: 40 },
    { header: "Found", key: "found", width: 8 },
    { header: "New", key: "new", width: 8 },
    { header: "Matches", key: "matched", width: 9 },
    { header: "Sources", key: "sources", width: 60 },
  ];
  for (const r of allRuns) {
    rs.addRow({
      started: r.startedAt.toISOString().slice(0, 16).replace("T", " "), status: r.status, queries: r.queries.join(", "),
      found: r.jobsFound, new: r.jobsNew, matched: r.jobsMatched,
      sources: Object.entries(r.sourceStats ?? {}).map(([k, v]) => `${k}: ${v.found}${v.error ? " (error)" : ""}`).join(" · "),
    });
  }
  styleSheet(rs);

  // Answer library
  const ql = wb.addWorksheet("Answers");
  ql.columns = [{ header: "Question", key: "q", width: 50 }, { header: "Answer", key: "a", width: 90 }];
  qa.forEach((x) => ql.addRow({ q: x.question, a: x.answer }));
  ql.getColumn("a").alignment = { wrapText: true, vertical: "top" };
  styleSheet(ql);

  return Buffer.from(await wb.xlsx.writeBuffer());
}
