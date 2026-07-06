const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /api/notices - 标讯列表
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      recommend_level,
      region_scope,
      notice_type,
      keyword,
      start_date,
      doc_access_type,
      notice_status,
    } = req.query;

    // 如果按推荐等级筛选，先从 match_result 表查出符合条件的 notice_id
    let noticeIds = null;
    if (recommend_level) {
      const { data: matches, error: matchErr } = await supabaseAdmin
        .from('match_result')
        .select('notice_id')
        .eq('recommend_level', recommend_level);
      if (matchErr) throw matchErr;
      noticeIds = (matches || []).map(m => m.notice_id);
      // 没有任何匹配结果，直接返回空
      if (noticeIds.length === 0) {
        return res.json({ success: true, data: [], total: 0, page: Number(page), pageSize: Number(pageSize) });
      }
    }

    let query = supabaseAdmin
      .from('bidding_notice')
      .select('*, match_result(*)', { count: 'exact' })
      .order('publish_date', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (noticeIds) query = query.in('id', noticeIds);
    if (region_scope) query = query.eq('region_scope', region_scope);
    if (notice_type) query = query.eq('notice_type', notice_type);
    if (keyword) query = query.or(`title.ilike.%${keyword}%,notice_summary.ilike.%${keyword}%`);
    if (start_date) query = query.gte('publish_date', start_date);
    if (doc_access_type) query = query.eq('doc_access_type', doc_access_type);
    if (notice_status) query = query.eq('notice_status', notice_status);

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

// PATCH /api/notices/:id/status - 更新标讯状态（销售标注 B5）
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const { notice_status } = req.body;
    const validStatuses = ['new', 'following', 'ignored', 'bidding', 'won', 'lost'];

    if (!notice_status || !validStatuses.includes(notice_status)) {
      return res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const { data, error } = await supabaseAdmin
      .from('bidding_notice')
      .update({ notice_status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('id, notice_status')
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Notice not found' });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/notices/:id - 标讯详情
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('bidding_notice')
      .select('*, match_result(*), notice_tag(*)')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Not found' });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
