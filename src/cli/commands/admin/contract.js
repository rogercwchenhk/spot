/**
 * cr admin contract:* - 合同管理
 */
const fs = require('fs');
const { apiRequest } = require('../../lib/auth');
const { output, success, error } = require('../../lib/output');

async function list(options = {}) {
  try {
    const params = new URLSearchParams();
    if (options.industry) params.set('industry', options.industry);
    if (options.type) params.set('service_type', options.type);

    const result = await apiRequest(`/api/contracts?${params.toString()}`);
    
    if (!result.success) {
      error(result.error || '获取合同列表失败');
      return;
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    const contracts = result.data.map(c => ({
      ID: c.id,
      项目: c.project_name?.substring(0, 30) + (c.project_name?.length > 30 ? '...' : ''),
      甲方: c.client_name || '-',
      类型: c.service_type || '-',
      行业: c.industry || '-',
      金额: c.contract_amount ? `¥${(c.contract_amount / 10000).toFixed(0)}万` : '-',
    }));

    output(contracts, { total: result.total });
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

async function add(options) {
  try {
    let contractData;
    
    if (options.jsonFile) {
      // 从文件读取
      const content = fs.readFileSync(options.jsonFile, 'utf8');
      contractData = JSON.parse(content);
    } else {
      error('请提供 --json-file 参数');
      return;
    }

    const result = await apiRequest('/api/contracts', {
      method: 'POST',
      body: JSON.stringify(contractData),
    });

    if (!result.success) {
      error(result.error || '新增合同失败');
      return;
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    success(`新增成功: ${result.data.project_name} (ID: ${result.data.id})`);
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

async function importFile(options) {
  try {
    const content = fs.readFileSync(options.file, 'utf8');
    const lines = content.trim().split('\n');
    const contracts = lines.map(line => JSON.parse(line));

    const result = await apiRequest('/api/contracts/import', {
      method: 'POST',
      body: JSON.stringify({ contracts }),
    });

    if (!result.success) {
      error(result.error || '批量导入失败');
      return;
    }

    if (options.json) {
      output(result, { json: true });
      return;
    }

    success(`批量导入成功: ${result.imported} 条`);
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

async function update(id, options) {
  try {
    const updates = {};
    if (options.project) updates.project_name = options.project;
    if (options.amount) updates.contract_amount = parseFloat(options.amount);

    const result = await apiRequest(`/api/contracts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    if (!result.success) {
      error(result.error || '更新合同失败');
      return;
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    success(`更新成功: ${result.data.project_name}`);
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

async function remove(id) {
  try {
    const result = await apiRequest(`/api/contracts/${id}`, {
      method: 'DELETE',
    });

    if (!result.success) {
      error(result.error || '删除合同失败');
      return;
    }

    success('删除成功');
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

module.exports = { list, add, importFile, update, remove };
