import ExcelJS from "exceljs";
import { db } from "./db";

type JobRow = {
  title: string; company: string; location: string; country: string | null; city: string | null;
  remoteType: string | null; employmentType: string | null; salary: string | null; currency: string | null;
  datePosted: Date | null; deadline: Date | null; source: string; sourceUrl: string;
  applicationUrl: string | null; matchScore: number | null; matchClass: string | null;
  strongSkills: string; missingReqs: string; visaSponsorship: string | null;
  workAuth: string | null; languages: string; requiredExp: string | null; status: string;
  region?: string;
};

function styleHeader(ws: ExcelJS.Worksheet, headers: string[]) {
  const row = ws.addRow(headers);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  row.height = 32;
  ws.autoFilter = { from: "A1", to: `${String.fromCharCode(64 + headers.length)}1` };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  headers.forEach((h, i) => { ws.getColumn(i + 1).width = Math.max(14, Math.min(40, h.length + 6)); });
}

function addJobRow(ws: ExcelJS.Worksheet, j: JobRow, idx: number, isOtherSkill = false) {
  const daysToDeadline = j.deadline
    ? `=IF(M${idx+2}="","Not stated",M${idx+2}-TODAY())`
    : "Not stated";
  const row = ws.addRow([
    idx + 1,
    j.region || "",
    j.country || "",
    j.city || j.location,
    j.title,
    j.company,
    "",
    "",
    j.employmentType || "Not stated",
    j.remoteType || "Not stated",
    j.datePosted ? j.datePosted.toISOString().slice(0, 10) : "Not shown",
    j.deadline ? j.deadline.toISOString().slice(0, 10) : "Not stated",
    daysToDeadline,
    j.salary || "Not stated",
    j.currency || "",
    j.matchScore ?? "",
    j.matchClass || "",
    j.source,
    { text: j.sourceUrl, hyperlink: j.sourceUrl },
    { text: j.applicationUrl || j.sourceUrl, hyperlink: j.applicationUrl || j.sourceUrl },
    j.visaSponsorship || "Unknown",
    j.workAuth || "Unknown",
    j.languages || "Unknown",
    j.requiredExp || "Unknown",
    j.strongSkills || "",
    j.missingReqs || "",
    j.status,
  ]);
  // conditional formatting via cell fill
  const scoreCell = row.getCell(16);
  const score = j.matchScore ?? 0;
  if (score >= 90) scoreCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC6EFCE" } };
  else if (score >= 80) scoreCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDEBF7" } };
  else if (score >= 70) scoreCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } };
  else if (score >= 60) scoreCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCE4D6" } };
  row.alignment = { vertical: "top", wrapText: true };
  return row;
}

