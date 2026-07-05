/**
 * 采集管理 API
 * 手动触发采集、查看 crawl_run 记录、切换数据源模式
 */
const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { clearCache } = require('./config-reader');
const ingestion = require('../services/ingestion');
const scrapling = require('../services/scrapling-client');

// POST /api/crawl/run — 手动触发采集
router.post('/run', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { mode, platform_id, keyword_group } = req.body;

    // 如果指定了单个平台，只爬该平台
    if (platform_id) {
      const { data: platform, error } = await supabaseAdmin
        .from('platform_source')
        .select('*')
        .eq('id', platform_id)
        .single();

      if (error || !platform) {
        return res.status(404).json({ success: false, error: 'Platform not found' });
      }

      if (!platform.extraction_selectors) {
        return res.status(400).json({
          success: false,
          error: 'Platform has no extraction_selectors configured',
        });
      }

      const result = await ingestion.fetchViaScrapling(platform, {
        triggerType: 'manual',
        keywordGroup: keyword_group,
      });

      return res.json({ success: true, data: result });
    }

    // 全量采集
    const result = await ingestion.runFullIngestion();
    res.json({ success: true, data: { inserted: result } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/crawl/scrapling — 仅 Scrapling 采集
router.post('/scrapling', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { platform_id, platform_type, region_scope } = req.body;

    if (platform_id) {
      const { data: platform, error } = await supabaseAdmin
        .from('platform_source')
        .select('*')
        .eq('id', platform_id)
        .single();

      if (error || !platform) {
        return res.status(404).json({ success: false, error: 'Platform not found' });
      }

      const result = await ingestion.fetchViaScrapling(platform, { triggerType: 'api' });
      return res.json({ success: true, data: result });
    }

    const result = await ingestion.fetchAllScrapling({
      triggerType: 'api',
      platformType: platform_type,
      regionScope: region_scope,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/crawl/runs — 查看采集记录
router.get('/runs', requireAuth, async (req, res) => {
  try {
    const { platform_id, data_source, status, page = 1, pageSize = 20 } = req.query;

    let query = supabaseAdmin
      .from('crawl_run')
      .select('*, platform_source(platform_name)', { count: 'exact' })
      .order('started_at', { ascending: false });

    if (platform_id) query = query.eq('platform_id', platform_id);
    if (data_source) query = query.eq('data_source', data_source);
    if (status) query = query.eq('status', status);

    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      total: count || 0,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/crawl/runs/:id — 单条采集记录详情
router.get('/runs/:id', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('crawl_run')
      .select('*, platform_source(platform_name, base_url)')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Not found' });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/crawl/stats — 采集统计概览
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const days = Number(req.query.days) || 7;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    // 按数据源统计
    const { data: bySource } = await supabaseAdmin
      .from('crawl_run')
      .select('data_source, status, pages_crawled, items_found, items_inserted, duration_ms')
      .gte('started_at', since);

    const stats = { zhiliao: { runs: 0, inserted: 0, pages: 0 }, scrapling: { runs: 0, inserted: 0, pages: 0 } };
    for (const run of bySource || []) {
      const s = stats[run.data_source] || (stats[run.data_source] = { runs: 0, inserted: 0, pages: 0 });
      s.runs++;
      s.inserted += run.items_inserted || 0;
      s.pages += run.pages_crawled || 0;
    }

    // 总公告数
    const { count: totalNotices } = await supabaseAdmin
      .from('bidding_notice')
      .select('*', { count: 'exact', head: true });

    // 按数据源的公告数
    const { count: zhiliaoCount } = await supabaseAdmin
      .from('bidding_notice')
      .select('*', { count: 'exact', head: true })
      .eq('data_source', 'zhiliao_api');

    const { count: scraplingCount } = await supabaseAdmin
      .from('bidding_notice')
      .select('*', { count: 'exact', head: true })
      .eq('data_source', 'scrapling');

    res.json({
      success: true,
      data: {
        period_days: days,
        total_notices: totalNotices || 0,
        by_source: {
          zhiliao: { ...stats.zhiliao, notices: zhiliaoCount || 0 },
          scrapling: { ...stats.scrapling, notices: scraplingCount || 0 },
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/crawl/config — 更新数据源配置
router.put('/config', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { mode, scrapling_enabled, zhiliao_enabled, concurrency, daily_limit, delay_ms } = req.body;
    const updates = [];

    if (mode) {
      if (!['external', 'internal', 'hybrid'].includes(mode)) {
        return res.status(400).json({ success: false, error: 'Invalid mode' });
      }
      updates.push({ key: 'datasource.mode', value: JSON.stringify(mode) });
    }
    if (scrapling_enabled !== undefined) {
      updates.push({ key: 'datasource.scrapling.enabled', value: JSON.stringify(scrapling_enabled) });
    }
    if (zhiliao_enabled !== undefined) {
      updates.push({ key: 'datasource.zhiliao.enabled', value: JSON.stringify(zhiliao_enabled) });
    }
    if (concurrency !== undefined) {
      updates.push({ key: 'datasource.scrapling.concurrency', value: JSON.stringify(concurrency) });
    }
    if (daily_limit !== undefined) {
      updates.push({ key: 'datasource.scrapling.daily_limit', value: JSON.stringify(daily_limit) });
    }
    if (delay_ms !== undefined) {
      updates.push({ key: 'datasource.scrapling.delay_ms', value: JSON.stringify(delay_ms) });
    }

    for (const update of updates) {
      const { error } = await supabaseAdmin
        .from('system_config')
        .update({ value: update.value })
        .eq('key', update.key);
      if (error) throw error;
    }

    clearCache();
    res.json({ success: true, message: `Updated ${updates.length} config(s)` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/crawl/platforms/ready — 查看已配置选择器的平台
router.get('/platforms/ready', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('platform_source')
      .select('id, platform_name, base_url, platform_type, spider_strategy, rendering_type, region_scope, anti_bot_level, extraction_selectors IS NOT NULL as has_selectors, pagination_config IS NOT NULL as has_pagination')
      .eq('is_active', true)
      .order('id');

    if (error) throw error;

    const ready = (data || []).map(p => ({
      ...p,
      ready: p.has_selectors,
    }));

    res.json({
      success: true,
      data: ready,
      summary: {
        total: ready.length,
        ready: ready.filter(p => p.ready).length,
        pending: ready.filter(p => !p.ready).length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/crawl/detail/:id — 爬取千里马详情页
router.post('/detail/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { crawlDetail, updateNoticeDetail } = require('../services/qianlima-detail');

    // 获取标讯信息
    const { data: notice, error } = await supabaseAdmin
      .from('bidding_notice')
      .select('id, source_url, title')
      .eq('id', id)
      .single();

    if (error || !notice) {
      return res.status(404).json({ success: false, error: 'Notice not found' });
    }

    if (!notice.source_url || !notice.source_url.includes('qianlima.com')) {
      return res.status(400).json({ success: false, error: 'Not a qianlima notice' });
    }

    console.log();
    const detail = await crawlDetail(notice.source_url);

    if (detail.status === 'success') {
      await updateNoticeDetail(id, detail);
    }

    res.json({ success: true, data: detail });
  } catch (err) {
    console.error('[crawl] Detail error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/crawl/detail-batch — 批量爬取千里马详情页
router.post('/detail-batch', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { limit = 5, delay = 30 } = req.body;
    const { crawlDetailBatch, getQianlimaNoticesNeedingDetail, updateNoticeDetail } = require('../services/qianlima-detail');

    const notices = await getQianlimaNoticesNeedingDetail(limit);
    if (notices.length === 0) {
      return res.json({ success: true, data: { processed: 0, message: 'No notices need detail crawling' } });
    }

    console.log();
    const urls = notices.map(n => n.source_url);
    const results = await crawlDetailBatch(urls, delay);

    // 更新数据库
    let updated = 0;
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'success') {
        await updateNoticeDetail(notices[i].id, results[i]);
        updated++;
      }
    }

    res.json({
      success: true,
      data: {
        processed: notices.length,
        updated,
        results,
      },
    });
  } catch (err) {
    console.error('[crawl] Batch detail error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
