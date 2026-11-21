// JobPilot Importer — reads job listings from the page you're viewing and sends them to your JobPilot account.
const DEFAULT_URL = "https://jobpilot-mena.vercel.app";
const $ = (id) => document.getElementById(id);
let cfg = { baseUrl: DEFAULT_URL, token: "" };
let page = null;
let tabId = null;

/**
 * Runs inside the job site's page (injected with chrome.scripting). Must be self-contained.
 * Reads search-result lists on Bayt, GulfTalent and Wuzzuf, and single job pages on any site
 * that publishes standard schema.org JobPosting data (LinkedIn, Glassdoor, Naukrigulf, Bayt, career sites…).
 */
async function jpExtract(opts) {
  const T = (el) => (el ? el.textContent : "").replace(/\s+/g, " ").replace(/\s+,/g, ",").trim();
  const abs = (h) => { try { return new URL(h, location.href).href.split("#")[0]; } catch { return null; } };
  const host = location.hostname.replace(/^www\./, "");
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const ago = (s) => {
    const m = (s || "").toLowerCase().match(/(\d+)\s*(minute|hour|day|week|month)/);
    if (!m) return /today|just now|hour/.test((s || "").toLowerCase()) ? new Date().toISOString() : null;
    const unit = { minute: 6e4, hour: 36e5, day: 864e5, week: 6048e5, month: 2592e6 }[m[2]];
    return new Date(Date.now() - Number(m[1]) * unit).toISOString();
  };
  const ldPostings = (doc) =>
    [...doc.querySelectorAll('script[type="application/ld+json"]')]
      .flatMap((s) => { try { const j = JSON.parse(s.textContent); return Array.isArray(j) ? j : j["@graph"] || [j]; } catch { return []; } })
      .filter((x) => x && [].concat(x["@type"]).includes("JobPosting"));
  const fromLd = (p, url) => {
    const locs = [].concat(p.jobLocation || []).map((l) => {
      const a = (l && l.address) || {};
      return [a.addressLocality, a.addressRegion !== a.addressLocality ? a.addressRegion : null, typeof a.addressCountry === "string" ? a.addressCountry : a.addressCountry && a.addressCountry.name]
        .filter(Boolean).join(", ");
    }).filter(Boolean);
    const org = p.hiringOrganization;
    const sal = p.baseSalary && p.baseSalary.value;
    return {
      title: (p.title || "").trim(),
      company: typeof org === "string" ? org : (org && org.name) || "",
      url: url || p.url || location.href,
      location: locs.join(" · ") || null,
      description: p.description || "",
      postedAt: p.datePosted || null,
      employmentType: [].concat(p.employmentType || []).join(", ") || null,
      remoteType: p.jobLocationType === "TELECOMMUTE" ? "Remote" : null,
      salary: sal ? [sal.minValue, sal.maxValue].filter(Boolean).join("–") + (p.baseSalary.currency ? " " + p.baseSalary.currency : "") || null : null,
      externalId: p.identifier && (p.identifier.value || p.identifier.name) ? String(p.identifier.value || p.identifier.name) : null,
    };
  };

  let site = host;
  let kind = "list";
  let jobs = [];

  if (host.endsWith("bayt.com")) {
    site = "Bayt";
    jobs = [...document.querySelectorAll("li[data-js-job]")].map((li) => {
      const a = li.querySelector("h2 a");
      const ts = li.querySelector("[data-automation-jobactivedate]");
      return a && {
        title: (a.getAttribute("title") || T(a)).trim(),
        company: T(li.querySelector(".job-company-location-wrapper div")) || "Confidential",
        url: abs(a.getAttribute("href")),
        location: T(li.querySelector(".jb-label-location")) || null,
        description: T(li.querySelector(".jb-descr")).replace(/^Summary:\s*/i, ""),
        postedAt: ts ? new Date(Number(ts.getAttribute("data-automation-jobactivedate")) * 1000).toISOString() : ago(T(li.querySelector(".jb-date"))),
        externalId: li.getAttribute("data-job-id"),
      };
    });
  } else if (host.endsWith("gulftalent.com")) {
    site = "GulfTalent";
    const year = new Date().getFullYear();
    jobs = [...document.querySelectorAll("tr")].map((tr) => {
      const a = tr.querySelector("a.ga-job-click") || tr.querySelector("a.title");
      if (!a) return null;
      const tds = tr.querySelectorAll("td");
      const d = new Date(`${T(tds[2])} ${year} 12:00`);
      return {
        title: T(a),
        company: T(tr.querySelector("td a.text-muted")) || "",
        url: abs(a.getAttribute("href")),
        location: T(tds[1]) || null,
        description: "",
        postedAt: isNaN(d) ? null : (d > new Date() ? new Date(`${T(tds[2])} ${year - 1} 12:00`) : d).toISOString(),
        externalId: (a.getAttribute("href") || "").match(/(\d+)$/)?.[1] || null,
      };
    });
  } else if (host.endsWith("wuzzuf.net") && !/\/jobs\/p\//.test(location.pathname)) {
    site = "Wuzzuf";
    jobs = [...document.querySelectorAll('h2 a[href*="/jobs/p/"]')].map((a) => {
      const box = a.closest("h2") && a.closest("h2").parentElement;
      const meta = box && box.querySelector("div");
      const card = box && box.parentElement && box.parentElement.parentElement;
      return {
        title: T(a),
        company: T(meta && meta.querySelector("a")).replace(/\s*-\s*$/, "") || "Confidential",
        url: abs(a.getAttribute("href")),
        location: T(meta && meta.querySelector("span")) || "Egypt",
        description: card ? card.innerText.split("\n").map((l) => l.trim()).filter(Boolean).join(" · ").slice(0, 600) : "",
        remoteType: card && /\bRemote\b/.test(card.innerText) ? "Remote" : card && /\bHybrid\b/.test(card.innerText) ? "Hybrid" : null,
        postedAt: ago(T(meta && meta.querySelector("div"))),
        externalId: (a.getAttribute("href") || "").split("/").pop(),
      };
    });
  }
  jobs = jobs.filter((j) => j && j.title && j.url);

  // Single job page.
  if (!jobs.length) {
    kind = "single";
    const p = ldPostings(document)[0];
    if (p) {
      jobs = [fromLd(p, location.href.split("?")[0])];
    } else if (host.endsWith("wuzzuf.net") && /\/jobs\/p\//.test(location.pathname)) {
      const h1 = document.querySelector("h1");
      const lines = h1 ? h1.parentElement.innerText.split("\n").map((l) => l.trim()).filter(Boolean) : [];
      const skip = /^(full time|part time|hybrid|remote|on-?site|freelance.*|internship|shift based|-|posted .*|apply for job|\d+ applicants?.*)$/i;
      const rest = lines.slice(1).filter((l) => !skip.test(l));
      const section = (name) => {
        const h = [...document.querySelectorAll("h2,h3,h4")].find((x) => x.textContent.trim().toLowerCase() === name);
        return h && h.parentElement ? h.parentElement.innerText.replace(new RegExp("^" + name, "i"), "").trim() : "";
      };
      jobs = [{
        title: h1 ? T(h1) : document.title,
        company: rest[0] || "Confidential",
        url: location.href.split("?")[0],
        location: rest[1] || "Egypt",
        description: [section("job description"), section("job requirements")].filter(Boolean).join("\n\n"),
        postedAt: ago(lines.find((l) => /^posted/i.test(l))),
        remoteType: lines.some((l) => /^remote$/i.test(l)) ? "Remote" : lines.some((l) => /^hybrid$/i.test(l)) ? "Hybrid" : null,
        employmentType: lines.find((l) => /^(full time|part time|freelance|internship)/i.test(l)) || null,
      }];
    }
    if (jobs.length) site = { "bayt.com": "Bayt", "gulftalent.com": "GulfTalent", "wuzzuf.net": "Wuzzuf", "linkedin.com": "LinkedIn", "glassdoor.com": "Glassdoor", "naukrigulf.com": "Naukrigulf" }[Object.keys({ "bayt.com": 1, "gulftalent.com": 1, "wuzzuf.net": 1, "linkedin.com": 1, "glassdoor.com": 1, "naukrigulf.com": 1 }).find((d) => host.endsWith(d))] || host;
  }

  // Optionally open each result's own page (same site, your browser) to read the full description.
  if (opts && opts.details && kind === "list" && site !== "Wuzzuf") {
    const todo = jobs.filter((j) => (j.description || "").length < 300).slice(0, opts.max || 20);
    for (const j of todo) {
      try {
        const html = await (await fetch(j.url, { credentials: "include" })).text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const p = ldPostings(doc)[0];
        if (p) {
          const d = fromLd(p, j.url);
          j.description = d.description || j.description;
          j.employmentType = d.employmentType || j.employmentType;
          j.company = j.company || d.company;
          j.salary = d.salary || j.salary;
        }
      } catch (e) { /* keep the listing as is */ }
      await sleep(350);
    }
  }
  return { site, kind, jobs, pageUrl: location.href };
}

