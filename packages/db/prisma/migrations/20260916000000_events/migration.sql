-- 퍼널 이벤트 테이블 도입. 기존 visits 는 VIEW 이벤트로, submissions 는 SUBMIT_SUCCESS 이벤트로 이관 후 visits 삭제.

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('VIEW', 'FORM_VIEW', 'FORM_START', 'SUBMIT_ATTEMPT', 'SUBMIT_ERROR', 'SUBMIT_SUCCESS');

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "linkId" TEXT,
    "visitorId" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "meta" JSONB,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "events_formId_type_createdAt_idx" ON "events"("formId", "type", "createdAt");
CREATE INDEX "events_formId_visitorId_idx" ON "events"("formId", "visitorId");
CREATE INDEX "events_visitorId_createdAt_idx" ON "events"("visitorId", "createdAt");
CREATE INDEX "events_linkId_idx" ON "events"("linkId");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_formId_fkey" FOREIGN KEY ("formId") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "distribution_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DataMigration: visits → VIEW
INSERT INTO "events" ("id", "formId", "linkId", "visitorId", "type", "ipHash", "userAgent", "createdAt")
SELECT "id", "formId", "linkId", "visitorId", 'VIEW', "ipHash", "userAgent", "createdAt" FROM "visits";

-- DataMigration: submissions(visitorId 있는 것) → SUBMIT_SUCCESS
INSERT INTO "events" ("id", "formId", "linkId", "visitorId", "type", "meta", "ipHash", "createdAt")
SELECT gen_random_uuid()::text, "formId", "linkId", "visitorId", 'SUBMIT_SUCCESS', jsonb_build_object('submissionId', "id"), "ipHash", "createdAt"
FROM "submissions" WHERE "visitorId" IS NOT NULL;

-- DropTable
ALTER TABLE "visits" DROP CONSTRAINT "visits_formId_fkey";
ALTER TABLE "visits" DROP CONSTRAINT "visits_linkId_fkey";
DROP TABLE "visits";
