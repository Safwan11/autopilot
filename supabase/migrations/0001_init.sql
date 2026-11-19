-- D1 migration for Autopilot (SQLite-compatible)
CREATE TABLE IF NOT EXISTS User (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS Cv (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  fileName TEXT NOT NULL,
  filePath TEXT NOT NULL,
  rawText TEXT NOT NULL,
  parsed TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  isActive INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ProfessionalProfile (
  id TEXT PRIMARY KEY,
  userId TEXT UNIQUE NOT NULL,
  primaryTitle TEXT,
  titles TEXT NOT NULL DEFAULT '[]',
  skills TEXT NOT NULL DEFAULT '[]',
  experience TEXT NOT NULL DEFAULT '[]',
  education TEXT NOT NULL DEFAULT '[]',
  certifications TEXT NOT NULL DEFAULT '[]',
  languages TEXT NOT NULL DEFAULT '[]',
  yearsExp INTEGER,
  summary TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS WorkPreferences (
  id TEXT PRIMARY KEY,
  userId TEXT UNIQUE NOT NULL,
  countries TEXT NOT NULL DEFAULT '[]',
  cities TEXT NOT NULL DEFAULT '[]',
  remote INTEGER NOT NULL DEFAULT 1,
  hybrid INTEGER NOT NULL DEFAULT 1,
  onsite INTEGER NOT NULL DEFAULT 1,
  employmentTypes TEXT NOT NULL DEFAULT '[]',
  minSalary INTEGER,
  maxSalary INTEGER,
  currency TEXT,
  visaSponsorship INTEGER NOT NULL DEFAULT 0,
  workAuthorization TEXT,
  noticePeriod TEXT,
  availability TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Employer (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  name TEXT NOT NULL,
  country TEXT,
  industry TEXT,
  careersUrl TEXT,
  portal TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Job (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  externalId TEXT,
  employerId TEXT,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL,
  country TEXT,
  city TEXT,
  remoteType TEXT,
  employmentType TEXT,
  salary TEXT,
  currency TEXT,
  datePosted TEXT,
  deadline TEXT,
  source TEXT NOT NULL,
  sourceUrl TEXT UNIQUE NOT NULL,
  applicationUrl TEXT,
  description TEXT NOT NULL,
  matchScore INTEGER,
  matchClass TEXT,
  strongSkills TEXT NOT NULL DEFAULT '[]',
  missingReqs TEXT NOT NULL DEFAULT '[]',
  visaSponsorship TEXT,
  workAuth TEXT,
  languages TEXT NOT NULL DEFAULT '[]',
  requiredExp TEXT,
  isDuplicate INTEGER NOT NULL DEFAULT 0,
  duplicateOfId TEXT,
  status TEXT NOT NULL DEFAULT 'Discovered',
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
  FOREIGN KEY (employerId) REFERENCES Employer(id)
);

CREATE TABLE IF NOT EXISTS Application (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  jobId TEXT NOT NULL,
  cvId TEXT,
  cvVersion INTEGER,
  coverLetter TEXT,
  status TEXT NOT NULL DEFAULT 'Started',
  mode TEXT NOT NULL DEFAULT 'REVIEW',
  matchScore INTEGER,
  submittedAt TEXT,
  confirmationRef TEXT,
  followUpDate TEXT,
  errorReason TEXT,
  captchaEncountered INTEGER NOT NULL DEFAULT 0,
  loginRequired INTEGER NOT NULL DEFAULT 0,
  userActionRequired INTEGER NOT NULL DEFAULT 0,
  retryEligible INTEGER NOT NULL DEFAULT 0,
  answersSubmitted TEXT NOT NULL DEFAULT '[]',
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
  FOREIGN KEY (jobId) REFERENCES Job(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ApplicationAttempt (
  id TEXT PRIMARY KEY,
  applicationId TEXT NOT NULL,
  attemptedAt TEXT NOT NULL DEFAULT (datetime('now')),
  website TEXT NOT NULL,
  status TEXT NOT NULL,
  stage TEXT,
  questionsAnswered TEXT NOT NULL DEFAULT '[]',
  missingInfo TEXT,
  failureReason TEXT,
  captcha INTEGER NOT NULL DEFAULT 0,
  loginRequired INTEGER NOT NULL DEFAULT 0,
  userActionReq INTEGER NOT NULL DEFAULT 0,
  retryEligible INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (applicationId) REFERENCES Application(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS AnswerLibraryItem (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS AgentRun (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  startedAt TEXT NOT NULL DEFAULT (datetime('now')),
  completedAt TEXT,
  mode TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Running',
  jobsFound INTEGER NOT NULL DEFAULT 0,
  jobsApplied INTEGER NOT NULL DEFAULT 0,
  jobsFailed INTEGER NOT NULL DEFAULT 0,
  log TEXT NOT NULL DEFAULT '[]',
  reportPath TEXT,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS SourceChecked (
  id TEXT PRIMARY KEY,
  runId TEXT NOT NULL,
  website TEXT NOT NULL,
  countryPortal TEXT,
  searchTerms TEXT NOT NULL,
  jobCategories TEXT NOT NULL DEFAULT '[]',
  searchedAt TEXT NOT NULL DEFAULT (datetime('now')),
  postingFilter TEXT,
  pagesVisited INTEGER NOT NULL DEFAULT 0,
  vacanciesFound INTEGER NOT NULL DEFAULT 0,
  vacanciesKept INTEGER NOT NULL DEFAULT 0,
  loginRequired INTEGER NOT NULL DEFAULT 0,
  captcha INTEGER NOT NULL DEFAULT 0,
  automationOk INTEGER NOT NULL DEFAULT 1,
  searchDepth TEXT,
  blockingIssues TEXT,
  userActionReq INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);