async function loadCfg() {
  const s = await chrome.storage.local.get(["baseUrl", "token"]);
  cfg = { baseUrl: s.baseUrl || DEFAULT_URL, token: s.token || "" };
}

function show(view) {
  $("settings").hidden = view !== "settings";
  $("main").hidden = view !== "main";
}

async function api(path, init = {}) {
  const res = await fetch(cfg.baseUrl.replace(/\/$/, "") + path, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.token}`, ...(init.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `JobPilot answered ${res.status}`);
  return data;
}

async function readPage(details) {
  const [{ result }] = await chrome.scripting.executeScript({ target: { tabId }, func: jpExtract, args: [{ details, max: 20 }] });
  return result;
}

function esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

async function scan() {
  show("main");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab && tab.id;
  if (!tab || !/^https?:/.test(tab.url || "")) {
    $("status").textContent = "Open a job site in this tab first.";
    $("help").hidden = false;
    return;
  }
  try {
    page = await readPage(false);
  } catch (e) {
    $("status").textContent = "Can't read this page (the browser doesn't allow extensions here).";
    $("help").hidden = false;
    return;
  }
  const n = page.jobs.length;
  if (!n) {
    $("status").textContent = "No job listings found on this page.";
    $("help").hidden = false;
    return;
  }
  $("status").innerHTML = page.kind === "single" ? `This job on <b>${esc(page.site)}</b>:` : `Found <b>${n}</b> job${n === 1 ? "" : "s"} on <b>${esc(page.site)}</b>:`;
  $("preview").innerHTML = page.jobs.slice(0, 30).map((j) => `<li><b>${esc(j.title)}</b><span>${esc([j.company, j.location].filter(Boolean).join(" · "))}</span></li>`).join("");
  $("detailsRow").hidden = !(page.kind === "list" && page.site !== "Wuzzuf");
  $("send").hidden = false;
  $("send").textContent = n === 1 ? "Send this job to JobPilot" : `Send ${n} jobs to JobPilot`;
}

async function send() {
  const btn = $("send");
  btn.disabled = true;
  $("result").className = "msg";
  try {
    let data = page;
    if (!$("detailsRow").hidden && $("details").checked) {
      btn.textContent = "Reading job descriptions…";
      data = await readPage(true);
    }
    btn.textContent = "Sending…";
    const r = await api("/api/import", { method: "POST", body: JSON.stringify({ source: data.site, pageUrl: data.pageUrl, jobs: data.jobs.slice(0, 100) }) });
    $("result").className = "msg ok";
    $("result").innerHTML = `Added <b>${r.added}</b> new job${r.added === 1 ? "" : "s"}${r.updated ? `, updated ${r.updated}` : ""} · ${r.goodMatches} good match${r.goodMatches === 1 ? "" : "es"}. <a id="openJobs">Open in JobPilot</a>`;
    $("openJobs").onclick = () => chrome.tabs.create({ url: cfg.baseUrl.replace(/\/$/, "") + "/jobs?sort=new" });
    btn.textContent = "Sent ✓";
  } catch (e) {
    $("result").className = "msg err";
    $("result").textContent = e.message;
    btn.disabled = false;
    btn.textContent = "Try again";
  }
}

async function saveSettings() {
  cfg.baseUrl = ($("baseUrl").value || DEFAULT_URL).trim().replace(/\/$/, "");
  cfg.token = $("token").value.trim();
  $("settingsMsg").className = "msg";
  $("settingsMsg").textContent = "Testing…";
  try {
    const me = await api("/api/import");
    await chrome.storage.local.set(cfg);
    $("settingsMsg").className = "msg ok";
    $("settingsMsg").textContent = `Connected as ${me.name || me.email}.`;
    setTimeout(scan, 700);
  } catch (e) {
    $("settingsMsg").className = "msg err";
    $("settingsMsg").textContent = e.message;
  }
}

document.addEventListener("click", (e) => {
  const url = e.target && e.target.getAttribute && e.target.getAttribute("data-open");
  if (url) chrome.tabs.create({ url });
});
$("openSettings").onclick = () => { $("baseUrl").value = cfg.baseUrl; $("token").value = cfg.token; show("settings"); };
$("save").onclick = saveSettings;
$("send").onclick = send;

loadCfg().then(() => {
  if (!cfg.token) { $("baseUrl").value = cfg.baseUrl; show("settings"); }
  else scan();
});
