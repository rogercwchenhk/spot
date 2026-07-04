/**
 * 匹配结果公开 API
 * viewer 可读，admin 可触发重新计算
 */
const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/match - 匹配结果列表（公开）
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      recommend_level,
      min_score,
      max_score,
    } = req.query;

    let query = supabaseAdmin
      .from('match_result')
      .select('*, bidding_notice (id, title, budget_amount, city, region_scope, publish_date, end_date, industry_type)', { count: 'exact' })
      .order('calculated_at', { ascending: false });

    if (recommend_level) {
      query = query.eq('recommend_level', recommend_level);
    }
    if (min_score) {
      // total_deduction = 100 - score, so min_score => max total_deduction
      query = query.lte('total_deduction', 100 - Number(min_score));
    }
    if (max_score) {
      query = query.gte('total_deduction', 100 - Number(max_score));
    }

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

// GET /api/match/summary - 匹配统计摘要（公开）
router.get('/summary', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('match_result')
      .select('recommend_level');

    if (error) throw error;

    const summary = { strong: 0, yes: 0, risky: 0, no: 0 };
    for (const row of data || []) {
      if (summary[row.recommend_level] !== undefined) {
        summary[row.recommend_level]++;
      }
    }

    res.json({
      success: true,
      data: {
        ...summary,
        total: (data || []).length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/match/:noticeId - 单条标讯的匹配详情（公开）
router.get('/:noticeId', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('match_result')
      .select('*, bidding_notice (id, title, budget_amount, city, region_scope, publish_date, end_date, tenderee, source_url, ai_extracted_fields)')
      .eq('notice_id', req.params.noticeId)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ success: false, error: 'Match result not found' });
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
