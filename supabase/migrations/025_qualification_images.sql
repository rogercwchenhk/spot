-- ============================================================
-- 025_qualification_images.sql
-- 资质证书图片表
-- ============================================================

CREATE TABLE qualification_images (
  id              SERIAL PRIMARY KEY,
  qual_type       VARCHAR(20) NOT NULL CHECK (qual_type IN ('company', 'personnel')),
  qual_id         INTEGER NOT NULL,
  image_name      VARCHAR(255) NOT NULL,    -- 原始文件名
  image_url       TEXT NOT NULL,             -- Storage URL
  storage_path    TEXT NOT NULL,             -- Storage 路径
  file_size       BIGINT,                    -- 文件大小(字节)
  mime_type       VARCHAR(50),               -- MIME类型
  width           INTEGER,                   -- 图片宽度
  height          INTEGER,                   -- 图片高度
  is_primary      BOOLEAN DEFAULT FALSE,     -- 是否主图(标书默认使用)
  sort_order      INTEGER DEFAULT 0,         -- 排序顺序
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE qualification_images IS '资质证书图片表';
COMMENT ON COLUMN qualification_images.qual_type IS '资质类型: company=公司资质, personnel=人员资质';
COMMENT ON COLUMN qualification_images.qual_id IS '关联资质ID';
COMMENT ON COLUMN qualification_images.is_primary IS '是否主图(标书默认使用)';
COMMENT ON COLUMN qualification_images.storage_path IS 'Supabase Storage 路径';

-- 索引
CREATE INDEX idx_qual_images_qual ON qualification_images (qual_type, qual_id);
CREATE INDEX idx_qual_images_primary ON qualification_images (qual_type, qual_id, is_primary);

-- 自动更新 updated_at
CREATE TRIGGER trg_qualification_images_updated
  BEFORE UPDATE ON qualification_images
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE qualification_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON qualification_images
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "authenticated_read" ON qualification_images
  FOR SELECT USING (auth.role() = 'authenticated');
