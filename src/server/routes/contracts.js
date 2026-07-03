/**
 * 合同管理 API
 * 公司业绩/合同 CRUD + 批量导入
 */
const express = require('express');
const router = express.Router();
const { supabaseAdmin, supabaseAdmin: supabaseWrite } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/contracts - 合同列表（公开）
router.get('/', async (req, res) => {
  try {
    const { industry, service_type, region, keyword, page = 1, pageSize = 20 } = req.query;

    let query = supabaseAdmin
      .from('company_contract')
      .select('*', { count: 'exact' })
      .order('end_date', { ascending: false });

    if (industry) query = query.eq('industry', industry);
    if (service_type) query = query.eq('service_type', service_type);
    if (region) query = query.eq('region', region);
    if (keyword) {
      query = query.or(`project_name.ilike.%${keyword}%,client_name.ilike.%${keyword}%,raw_text.ilike.%${keyword}%`);
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

// GET /api/contracts/:id - 合同详情（公开）
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('company_contract')
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

// POST /api/contracts - 新增合同（admin）
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const contract = req.body;

    // 必填字段验证
    if (!contract.project_name) {
      return res.status(400).json({ success: false, error: 'project_name is required' });
    }

    // 设置默认值
    contract.process_status = contract.process_status || 1; // 默认已完成
    contract.is_active = true;

    const { data, error } = await supabaseAdmin
      .from('company_contract')
      .insert(contract)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/contracts/:id - 更新合同（admin）
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    delete updates.id;
    delete updates.created_at;

    const { data, error } = await supabaseAdmin
      .from('company_contract')
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

// DELETE /api/contracts/:id - 删除合同（admin）
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('company_contract')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/contracts/import - 批量导入合同（admin）
// 请求体: JSONL 格式（每行一个 JSON 对象）
router.post('/import', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { contracts } = req.body;

    if (!Array.isArray(contracts) || contracts.length === 0) {
      return res.status(400).json({ success: false, error: 'contracts array is required' });
    }

    // 设置默认值
    const records = contracts.map(c => ({
      ...c,
      process_status: c.process_status || 1,
      is_active: true,
    }));

    const { data, error } = await supabaseAdmin
      .from('company_contract')
      .insert(records)
      .select('id');

    if (error) throw error;

    res.status(201).json({
      success: true,
      imported: (data || []).length,
      ids: (data || []).map(d => d.id),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
