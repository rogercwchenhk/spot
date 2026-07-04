-- ============================================================
-- 021_keyword_evolution.sql
-- 关键词自进化 Phase 1：溯源字段 + 统计视图
-- ============================================================

-- 1. 添加关键词来源字段
ALTER TABLE bidding_notice
  ADD COLUMN IF NOT EXISTS keyword_source VARCHAR(100);

COMMENT ON COLUMN bidding_notice.keyword_source IS '采集时命中的关键词分组名称（如：核心设备运维/驻场服务/行业特有），用于关键词效果统计';

-- 2. 索引：按来源分组统计
CREATE INDEX IF NOT EXISTS idx_notice_keyword_source
  ON bidding_notice (keyword_source);

-- 3. 关键词效果统计视图
CREATE OR REPLACE VIEW v_keyword_effectiveness AS
SELECT
  bn.keyword_source,
  COUNT(*) AS total_notices,
  COUNT(mr.id) AS matched_count,
  COUNT(*) FILTER (WHERE mr.recommend_level = 'strong') AS strong_count,
  COUNT(*) FILTER (WHERE mr.recommend_level = 'yes') AS yes_count,
  COUNT(*) FILTER (WHERE mr.recommend_level = 'risky') AS risky_count,
  COUNT(*) FILTER (WHERE mr.recommend_level = 'no') AS no_count,
  COUNT(*) FILTER (WHERE mr.recommend_level IS NULL) AS unmatched_count,
  ROUND(
    COUNT(*) FILTER (WHERE mr.recommend_level IN ('strong', 'yes'))::numeric
    / NULLIF(COUNT(mr.id), 0) * 100, 1
  ) AS effective_rate,
  MIN(bn.publish_date) AS first_seen,
  MAX(bn.publish_date) AS last_seen
FROM bidding_notice bn
LEFT JOIN match_result mr ON mr.notice_id = bn.id
WHERE bn.keyword_source IS NOT NULL
GROUP BY bn.keyword_source
ORDER BY effective_rate DESC NULLS LAST;

COMMENT ON VIEW v_keyword_effectiveness IS '关键词分组效果统计：按来源分组统计标讯数量和匹配质量';

-- 4. 按日期的趋势视图（观察各分组每周产出）
CREATE OR REPLACE VIEW v_keyword_weekly_trend AS
SELECT
  bn.keyword_source,
  DATE_TRUNC('week', bn.publish_date::date) AS week_start,
  COUNT(*) AS notices,
  COUNT(*) FILTER (WHERE mr.recommend_level IN ('strong', 'yes')) AS effective
FROM bidding_notice bn
LEFT JOIN match_result mr ON mr.notice_id = bn.id
WHERE bn.keyword_source IS NOT NULL
GROUP BY bn.keyword_source, DATE_TRUNC('week', bn.publish_date::date)
ORDER BY week_start DESC, bn.keyword_source;
