-- ============================================================
-- 019_bid_document.sql
-- 招标文件存储表 + Supabase Storage 配置
-- ============================================================

-- === 招标文件存储表 ===
CREATE TABLE bid_document (
  id              BIGSERIAL PRIMARY KEY,
  notice_id       BIGINT NOT NULL REFERENCES bidding_notice(id) ON DELETE CASCADE,
  file_name       VARCHAR(255) NOT NULL,        -- 原始文件名
  file_type       VARCHAR(20) NOT NULL,          -- pdf / doc / docx
  file_size       BIGINT,                        -- 字节数
  storage_path    VARCHAR(500) NOT NULL,         -- Supabase Storage 路径 (bid-documents bucket)
  source_download_url TEXT,                      -- 原站原始下载链接
  download_status VARCHAR(20) DEFAULT 'pending'
    CHECK (download_status IN ('pending', 'downloading', 'completed', 'failed')),
  error_message   TEXT,                          -- 下载/解析失败原因
  downloaded_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  bid_document IS '招标文件存储表（PDF/Word），文件存 Supabase Storage，本表存元数据';
COMMENT ON COLUMN bid_document.storage_path IS 'Supabase Storage 路径，格式: {notice_id}/{file_name}';
COMMENT ON COLUMN bid_document.download_status IS '下载状态: pending(待下载)/downloading(下载中)/completed(已完成)/failed(失败)';
COMMENT ON COLUMN bid_document.source_download_url IS '原发布网站的原始下载链接（非知了中转页）';

-- 索引
CREATE INDEX idx_bid_doc_notice ON bid_document (notice_id);
CREATE INDEX idx_bid_doc_status ON bid_document (download_status);

-- 自动更新 updated_at
CREATE TRIGGER trg_bid_document_updated
  BEFORE UPDATE ON bid_document
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE bid_document ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON bid_document
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "authenticated_read" ON bid_document
  FOR SELECT USING (auth.role() = 'authenticated');
