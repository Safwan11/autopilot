import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export interface ParsedCv {
  rawText: string;
  skills: string[];
  titles: string[];
  emails: string[];
  phones: string[];
  summary: string;
}

const TECH_SKILLS = [
  "SQL", "Oracle", "Oracle Fusion", "API Testing", "Postman", "Jira", "Azure DevOps",
  "Manual Testing", "QA", "Quality Assurance", "ERP", "SAP", "Excel", "Python",
  "Java", "JavaScript", "TypeScript", "React", "Node.js", "Git", "Linux",
  "UAT", "Regression Testing", "Automation Testing", "Selenium", "Cypress",
  "REST", "SOAP", "JSON", "XML", "Agile", "Scrum", "Jenkins", "Docker",
  "Kubernetes", "AWS", "Azure", "GCP", "MongoDB", "PostgreSQL", "MySQL",
  "Redis", "Elasticsearch", "Kafka", "RabbitMQ", "CI/CD", "GitHub", "GitLab",
  "Bitbucket", "Confluence", "Trello", "Asana", "ServiceNow", "Salesforce",
  "Workday", "PeopleSoft", "NetSuite", "Dynamics", "SharePoint", "PowerBI",
  "Tableau", "Looker", "Grafana", "Prometheus", "Splunk", "ELK",
];

const TITLE_PATTERNS = [
  /software support engineer/i,
  /application support engineer/i,
  /technical support engineer/i,
  /qa engineer/i,
  /manual qa/i,
  /qa analyst/i,
  /software tester/i,
  /api tester/i,
  /erp support/i,
  /oracle.*support/i,
  /implementation support/i,
  /production support/i,
  /business application support/i,
  /uat tester/i,
  /mobile.*tester/i,
  /software implementation/i,
];

export async function extractText(buf: Buffer, fileName: string, mime: string): Promise<string> {
  const filePath = fileName;
  if (mime === "application/pdf" || filePath.toLowerCase().endsWith(".pdf")) {
    const parser = new PDFParse({ data: buf });
    const data = await parser.getText();
    return data.text || "";
  }
  if (filePath.toLowerCase().endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer: buf });
    return result.value || "";
  }
  return buf.toString("utf8");
}

export function parseCv(rawText: string): ParsedCv {
  const lower = rawText.toLowerCase();
  const skills = TECH_SKILLS.filter((s) => lower.includes(s.toLowerCase()));
  const titles: string[] = [];
  for (const re of TITLE_PATTERNS) {
    const m = rawText.match(re);
    if (m) titles.push(m[0]);
  }
  const emails = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const phones = rawText.match(/(\+?\d[\d\s\-()]{7,}\d)/g) || [];
  const summary = rawText.slice(0, 500).trim();
  return { rawText, skills: Array.from(new Set(skills)), titles: Array.from(new Set(titles)), emails, phones, summary };
}
