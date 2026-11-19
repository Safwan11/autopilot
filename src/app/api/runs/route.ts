import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { discoverJobs, stripHtml } from "@/lib/job-search";
import { scoreJob } from "@/lib/ai-matcher";
import { buildExcelReport } from "@/lib/excel-export";
import fs from "node:fs";

export async function GET() {
  const user = await db.user.findUnique({ where: { email: "demo@autopilot.local" } });
  if (!user) return NextResponse.json({ runs: [] });
  const runs = await db.agentRun.findMany({ where: { userId: user.id }, orderBy: { startedAt: "desc" }, take: 50 });
  return NextResponse.json({ runs });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = "demo@autopilot.local";
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "No user profile. Upload a CV first." }, { status: 400 });

  const cv = await db.cv.findFirst({ where: { userId: user.id, isActive: true }, orderBy: { createdAt: "desc" } });
  if (!cv) return NextResponse.json({ error: "No CV uploaded." }, { status: 400 });

  const profile = await db.professionalProfile.findUnique({ where: { userId: user.id } });

  const titles = profile?.titles ? JSON.parse(profile.titles) : [];
  const skills = profile?.skills ? JSON.parse(profile.skills) : [];
  const queries = titles.length ? titles : ["software support", "application support", "QA engineer", "API testing", "ERP support", "Oracle Fusion support"];

  const run = await db.agentRun.create({
    data: { userId: user.id, mode: body.mode || "SEARCH_AND_SHORTLIST", status: "Running" },
  });

  const sources = ["Remotive", "Arbeitnow", "Himalayas"];
  for (const s of sources) {
    await db.sourceChecked.create({
      data: { runId: run.id, website: s, searchTerms: queries.join(", "), jobCategories: JSON.stringify(titles), pagesVisited: 1, automationOk: true },
    });
  }

  const rawJobs = await discoverJobs(queries);
  await db.agentRun.update({ where: { id: run.id }, data: { jobsFound: rawJobs.length } });

  for (const rj of rawJobs) {
    const existing = await db.job.findUnique({ where: { sourceUrl: rj.sourceUrl } });
    if (existing) continue;
    const desc = stripHtml(rj.description);
    const match = await scoreJob(cv.rawText, { titles, skills, yearsExp: profile?.yearsExp }, {
      title: rj.title, company: rj.company, description: desc, location: rj.location,
    });
    await db.job.create({
      data: {
        userId: user.id,
        externalId: rj.externalId,
        title: rj.title,
        company: rj.company,
        location: rj.location,
        country: rj.country,
        city: rj.city,
        remoteType: rj.remoteType,
        employmentType: rj.employmentType,
        salary: rj.salary,
        currency: rj.currency,
        datePosted: rj.datePosted ? new Date(rj.datePosted) : null,
        source: rj.source,
        sourceUrl: rj.sourceUrl,
        applicationUrl: rj.applicationUrl,
        description: desc,
        matchScore: match.score,
        matchClass: match.classification,
        strongSkills: JSON.stringify(match.strongSkills),
        missingReqs: JSON.stringify(match.missingReqs),
        visaSponsorship: match.eligibilityIssues.find((i) => /visa|sponsor/i.test(i)) || null,
        workAuth: match.eligibilityIssues.find((i) => /work authoriz/i.test(i)) || null,
        languages: JSON.stringify([]),
        requiredExp: match.eligibilityIssues.find((i) => /experience/i.test(i)) || null,
        status: match.score >= 70 ? "Shortlisted" : "Discovered",
      },
    });
    await db.sourceChecked.updateMany({ where: { runId: run.id, website: rj.source }, data: { vacanciesFound: { increment: 1 }, vacanciesKept: { increment: 1 } } });
  }

  const reportsDir = "reports";
  fs.mkdirSync(reportsDir, { recursive: true });
  const reportPath = `${reportsDir}/autopilot-run-${run.id}.xlsx`;
  const buf = await buildExcelReport(run.id);
  fs.writeFileSync(reportPath, buf);
  await db.agentRun.update({ where: { id: run.id }, data: { reportPath, status: "Completed", completedAt: new Date(), jobsFound: rawJobs.length } });

  return NextResponse.json({ runId: run.id, jobsFound: rawJobs.length, reportPath });
}
