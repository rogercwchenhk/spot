/**
 * cr admin person:* - 人员资质管理
 */
const { apiRequest } = require('../../lib/auth');
const { output, success, error } = require('../../lib/output');

async function list(options = {}) {
  try {
    const params = new URLSearchParams();
    if (options.type) params.set('type', options.type);

    const result = await apiRequest(`/api/qualifications/personnel?${params.toString()}`);
    
    if (!result.success) {
      error(result.error || '获取人员资质失败');
      return;
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    const quals = result.data.map(q => ({
      ID: q.id,
      姓名: q.person_name,
      类型: q.qual_type,
      证书: q.qual_name,
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
    const result = await apiRequest('/api/qualifications/personnel', {
      method: 'POST',
      body: JSON.stringify({
        person_name: options.name,
        qual_type: options.type,
        qual_name: options.cert,
        cert_number: options.certno,
        expiry_date: options.expiry,
      }),
    });

    if (!result.success) {
      error(result.error || '新增人员资质失败');
      return;
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    success(`新增成功: ${result.data.person_name} - ${result.data.qual_name} (ID: ${result.data.id})`);
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

async function update(id, options) {
  try {
    const updates = {};
    if (options.name) updates.person_name = options.name;
    if (options.expiry) updates.expiry_date = options.expiry;
    if (options.active !== undefined) updates.is_active = options.active === 'true';

    const result = await apiRequest(`/api/qualifications/personnel/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    if (!result.success) {
      error(result.error || '更新人员资质失败');
      return;
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    success(`更新成功: ${result.data.person_name} - ${result.data.qual_name}`);
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

async function remove(id) {
  try {
    const result = await apiRequest(`/api/qualifications/personnel/${id}`, {
      method: 'DELETE',
    });

    if (!result.success) {
      error(result.error || '删除人员资质失败');
      return;
    }

    success('删除成功');
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

module.exports = { list, add, update, remove };
