/**
 * cr admin qual:* - 公司资质管理
 */
const { apiRequest } = require('../../lib/auth');
const { output, success, error } = require('../../lib/output');

async function list(options = {}) {
  try {
    const params = new URLSearchParams();
    if (options.type) params.set('type', options.type);

    const result = await apiRequest(`/api/qualifications/company?${params.toString()}`);
    
    if (!result.success) {
      error(result.error || '获取资质列表失败');
      return;
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    const quals = result.data.map(q => ({
      ID: q.id,
      类型: q.qual_type,
      名称: q.qual_name,
      等级: q.qual_level || '-',
      编号: q.cert_number || '-',
      到期: q.expiry_date || '-',
    }));

    output(quals, { total: result.total });
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

async function add(options) {
  try {
    const result = await apiRequest('/api/qualifications/company', {
      method: 'POST',
      body: JSON.stringify({
        qual_type: options.type,
        qual_name: options.name,
        qual_level: options.level,
        cert_number: options.cert,
        expiry_date: options.expiry,
      }),
    });

    if (!result.success) {
      error(result.error || '新增资质失败');
      return;
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    success(`新增成功: ${result.data.qual_name} (ID: ${result.data.id})`);
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

async function update(id, options) {
  try {
    const updates = {};
    if (options.name) updates.qual_name = options.name;
    if (options.level) updates.qual_level = options.level;
    if (options.cert) updates.cert_number = options.cert;
    if (options.expiry) updates.expiry_date = options.expiry;
    if (options.active !== undefined) updates.is_active = options.active === 'true';

    const result = await apiRequest(`/api/qualifications/company/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    if (!result.success) {
      error(result.error || '更新资质失败');
      return;
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    success(`更新成功: ${result.data.qual_name}`);
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

async function remove(id) {
  try {
    const result = await apiRequest(`/api/qualifications/company/${id}`, {
      method: 'DELETE',
    });

    if (!result.success) {
      error(result.error || '删除资质失败');
      return;
    }

    success('删除成功');
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

module.exports = { list, add, update, remove };