export async function buildExcelReport(runId: string): Promise<Buffer> {
  const run = await db.agentRun.findUnique({ where: { id: runId }, include: { user: true } });
  if (!run) throw new Error("Run not found");

  const jobs = await db.job.findMany({ where: { userId: run.userId }, orderBy: { matchScore: "desc" } });
  const applications = await db.application.findMany({
    where: { userId: run.userId },
    include: { job: true, attempts: true },
    orderBy: { createdAt: "desc" },
  });
  const sources = await db.sourceChecked.findMany({ where: { runId } });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Autopilot AI Job Agent";
  wb.created = new Date();

  // --- SHEET 1: OPEN JOBS ---
  const ws1 = wb.addWorksheet("Open Jobs");
  const headers1 = ["#", "Region", "Country", "City", "Job Title", "Company", "Industry", "Seniority", "Employment Type", "Remote/Hybrid/Onsite", "Date Posted", "Deadline", "Days to Deadline", "Salary", "Currency", "Match Score", "Match Classification", "Source", "Job URL", "Application URL", "Visa Sponsorship", "Work Authorization", "Required Languages", "Required Experience", "Strong Matching Skills", "Missing Requirements", "Notes", "Application Status"];
  styleHeader(ws1, headers1);
  jobs.forEach((j, i) => {
    const row = addJobRow(ws1, {
      title: j.title, company: j.company, location: j.location, country: j.country, city: j.city,
      remoteType: j.remoteType, employmentType: j.employmentType, salary: j.salary, currency: j.currency,
      datePosted: j.datePosted, deadline: j.deadline, source: j.source, sourceUrl: j.sourceUrl,
      applicationUrl: j.applicationUrl, matchScore: j.matchScore, matchClass: j.matchClass,
      strongSkills: j.strongSkills, missingReqs: j.missingReqs, visaSponsorship: j.visaSponsorship,
      workAuth: j.workAuth, languages: j.languages, requiredExp: j.requiredExp, status: j.status,
    }, i);
  });
  // Application Status dropdown
  const statusCol = ws1.getColumn(28);
  for (let r = 2; r <= jobs.length + 1; r++) {
    ws1.getCell(r, 28).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"Not applied,Shortlisted,Applied,Interview,Assessment,Offer,Rejected,Not suitable"'],
    };
  }

  // --- SHEET 2: OTHER SKILL MATCHES ---
  const ws2 = wb.addWorksheet("Other Skill Matches");
  styleHeader(ws2, headers1);
  // (populated with jobs tagged as skill-match; for now reuse low-match jobs)
  const otherSkill = jobs.filter((j) => (j.matchScore ?? 0) < 60);
  otherSkill.forEach((j, i) => {
    addJobRow(ws2, {
      title: j.title, company: j.company, location: j.location, country: j.country, city: j.city,
      remoteType: j.remoteType, employmentType: j.employmentType, salary: j.salary, currency: j.currency,
      datePosted: j.datePosted, deadline: j.deadline, source: j.source, sourceUrl: j.sourceUrl,
      applicationUrl: j.applicationUrl, matchScore: j.matchScore, matchClass: j.matchClass,
      strongSkills: j.strongSkills, missingReqs: j.missingReqs, visaSponsorship: j.visaSponsorship,
      workAuth: j.workAuth, languages: j.languages, requiredExp: j.requiredExp, status: j.status,
    }, i, true);
  });

  // --- SHEET 3: APPLICATIONS SUBMITTED ---
  const ws3 = wb.addWorksheet("Applications Submitted");
  const h3 = ["Application ID", "Date Submitted", "Company", "Job Title", "Location", "Source", "Job URL", "Application URL", "CV Version", "Cover Letter", "Match Score", "Submission Confirmation", "Confirmation Reference", "Follow-up Date", "Current Status"];
  styleHeader(ws3, h3);
  const submittedApps = applications.filter((a) => a.status === "Submitted");
  submittedApps.forEach((a, i) => {
    ws3.addRow([
      a.id, a.submittedAt ? a.submittedAt.toISOString().slice(0, 10) : "",
      a.job.company, a.job.title, a.job.location, a.job.source,
      { text: a.job.sourceUrl, hyperlink: a.job.sourceUrl },
      { text: a.job.applicationUrl || a.job.sourceUrl, hyperlink: a.job.applicationUrl || a.job.sourceUrl },
      a.cvVersion ?? "", a.coverLetter ? "Yes" : "No", a.matchScore ?? "",
      a.status, a.confirmationRef || "", a.followUpDate ? a.followUpDate.toISOString().slice(0, 10) : "",
      a.status,
    ]);
  });

  // --- SHEET 4: APPLICATION ATTEMPTS ---
  const ws4 = wb.addWorksheet("Application Attempts");
  const h4 = ["Company", "Job", "Attempt Date", "Website", "Attempt Status", "Current Stage", "Questions Answered", "Missing Information", "Failure Reason", "CAPTCHA", "Login Required", "User Action Required", "Retry Eligible"];
  styleHeader(ws4, h4);
  applications.forEach((a) => {
    a.attempts.forEach((att) => {
      ws4.addRow([
        a.job.company, a.job.title, att.attemptedAt.toISOString().slice(0, 10), att.website,
        att.status, att.stage || "", att.questionsAnswered, att.missingInfo || "",
        att.failureReason || "", att.captcha ? "Yes" : "No", att.loginRequired ? "Yes" : "No",
        att.userActionReq ? "Yes" : "No", att.retryEligible ? "Yes" : "No",
      ]);
    });
  });

  // --- SHEET 5: OTHER SKILL & CAREER OPPORTUNITIES ---
  const ws5 = wb.addWorksheet("Other Skill & Career Opps");
  styleHeader(ws5, ["Opportunity Type", "Title / Industry", "Why It Fits", "Recommended Action", "Priority"]);
  const opps = [
    { type: "Alternative Title", title: "Production Support Engineer", why: "Matches Application Support + SQL + ERP troubleshooting", action: "Add to target titles", priority: "High" },
    { type: "Alternative Title", title: "Business Applications Specialist", why: "ERP + customer-facing support overlap", action: "Add to target titles", priority: "High" },
    { type: "Industry", title: "Healthcare IT / Pharma", why: "ERP + support roles common in regulated industries", action: "Broaden industry filter", priority: "Medium" },
    { type: "Industry", title: "Logistics & Supply Chain Tech", why: "ERP implementations need support engineers", action: "Broaden industry filter", priority: "Medium" },
    { type: "Skill", title: "API Testing (Postman/REST)", why: "Strong differentiator for support roles", action: "Highlight in CV summary", priority: "High" },
  ];
  opps.forEach((o) => ws5.addRow([o.type, o.title, o.why, o.action, o.priority]));

  // --- SHEET 6: SUMMARY ---
  const ws6 = wb.addWorksheet("Summary");
  const totalJobs = jobs.length;
  const uniqueJobs = new Set(jobs.map((j) => j.sourceUrl)).size;
  const excellent = jobs.filter((j) => (j.matchScore ?? 0) >= 90).length;
  const strong = jobs.filter((j) => (j.matchScore ?? 0) >= 80 && (j.matchScore ?? 0) < 90).length;
  const good = jobs.filter((j) => (j.matchScore ?? 0) >= 70 && (j.matchScore ?? 0) < 80).length;
  const submittedCount = applications.filter((a) => a.status === "Submitted").length;
  const failed = applications.filter((a) => a.status === "Failed").length;
  const pending = applications.filter((a) => a.status === "Started" || a.status === "Awaiting user action").length;
  const interviews = applications.filter((a) => a.status === "Interview").length;
  const offers = applications.filter((a) => a.status === "Offer").length;
  const rejected = applications.filter((a) => a.status === "Rejected").length;
  const upcomingDeadlines = jobs.filter((j) => j.deadline && j.deadline.getTime() > Date.now() && j.deadline.getTime() < Date.now() + 7 * 86400000).length;

  ws6.addRow(["Metric", "Value"]);
  const summaryRows = [
    ["Total vacancies discovered", totalJobs],
    ["Unique vacancies (deduped)", uniqueJobs],
    ["Excellent matches (90-100)", excellent],
    ["Strong matches (80-89)", strong],
    ["Good matches (70-79)", good],
    ["Applications submitted", submittedCount],
    ["Application attempts", applications.reduce((s, a) => s + a.attempts.length, 0)],
    ["Failed applications", failed],
    ["Pending applications", pending],
    ["Interviews", interviews],
    ["Offers", offers],
    ["Rejections", rejected],
    ["Upcoming deadlines (7 days)", upcomingDeadlines],
    ["Run ID", run.id],
    ["Run started", run.startedAt.toISOString()],
  ];
  summaryRows.forEach(([k, v]) => {
    const r = ws6.addRow([k, v]);
    r.getCell(1).font = { bold: true };
  });
  ws6.getColumn(1).width = 40;
  ws6.getColumn(2).width = 30;
  // Country breakdown
  ws6.addRow([]);
  ws6.addRow(["Jobs by Country", "Count"]).font = { bold: true };
  const byCountry: Record<string, number> = {};
  jobs.forEach((j) => { const c = j.country || j.location || "Unknown"; byCountry[c] = (byCountry[c] || 0) + 1; });
  Object.entries(byCountry).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => ws6.addRow([c, n]));
  ws6.addRow([]);
  ws6.addRow(["Jobs by Source", "Count"]).font = { bold: true };
  const bySource: Record<string, number> = {};
  jobs.forEach((j) => { bySource[j.source] = (bySource[j.source] || 0) + 1; });
  Object.entries(bySource).sort((a, b) => b[1] - a[1]).forEach(([s, n]) => ws6.addRow([s, n]));

  // --- SHEET 7: SOURCES CHECKED ---
  const ws7 = wb.addWorksheet("Sources Checked");
  const h7 = ["Website", "Country Portal", "Search Terms", "Job Categories", "Search Date", "Posting Date Filter", "Pages Visited", "Vacancies Discovered", "Vacancies Retained", "Login Required", "CAPTCHA", "Automation Permitted", "Search Depth", "Blocking Issues", "User Action Required", "Notes"];
  styleHeader(ws7, h7);
  sources.forEach((s) => {
    ws7.addRow([
      s.website, s.countryPortal || "", s.searchTerms, s.jobCategories, s.searchedAt.toISOString().slice(0, 10),
      s.postingFilter || "Last 14 days", s.pagesVisited, s.vacanciesFound, s.vacanciesKept,
      s.loginRequired ? "Yes" : "No", s.captcha ? "Yes" : "No", s.automationOk ? "Yes" : "No",
      s.searchDepth || "", s.blockingIssues || "", s.userActionReq ? "Yes" : "No", s.notes || "",
    ]);
  });

  // --- SHEET 8: FOLLOW-UPS ---
  const ws8 = wb.addWorksheet("Follow-Ups");
  const h8 = ["Company", "Job", "Application Date", "Recommended Follow-up Date", "Days Since Application", "Follow-up Status", "Suggested Message", "Contact URL"];
  styleHeader(ws8, h8);
  applications.filter((a) => a.status === "Submitted").forEach((a) => {
    const daysSince = Math.floor((Date.now() - a.submittedAt!.getTime()) / 86400000);
    const followUp = a.followUpDate ? a.followUpDate.toISOString().slice(0, 10) : new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    ws8.addRow([
      a.job.company, a.job.title, a.submittedAt!.toISOString().slice(0, 10), followUp,
      daysSince, "Pending", `Follow up on ${a.job.title} application at ${a.job.company}`, a.job.applicationUrl || a.job.sourceUrl,
    ]);
  });

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
