// Shared skills dictionary used both to read CVs and to read job descriptions.
// Each entry: canonical name + alternative spellings (all matched case-insensitively on word boundaries).
const SKILLS: [string, ...string[]][] = [
  // Support / ITSM
  ["Technical Support", "tech support", "it support"], ["Application Support", "app support"],
  ["Production Support"], ["Customer Support"], ["Help Desk", "helpdesk", "service desk"],
  ["Troubleshooting"], ["Incident Management"], ["Problem Management"], ["Change Management"],
  ["ITIL"], ["SLA", "slas"], ["Root Cause Analysis", "rca"], ["ServiceNow"], ["Zendesk"], ["Freshdesk"],
  ["Jira Service Management", "jira service desk"], ["Remedy", "bmc remedy"],
  // QA
  ["Manual Testing"], ["Automation Testing", "test automation", "automated testing"],
  ["Regression Testing"], ["UAT", "user acceptance testing"], ["Functional Testing"],
  ["Integration Testing"], ["Performance Testing", "load testing"], ["API Testing"],
  ["Test Cases", "test case"], ["Test Plans", "test plan"], ["Bug Tracking", "defect tracking"],
  ["Selenium"], ["Cypress"], ["Playwright"], ["Appium"], ["JMeter"], ["Postman"], ["SoapUI"],
  ["TestRail"], ["Zephyr"], ["Cucumber", "bdd"], ["ISTQB"], ["Mobile Testing"],
  // Enterprise / ERP
  ["ERP"], ["Oracle"], ["Oracle Fusion"], ["Oracle EBS", "e-business suite"], ["Oracle Cloud"],
  ["SAP"], ["SAP S/4HANA", "s/4hana", "s4hana"], ["Microsoft Dynamics", "dynamics 365", "d365"],
  ["NetSuite"], ["Odoo"], ["Workday"], ["Salesforce"], ["PeopleSoft"], ["Yardi"], ["MRI Software"],
  ["SharePoint"], ["CRM"],
  // Data
  ["SQL"], ["PL/SQL", "plsql"], ["T-SQL", "tsql"], ["MySQL"], ["PostgreSQL", "postgres"],
  ["SQL Server", "mssql"], ["Oracle Database"], ["MongoDB"], ["Redis"], ["Excel", "ms excel"],
  ["Power BI", "powerbi"], ["Tableau"], ["Data Analysis"], ["ETL"],
  // Dev / tools
  ["Python"], ["Java"], ["JavaScript", "js"], ["TypeScript", "ts"], ["C#", "c sharp"], [".NET", "dotnet", "asp.net"],
  ["PHP"], ["Go", "golang"], ["React"], ["Angular"], ["Vue", "vue.js"], ["Node.js", "nodejs", "node"],
  ["HTML"], ["CSS"], ["REST", "rest api", "restful"], ["SOAP"], ["GraphQL"], ["JSON"], ["XML"],
  ["Git"], ["GitHub"], ["GitLab"], ["Bitbucket"], ["Jira"], ["Confluence"], ["Azure DevOps", "ado", "tfs"],
  ["Jenkins"], ["CI/CD", "ci cd", "continuous integration"], ["Docker"], ["Kubernetes", "k8s"],
  ["Linux", "unix"], ["Bash", "shell scripting"], ["PowerShell"], ["Windows Server"],
  ["AWS", "amazon web services"], ["Azure", "microsoft azure"], ["GCP", "google cloud"],
  ["Networking", "tcp/ip"], ["Active Directory"], ["Splunk"], ["Grafana"], ["Kibana", "elk"],
  ["Datadog"], ["New Relic"], ["Kafka"], ["RabbitMQ"], ["Microservices"],
  // Methods / soft
  ["Agile"], ["Scrum"], ["Kanban"], ["SDLC"], ["STLC"], ["Documentation", "technical writing"],
  ["Stakeholder Management"], ["Training", "user training"], ["Communication"], ["Arabic"], ["English"],
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

const COMPILED = SKILLS.map(([name, ...alts]) => {
  const variants = [name, ...alts].map((v) => escape(v.toLowerCase()));
  // Word-ish boundaries that also work for names like "C#", ".NET", "CI/CD".
  return { name, re: new RegExp(`(^|[^a-z0-9])(${variants.join("|")})(?=$|[^a-z0-9])`, "i") };
});

export function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  return COMPILED.filter((s) => s.re.test(lower)).map((s) => s.name);
}

/** Does `text` mention `skill` (canonical dictionary skill or any free-form skill)? */
export function mentionsSkill(text: string, skill: string): boolean {
  const entry = COMPILED.find((c) => c.name.toLowerCase() === skill.toLowerCase());
  if (entry) return entry.re.test(text.toLowerCase());
  const re = new RegExp(`(^|[^a-z0-9])${escape(skill.toLowerCase())}(?=$|[^a-z0-9])`, "i");
  return re.test(text.toLowerCase());
}
