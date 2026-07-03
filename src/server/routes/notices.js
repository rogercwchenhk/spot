const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db');

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
    } = req.query;

    let query = supabaseAdmin
      .from('bidding_notice')
      .select('*, match_result(*)', { count: 'exact' })
      .order('publish_date', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (region_scope) query = query.eq('region_scope', region_scope);
    if (notice_type) query = query.eq('notice_type', notice_type);
    if (keyword) query = query.or(`title.ilike.%${keyword}%,notice_summary.ilike.%${keyword}%`);

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
