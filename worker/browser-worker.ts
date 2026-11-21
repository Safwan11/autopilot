import { chromium, Browser, BrowserContext, Page } from "playwright";
import fs from "node:fs";

export interface BrowserTask {
  url: string;
  cvPath?: string;
  profile: Record<string, string>;
  questions?: { question: string; answer: string }[];
}

export interface BrowserResult {
  success: boolean;
  submitted: boolean;
  confirmationRef?: string;
  screenshotPath?: string;
  error?: string;
  logs: string[];
}

export class BrowserWorker {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private logs: string[] = [];

  private log(msg: string) { this.logs.push(`[${new Date().toISOString()}] ${msg}`); }

  async start(headless = true, userDataDir?: string) {
    this.browser = await chromium.launch({ headless });
    this.context = await this.browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1366, height: 900 },
    });
    this.page = await this.context.newPage();
    this.log("Browser started");
  }

  async open(url: string) {
    if (!this.page) throw new Error("Browser not started");
    await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    this.log(`Opened ${url}`);
  }

  async readText(): Promise<string> {
    if (!this.page) return "";
    return await this.page.evaluate(() => document.body.innerText);
  }

  async screenshot(outPath: string) {
    if (!this.page) return;
    await this.page.screenshot({ path: outPath, fullPage: true });
    this.log(`Screenshot saved: ${outPath}`);
  }

  async fillForm(profile: Record<string, string>) {
    if (!this.page) return;
    const page = this.page;
    // Generic text inputs by common name/aria/placeholder
    const fieldMap: Record<string, string[]> = {
      firstName: ["first_name", "firstname", "firstName", "first name"],
      lastName: ["last_name", "lastname", "lastName", "last name", "surname"],
      email: ["email", "e-mail", "emailAddress"],
      phone: ["phone", "telephone", "mobile", "phone_number"],
      city: ["city", "town"],
      country: ["country", "nation"],
      linkedin: ["linkedin", "linkedin_url", "linkedinUrl"],
      github: ["github", "github_url"],
    };
    for (const [key, val] of Object.entries(profile)) {
      const candidates = fieldMap[key] || [key];
      for (const c of candidates) {
        const sel = `input[name*="${c}" i], input[aria-label*="${c}" i], input[placeholder*="${c}" i]`;
        const loc = page.locator(sel).first();
        if (await loc.count() > 0) {
          await loc.fill(val).catch(() => {});
          this.log(`Filled ${key} -> ${c}`);
        }
      }
    }
  }

  async uploadFile(selector: string, filePath: string) {
    if (!this.page) return false;
    const loc = this.page.locator(selector).first();
    if (await loc.count() === 0) return false;
    await loc.setInputFiles(filePath);
    this.log(`Uploaded ${filePath} to ${selector}`);
    return true;
  }

  async clickApply() {
    if (!this.page) return false;
    const selectors = [
      'a:has-text("Apply")', 'button:has-text("Apply")',
      'a:has-text("Apply now")', 'button:has-text("Apply now")',
      '[data-testid*="apply"]',
    ];
    for (const s of selectors) {
      const loc = this.page.locator(s).first();
      if (await loc.count() > 0) {
        await loc.click().catch(() => {});
        this.log(`Clicked apply via ${s}`);
        await this.page.waitForTimeout(2000);
        return true;
      }
    }
    return false;
  }

  async close() {
    await this.context?.close();
    await this.browser?.close();
    this.browser = null; this.context = null; this.page = null;
    this.log("Browser closed");
  }

  getLogs() { return this.logs; }
}

export async function runBrowserTask(task: BrowserTask): Promise<BrowserResult> {
  const worker = new BrowserWorker();
  const result: BrowserResult = { success: false, submitted: false, logs: [] };
  try {
    await worker.start(true);
    await worker.open(task.url);
    const text = await worker.readText();
    if (text.length < 200) {
      result.error = "Page content too short / possibly blocked";
    } else {
      result.success = true;
    }
    if (task.cvPath) {
      await worker.uploadFile('input[type="file"]', task.cvPath).catch(() => {});
    }
    await worker.fillForm(task.profile);
    const shot = `./screenshots/${Date.now()}.png`;
    fs.mkdirSync("./screenshots", { recursive: true });
    await worker.screenshot(shot).catch(() => {});
    result.screenshotPath = shot;
    result.logs = worker.getLogs();
  } catch (e: any) {
    result.error = e?.message || String(e);
    result.logs = worker.getLogs();
  } finally {
    await worker.close();
  }
  return result;
}
