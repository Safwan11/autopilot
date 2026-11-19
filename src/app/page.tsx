"use client";
import { useState, useEffect } from "react";

export default function Home() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    const j = await fetch("/api/jobs").then((r) => r.json()).catch(() => ({ jobs: [] }));
    setJobs(j.jobs || []);
    const r = await fetch("/api/runs").then((r) => r.json()).catch(() => ({ runs: [] }));
    setRuns(r.runs || []);
  }
  useEffect(() => { load(); }, []);

  async function uploadCv(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMessage("Uploading & parsing CV...");
    const res = await fetch("/api/cv", { method: "POST", body: fd });
    const data = await res.json();
    setMessage(res.ok ? `CV uploaded. Skills: ${(data.parsed?.skills || []).join(", ")}` : `Error: ${data.error}`);
    load();
  }

  async function startRun() {
    setRunning(true);
    setMessage("Agent running: discovering jobs, scoring, generating Excel...");
    const res = await fetch("/api/runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "SEARCH_AND_SHORTLIST" }) });
    const data = await res.json();
    setRunning(false);
    if (res.ok) { setLastRun(data.runId); setMessage(`Run complete. ${data.jobsFound} jobs found. Report ready.`); load(); }
    else setMessage(`Error: ${data.error}`);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Autopilot ? AI Job Search & Application Agent</h1>
          <p className="text-slate-600">Upload your CV once. Let the agent search, match, apply, and report.</p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Stat label="Jobs discovered" value={jobs.length} />
          <Stat label="Excellent matches" value={jobs.filter((j) => (j.matchScore ?? 0) >= 90).length} />
          <Stat label="Strong matches" value={jobs.filter((j) => (j.matchScore ?? 0) >= 80 && (j.matchScore ?? 0) < 90).length} />
          <Stat label="Runs" value={runs.length} />
        </section>

        <section className="bg-white rounded-xl shadow p-5 mb-6">
          <h2 className="text-xl font-semibold mb-3">1. Upload CV</h2>
          <form onSubmit={uploadCv} className="flex gap-3 items-center">
            <input type="file" name="file" accept=".pdf,.docx" required className="border rounded p-2" />
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Upload & Parse</button>
          </form>
        </section>

        <section className="bg-white rounded-xl shadow p-5 mb-6">
          <h2 className="text-xl font-semibold mb-3">2. Run Agent</h2>
          <button onClick={startRun} disabled={running} className="bg-emerald-600 text-white px-5 py-2 rounded hover:bg-emerald-700 disabled:opacity-50">
            {running ? "Running..." : "Start Search & Shortlist Run"}
          </button>
          {lastRun && (
            <a href={`/api/excel?runId=${lastRun}`} className="ml-4 text-blue-600 underline" download>
              Download Excel Report
            </a>
          )}
          {message && <p className="mt-3 text-sm text-slate-700">{message}</p>}
        </section>

        <section className="bg-white rounded-xl shadow p-5">
          <h2 className="text-xl font-semibold mb-3">Discovered Jobs ({jobs.length})</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 text-left">Score</th>
                  <th className="p-2 text-left">Title</th>
                  <th className="p-2 text-left">Company</th>
                  <th className="p-2 text-left">Location</th>
                  <th className="p-2 text-left">Source</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Link</th>
                </tr>
              </thead>
              <tbody>
                {jobs.slice(0, 50).map((j) => (
                  <tr key={j.id} className="border-t">
                    <td className="p-2 font-bold">{j.matchScore ?? "-"}</td>
                    <td className="p-2">{j.title}</td>
                    <td className="p-2">{j.company}</td>
                    <td className="p-2">{j.location}</td>
                    <td className="p-2">{j.source}</td>
                    <td className="p-2">{j.status}</td>
                    <td className="p-2"><a href={j.sourceUrl} target="_blank" className="text-blue-600">open</a></td>
                  </tr>
                ))}
                {jobs.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-slate-500">No jobs yet. Upload a CV and run the agent.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}
