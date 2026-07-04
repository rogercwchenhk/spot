-- ============================================================
-- 013_doc_access_type.sql
-- 招标文件获取方式标记
-- ============================================================

ALTER TABLE bidding_notice
  ADD COLUMN IF NOT EXISTS doc_access_type VARCHAR(30) DEFAULT 'unknown'
    CHECK (doc_access_type IN ('unknown', 'free', 'paid', 'registration_required'));

COMMENT ON COLUMN bidding_notice.doc_access_type IS '招标文件获取方式: unknown(未检查) / free(免费下载) / paid(收费) / registration_required(需报名)';

CREATE INDEX IF NOT EXISTS idx_notice_doc_access ON bidding_notice (doc_access_type);
