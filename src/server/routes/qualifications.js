/**
 * 资质管理 API
 * 公司资质 + 人员资质 CRUD
 */
const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ============================================================
// 公司资质
// ============================================================

// GET /api/qualifications/company - 公司资质列表（公开）
router.get('/company', async (req, res) => {
  try {
    const { type, active, keyword, page = 1, pageSize = 50 } = req.query;

    let query = supabaseAdmin
      .from('company_qualification')
      .select('*', { count: 'exact' })
      .order('id', { ascending: true });

    if (type) query = query.eq('qual_type', type);
    if (active === 'true') query = query.eq('is_active', true);
    if (keyword) {
      query = query.or(`qual_name.ilike.%${keyword}%,cert_number.ilike.%${keyword}%`);
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

// POST /api/qualifications/company - 新增公司资质（admin）
router.post('/company', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { qual_type, qual_name, qual_level, cert_number, issue_date, expiry_date, issuing_body, scope } = req.body;

    if (!qual_type || !qual_name) {
      return res.status(400).json({ success: false, error: 'qual_type and qual_name are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('company_qualification')
      .insert({
        qual_type,
        qual_name,
        qual_level,
        cert_number,
        issue_date,
        expiry_date,
        issuing_body,
        scope,
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

// PUT /api/qualifications/company/:id - 更新公司资质（admin）
router.put('/company/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // 移除不允许更新的字段
    delete updates.id;
    delete updates.created_at;

    const { data, error } = await supabaseAdmin
      .from('company_qualification')
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

// DELETE /api/qualifications/company/:id - 删除公司资质（admin）
router.delete('/company/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('company_qualification')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// 人员资质
// ============================================================

// GET /api/qualifications/personnel - 人员资质列表（公开）
router.get('/personnel', async (req, res) => {
  try {
    const { type, active, keyword, page = 1, pageSize = 50 } = req.query;

    let query = supabaseAdmin
      .from('personnel_qualification')
      .select('*', { count: 'exact' })
      .order('id', { ascending: true });

    if (type) query = query.eq('qual_type', type);
    if (active === 'true') query = query.eq('is_active', true);
    if (keyword) {
      query = query.or(`person_name.ilike.%${keyword}%,qual_name.ilike.%${keyword}%,cert_number.ilike.%${keyword}%`);
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

// POST /api/qualifications/personnel - 新增人员资质（admin）
router.post('/personnel', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { person_name, qual_type, qual_name, cert_number, issue_date, expiry_date } = req.body;

    if (!person_name || !qual_type || !qual_name) {
      return res.status(400).json({ success: false, error: 'person_name, qual_type and qual_name are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('personnel_qualification')
      .insert({
        person_name,
        qual_type,
        qual_name,
        cert_number,
        issue_date,
        expiry_date,
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

// PUT /api/qualifications/personnel/:id - 更新人员资质（admin）
router.put('/personnel/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    delete updates.id;
    delete updates.created_at;

    const { data, error } = await supabaseAdmin
      .from('personnel_qualification')
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

// DELETE /api/qualifications/personnel/:id - 删除人员资质（admin）
router.delete('/personnel/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('personnel_qualification')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
