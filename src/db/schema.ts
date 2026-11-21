import {
  pgTable, text, timestamp, integer, boolean, jsonb, uuid, uniqueIndex, index,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // sha256 of the cookie token
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("sessions_user_idx").on(t.userId)]);

export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  fullName: text("full_name"),
  headline: text("headline"),
  email: text("email"),
  phone: text("phone"),
  location: text("location"),
  linkedin: text("linkedin"),
  website: text("website"),
  yearsExperience: integer("years_experience"),
  summary: text("summary"),
  titles: jsonb("titles").$type<string[]>().notNull().default([]),
  skills: jsonb("skills").$type<string[]>().notNull().default([]),
  languages: jsonb("languages").$type<string[]>().notNull().default([]),
  cvFileName: text("cv_file_name"),
  cvText: text("cv_text"),
  cvUploadedAt: timestamp("cv_uploaded_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const preferences = pgTable("preferences", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
  locations: jsonb("locations").$type<string[]>().notNull().default([]),
  remote: boolean("remote").notNull().default(true),
  hybrid: boolean("hybrid").notNull().default(true),
  onsite: boolean("onsite").notNull().default(true),
  minScore: integer("min_score").notNull().default(55),
  excludeKeywords: jsonb("exclude_keywords").$type<string[]>().notNull().default([]),
  excludeCompanies: jsonb("exclude_companies").$type<string[]>().notNull().default([]),
  sources: jsonb("sources").$type<string[]>().notNull().default([]), // automatic sources; [] = all
  linkSources: jsonb("link_sources").$type<string[] | null>(), // quick-search sites; null = all
  maxAgeDays: integer("max_age_days").notNull().default(30),
  autoSearch: boolean("auto_search").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SourceStat = { found: number; kept: number; error?: string };

export const runs = pgTable("runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("running"), // running | completed | failed
  trigger: text("trigger").notNull().default("manual"), // manual | scheduled
  queries: jsonb("queries").$type<string[]>().notNull().default([]),
  jobsFound: integer("jobs_found").notNull().default(0),
  jobsNew: integer("jobs_new").notNull().default(0),
  jobsMatched: integer("jobs_matched").notNull().default(0),
  sourceStats: jsonb("source_stats").$type<Record<string, SourceStat>>().notNull().default({}),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
}, (t) => [index("runs_user_idx").on(t.userId, t.startedAt)]);

export type ScoreBreakdown = { skills: number; title: number; location: number; seniority: number };

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  runId: uuid("run_id").references(() => runs.id, { onDelete: "set null" }),
  source: text("source").notNull(),
  externalId: text("external_id"),
  url: text("url").notNull(),
  applyUrl: text("apply_url"),
  title: text("title").notNull(),
  company: text("company").notNull(),
  companyLogo: text("company_logo"),
  location: text("location"),
  remoteType: text("remote_type"), // Remote | Hybrid | Onsite
  employmentType: text("employment_type"),
  salary: text("salary"),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  description: text("description").notNull().default(""),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  score: integer("score").notNull().default(0),
  breakdown: jsonb("breakdown").$type<ScoreBreakdown>(),
  matchedSkills: jsonb("matched_skills").$type<string[]>().notNull().default([]),
  missingSkills: jsonb("missing_skills").$type<string[]>().notNull().default([]),
  reasoning: text("reasoning"),
  aiScored: boolean("ai_scored").notNull().default(false),
  status: text("status").notNull().default("new"), // new | saved | hidden | applied
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("jobs_user_url_uq").on(t.userId, t.url),
  index("jobs_user_score_idx").on(t.userId, t.score),
]);

export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId: uuid("job_id").references(() => jobs.id, { onDelete: "set null" }),
  company: text("company").notNull(),
  title: text("title").notNull(),
  url: text("url"),
  location: text("location"),
  status: text("status").notNull().default("applied"), // applied | interviewing | offer | rejected | withdrawn
  appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
  followUpAt: timestamp("follow_up_at", { withTimezone: true }),
  contact: text("contact"),
  salary: text("salary"),
  notes: text("notes"),
  coverLetter: text("cover_letter"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("applications_user_idx").on(t.userId, t.status)]);

export const answers = pgTable("answers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("answers_user_idx").on(t.userId)]);

export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Preferences = typeof preferences.$inferSelect;
export type Run = typeof runs.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type Answer = typeof answers.$inferSelect;
