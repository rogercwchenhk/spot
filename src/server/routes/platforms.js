/**
 * 平台管理 API
 * 招标平台 CRUD
 */
const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/platforms - 平台列表（公开）
router.get('/', async (req, res) => {
  try {
    const { type, active, keyword, page = 1, pageSize = 50 } = req.query;

    let query = supabaseAdmin
      .from('platform_source')
      .select('*', { count: 'exact' })
      .order('id', { ascending: true });

    if (type) query = query.eq('platform_type', type);
    if (active === 'true') query = query.eq('is_active', true);
    if (keyword) {
      query = query.or(`platform_name.ilike.%${keyword}%,base_url.ilike.%${keyword}%`);
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

// GET /api/platforms/:id - 平台详情（公开）
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('platform_source')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Not found' });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/platforms - 新增平台（admin）
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { platform_name, base_url, list_url, platform_type, anti_bot_level, waf_provider } = req.body;

    if (!platform_name || !base_url || !platform_type) {
      return res.status(400).json({ success: false, error: 'platform_name, base_url and platform_type are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('platform_source')
      .insert({
        platform_name,
        base_url,
        list_url: list_url || base_url,
        platform_type,
        rendering_type: 'static',
        anti_bot_level: anti_bot_level || 'none',
        waf_provider: waf_provider || 'none',
        auth_required: false,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/platforms/:id - 更新平台（admin）
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    delete updates.id;
    delete updates.created_at;

    const { data, error } = await supabaseAdmin
      .from('platform_source')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Not found' });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/platforms/:id - 删除平台（admin）
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('platform_source')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
