-- CreateTable
CREATE TABLE "Audit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "domain" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "lighthouseResults" JSONB,
    "seoBasicResults" JSONB,
    "securityResults" JSONB,
    "rgpdResults" JSONB,
    "cookiesResults" JSONB,
    "seoAdvancedResults" JSONB,
    "executionTime" INTEGER NOT NULL,
    "pdfGenerated" BOOLEAN NOT NULL DEFAULT false,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailMessageId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "errorMessage" TEXT
);

-- CreateTable
CREATE TABLE "AuditCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "domain" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "results" JSONB NOT NULL
);

-- CreateTable
CREATE TABLE "SecurityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "endpoint" TEXT,
    "domain" TEXT,
    "email" TEXT,
    "message" TEXT NOT NULL,
    "details" JSONB
);

-- CreateTable
CREATE TABLE "Statistics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAudits" INTEGER NOT NULL DEFAULT 0,
    "fastAudits" INTEGER NOT NULL DEFAULT 0,
    "completeAudits" INTEGER NOT NULL DEFAULT 0,
    "emailsSent" INTEGER NOT NULL DEFAULT 0,
    "emailsFailed" INTEGER NOT NULL DEFAULT 0,
    "securityEvents" INTEGER NOT NULL DEFAULT 0,
    "rateLimitHits" INTEGER NOT NULL DEFAULT 0,
    "avgExecutionTime" REAL
);

-- CreateTable
CREATE TABLE "PopularDomain" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "domain" TEXT NOT NULL,
    "auditCount" INTEGER NOT NULL DEFAULT 1,
    "lastAuditAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "avgPerformance" REAL,
    "avgSeo" REAL,
    "avgAccessibility" REAL,
    "avgBestPractices" REAL
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Audit_requestId_key" ON "Audit"("requestId");

-- CreateIndex
CREATE INDEX "Audit_domain_idx" ON "Audit"("domain");

-- CreateIndex
CREATE INDEX "Audit_email_idx" ON "Audit"("email");

-- CreateIndex
CREATE INDEX "Audit_createdAt_idx" ON "Audit"("createdAt");

-- CreateIndex
CREATE INDEX "Audit_ipAddress_idx" ON "Audit"("ipAddress");

-- CreateIndex
CREATE INDEX "AuditCache_expiresAt_idx" ON "AuditCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuditCache_domain_mode_key" ON "AuditCache"("domain", "mode");

-- CreateIndex
CREATE INDEX "SecurityLog_type_idx" ON "SecurityLog"("type");

-- CreateIndex
CREATE INDEX "SecurityLog_severity_idx" ON "SecurityLog"("severity");

-- CreateIndex
CREATE INDEX "SecurityLog_ipAddress_idx" ON "SecurityLog"("ipAddress");

-- CreateIndex
CREATE INDEX "SecurityLog_createdAt_idx" ON "SecurityLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Statistics_date_key" ON "Statistics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PopularDomain_domain_key" ON "PopularDomain"("domain");

-- CreateIndex
CREATE INDEX "PopularDomain_auditCount_idx" ON "PopularDomain"("auditCount");

-- CreateIndex
CREATE INDEX "PopularDomain_lastAuditAt_idx" ON "PopularDomain"("lastAuditAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");
