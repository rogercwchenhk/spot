-- ============================================================
-- 011_fix_rls_anon_read.sql
-- RLS 策略调整：公开数据允许 anon 读取，敏感数据保持认证
-- ============================================================

-- 公开读取（anon 可读）：标讯、标签、匹配结果、平台、资质参考库
DROP POLICY IF EXISTS "authenticated_read" ON bidding_notice;
CREATE POLICY "public_read" ON bidding_notice FOR SELECT USING (true);

DROP POLICY IF EXISTS "authenticated_read" ON notice_tag;
CREATE POLICY "public_read" ON notice_tag FOR SELECT USING (true);

DROP POLICY IF EXISTS "authenticated_read" ON match_result;
CREATE POLICY "public_read" ON match_result FOR SELECT USING (true);

DROP POLICY IF EXISTS "authenticated_read" ON platform_source;
CREATE POLICY "public_read" ON platform_source FOR SELECT USING (true);

DROP POLICY IF EXISTS "authenticated_read" ON qualification_reference;
CREATE POLICY "public_read" ON qualification_reference FOR SELECT USING (true);

-- 保持认证（仅登录用户可读）：公司资质、人员资质、内部配置
-- company_qualification, personnel_qualification, notice_embedding, platform_prompt_history
-- 这些表的 authenticated_read 策略不变

