const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db');

// GET /api/dashboard/trend - 趋势数据（最近 30 天）
router.get('/trend', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 90);
    const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

    // 按天统计标讯入库数
    const { data: noticeRows } = await supabaseAdmin
      .from('bidding_notice')
      .select('created_at, city, region_scope, ai_extracted_fields, match_result(recommend_level)')
      .gte('created_at', startDate);

    // 按天聚合
    const dailyMap = {};
    for (const row of noticeRows || []) {
      const day = row.created_at.slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { date: day, total: 0, strong: 0, yes: 0, risky: 0, no: 0, matched: 0 };
      dailyMap[day].total++;
      const mr = Array.isArray(row.match_result) ? row.match_result[0] : row.match_result;
      if (mr) {
        dailyMap[day].matched++;
        if (dailyMap[day][mr.recommend_level] !== undefined) dailyMap[day][mr.recommend_level]++;
      }
    }

    // 补齐缺失日期
    const trend = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      trend.push(dailyMap[d] || { date: d, total: 0, strong: 0, yes: 0, risky: 0, no: 0, matched: 0 });
    }

    // 行业分布
    const industryMap = {};
    for (const row of noticeRows || []) {
      const ind = row.ai_extracted_fields?.industry_type || 'other';
      industryMap[ind] = (industryMap[ind] || 0) + 1;
    }
    const industryDist = Object.entries(industryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // 地区分布
    const regionMap = {};
    for (const row of noticeRows || []) {
      const r = row.city || row.region_scope || '未知';
      regionMap[r] = (regionMap[r] || 0) + 1;
    }
    const regionDist = Object.entries(regionMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    res.json({
      success: true,
      data: { trend, industryDist, regionDist },
    });
  } catch (err) {
    console.error('[dashboard] trend error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
