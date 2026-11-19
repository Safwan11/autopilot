-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Cv" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "parsed" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Cv_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProfessionalProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "primaryTitle" TEXT,
    "titles" TEXT NOT NULL DEFAULT '[]',
    "skills" TEXT NOT NULL DEFAULT '[]',
    "experience" TEXT NOT NULL DEFAULT '[]',
    "education" TEXT NOT NULL DEFAULT '[]',
    "certifications" TEXT NOT NULL DEFAULT '[]',
    "languages" TEXT NOT NULL DEFAULT '[]',
    "yearsExp" INTEGER,
    "summary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProfessionalProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkPreferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "countries" TEXT NOT NULL DEFAULT '[]',
    "cities" TEXT NOT NULL DEFAULT '[]',
    "remote" BOOLEAN NOT NULL DEFAULT true,
    "hybrid" BOOLEAN NOT NULL DEFAULT true,
    "onsite" BOOLEAN NOT NULL DEFAULT true,
    "employmentTypes" TEXT NOT NULL DEFAULT '[]',
    "minSalary" INTEGER,
    "maxSalary" INTEGER,
    "currency" TEXT,
    "visaSponsorship" BOOLEAN NOT NULL DEFAULT false,
    "workAuthorization" TEXT,
    "noticePeriod" TEXT,
    "availability" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Employer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "industry" TEXT,
    "careersUrl" TEXT,
    "portal" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Employer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "externalId" TEXT,
    "employerId" TEXT,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "country" TEXT,
    "city" TEXT,
    "remoteType" TEXT,
    "employmentType" TEXT,
    "salary" TEXT,
    "currency" TEXT,
    "datePosted" DATETIME,
    "deadline" DATETIME,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "applicationUrl" TEXT,
    "description" TEXT NOT NULL,
    "matchScore" INTEGER,
    "matchClass" TEXT,
    "strongSkills" TEXT NOT NULL DEFAULT '[]',
    "missingReqs" TEXT NOT NULL DEFAULT '[]',
    "visaSponsorship" TEXT,
    "workAuth" TEXT,
    "languages" TEXT NOT NULL DEFAULT '[]',
    "requiredExp" TEXT,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "duplicateOfId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Discovered',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Job_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "Employer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "cvId" TEXT,
    "cvVersion" INTEGER,
    "coverLetter" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Started',
    "mode" TEXT NOT NULL DEFAULT 'REVIEW',
    "matchScore" INTEGER,
    "submittedAt" DATETIME,
    "confirmationRef" TEXT,
    "followUpDate" DATETIME,
    "errorReason" TEXT,
    "captchaEncountered" BOOLEAN NOT NULL DEFAULT false,
    "loginRequired" BOOLEAN NOT NULL DEFAULT false,
    "userActionRequired" BOOLEAN NOT NULL DEFAULT false,
    "retryEligible" BOOLEAN NOT NULL DEFAULT false,
    "answersSubmitted" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApplicationAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "attemptedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "website" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "stage" TEXT,
    "questionsAnswered" TEXT NOT NULL DEFAULT '[]',
    "missingInfo" TEXT,
    "failureReason" TEXT,
    "captcha" BOOLEAN NOT NULL DEFAULT false,
    "loginRequired" BOOLEAN NOT NULL DEFAULT false,
    "userActionReq" BOOLEAN NOT NULL DEFAULT false,
    "retryEligible" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ApplicationAttempt_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnswerLibraryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AnswerLibraryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Running',
    "jobsFound" INTEGER NOT NULL DEFAULT 0,
    "jobsApplied" INTEGER NOT NULL DEFAULT 0,
    "jobsFailed" INTEGER NOT NULL DEFAULT 0,
    "log" TEXT NOT NULL DEFAULT '[]',
    "reportPath" TEXT,
    CONSTRAINT "AgentRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SourceChecked" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "countryPortal" TEXT,
    "searchTerms" TEXT NOT NULL,
    "jobCategories" TEXT NOT NULL DEFAULT '[]',
    "searchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postingFilter" TEXT,
    "pagesVisited" INTEGER NOT NULL DEFAULT 0,
    "vacanciesFound" INTEGER NOT NULL DEFAULT 0,
    "vacanciesKept" INTEGER NOT NULL DEFAULT 0,
    "loginRequired" BOOLEAN NOT NULL DEFAULT false,
    "captcha" BOOLEAN NOT NULL DEFAULT false,
    "automationOk" BOOLEAN NOT NULL DEFAULT true,
    "searchDepth" TEXT,
    "blockingIssues" TEXT,
    "userActionReq" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalProfile_userId_key" ON "ProfessionalProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkPreferences_userId_key" ON "WorkPreferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_sourceUrl_key" ON "Job"("sourceUrl");
