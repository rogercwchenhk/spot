const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db');

// GET /api/dashboard/stats - 仪表盘统计数据
router.get('/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // 并行查询
    const [
      totalRes,
      todayRes,
      matchDistRes,
      recentRes,
      platformCountRes,
      qualCountRes,
    ] = await Promise.all([
      // 总标讯数
      supabaseAdmin.from('bidding_notice').select('id', { head: true, count: 'exact' }),

      // 今日新增
      supabaseAdmin
        .from('bidding_notice')
        .select('id', { head: true, count: 'exact' })
        .gte('created_at', today),

      // 匹配等级分布
      supabaseAdmin
        .from('match_result')
        .select('recommend_level'),

      // 最近 5 条标讯
      supabaseAdmin
        .from('bidding_notice')
        .select('id, title, budget_amount, city, publish_date, end_date, created_at')
        .order('created_at', { ascending: false })
        .limit(5),

      // 平台数
      supabaseAdmin.from('platform_source').select('id', { head: true, count: 'exact' }).eq('is_active', true),

      // 资质数
      supabaseAdmin.from('company_qualification').select('id', { head: true, count: 'exact' }),
    ]);

    // 汇总匹配分布
    const dist = { strong: 0, yes: 0, risky: 0, no: 0, unmatched: 0 };
    const totalMatched = (matchDistRes.data || []).length;
    for (const row of matchDistRes.data || []) {
      if (dist[row.recommend_level] !== undefined) {
        dist[row.recommend_level]++;
      }
    }

    // 计算总标讯数（无匹配的也算 unmatched）
    const totalNotices = totalRes.count || 0;
    dist.unmatched = Math.max(0, totalNotices - totalMatched);

    // 为最近标讯补充匹配结果
    const recentIds = (recentRes.data || []).map(n => n.id);
    let recentMatches = {};
    if (recentIds.length > 0) {
      const { data: mRows } = await supabaseAdmin
        .from('match_result')
        .select('notice_id, recommend_level, total_deduction')
        .in('notice_id', recentIds);
      for (const r of mRows || []) recentMatches[r.notice_id] = r;
    }

    res.json({
      success: true,
      data: {
        totalNotices,
        todayNew: todayRes.count || 0,
        matchDistribution: dist,
        totalMatched,
        matchRate: totalNotices > 0 ? Math.round((totalMatched / totalNotices) * 100) : 0,
        recentNotices: (recentRes.data || []).map(n => ({
          ...n,
          match_result: recentMatches[n.id] || null,
        })),
        platformCount: platformCountRes.count || 0,
        qualCount: qualCountRes.count || 0,
      },
    });
  } catch (err) {
    console.error('[dashboard] stats error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
