-- 기간 필터만 있는 대시보드 집계(운영자 전체)가 인덱스를 타도록
CREATE INDEX "events_formId_createdAt_idx" ON "events"("formId", "createdAt");
