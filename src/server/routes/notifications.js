const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db');
const { requireAuth } = require('../middleware/auth');

// All notification routes require authentication
router.use(requireAuth);

// GET /api/notifications - 通知列表
router.get('/', async (req, res) => {
  try {
    const { unread, page = 1, pageSize = 20 } = req.query;

    let query = supabaseAdmin
      .from('notification')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (unread === 'true') query = query.eq('is_read', false);

    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    // 未读数
    const { count: unreadCount } = await supabaseAdmin
      .from('notification')
      .select('id', { head: true, count: 'exact' })
      .eq('is_read', false);

    res.json({
      success: true,
      data: data || [],
      total: count || 0,
      unreadCount: unreadCount || 0,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/notifications/:id/read - 标记已读
router.put('/:id/read', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('notification')
      .update({ is_read: true })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/notifications/read-all - 全部已读
router.put('/read-all', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('notification')
      .update({ is_read: true })
      .eq('is_read', false);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/notifications - 创建通知（admin/内部调用）
router.post('/', async (req, res) => {
  try {
    const { type, title, body, link } = req.body;
    if (!type || !title) return res.status(400).json({ success: false, error: 'type and title are required' });

    const { data, error } = await supabaseAdmin
      .from('notification')
      .insert({ type, title, body, link })
      .select()
      .single();
    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
