/**
 * 系统配置 API
 * 推送时间、Webhook 地址等运行时配置
 */
const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/config - 获取全部配置（需登录）
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('system_config')
      .select('key, value, description, updated_at')
      .order('key');

    if (error) throw error;

    // 转为 key-value 对象
    const config = {};
    for (const row of data || []) {
      config[row.key] = {
        value: row.value,
        description: row.description,
        updated_at: row.updated_at,
      };
    }

    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/config/:key - 获取单个配置
router.get('/:key', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('system_config')
      .select('key, value, description, updated_at')
      .eq('key', req.params.key)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Config key not found' });
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/config/:key - 更新配置（admin）
router.put('/:key', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { value, description } = req.body;

    if (value === undefined) {
      return res.status(400).json({ success: false, error: 'value is required' });
    }

    const updates = {
      value: JSON.stringify(value),
      updated_at: new Date().toISOString(),
    };
    if (description !== undefined) updates.description = description;

    const { data, error } = await supabaseAdmin
      .from('system_config')
      .update(updates)
      .eq('key', req.params.key)
      .select('key, value, description, updated_at')
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ success: false, error: 'Config key not found' });
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/config - 新增配置项（admin）
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { key, value, description } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({ success: false, error: 'key and value are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('system_config')
      .insert({
        key,
        value: JSON.stringify(value),
        description: description || null,
      })
      .select('key, value, description, updated_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ success: false, error: 'Config key already exists' });
      }
      throw error;
    }

    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/config/:key - 删除配置项（admin）
router.delete('/:key', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('system_config')
      .delete()
      .eq('key', req.params.key);

    if (error) throw error;

    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
