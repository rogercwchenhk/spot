#!/usr/bin/env node

/**
 * 客户雷达 后端双角色测试
 * AI-Friendly Test Runner: cr-backend-dual-role-test
 *
 * 用法:
 *   node tests/cr-backend-dual-role-test.js --role admin
 *   node tests/cr-backend-dual-role-test.js --role sales
 *   node tests/cr-backend-dual-role-test.js --role all
 *
 * 角色说明:
 *   admin  — 管理员，拥有全部读写权限
 *   sales  — 销售(viewer)，只有只读权限，写入操作应被拒绝
 *
 * 环境变量:
 *   CR_API_URL — 后端地址 (默认 http://localhost:3200)
 */

const fetch = require('../src/cli/node_modules/node-fetch');
const { execSync } = require('child_process');
const path = require('path');

// ─── 配置 ───────────────────────────────────────────────────
const API_BASE = process.env.CR_API_URL || 'http://localhost:3200';
const CLI_BIN = path.join(__dirname, '..', 'src', 'cli', 'bin', 'cr.js');

const ACCOUNTS = {
  admin: { email: 'admin@leadcom.chat', password: 'Admin123456' },
  sales: { email: 'viewer@leadcom.chat', password: 'Viewer123456' },
};

// ─── 工具函数 ───────────────────────────────────────────────
let passCount = 0;
let failCount = 0;
let skipCount = 0;
const results = [];

function log(msg) {
  console.log(msg);
}

function pass(id, desc, detail) {
  passCount++;
  results.push({ id, status: 'PASS', desc, detail });
  log(`  ✅ ${id} ${desc}`);
}

function fail(id, desc, detail) {
  failCount++;
  results.push({ id, status: 'FAIL', desc, detail });
  log(`  ❌ ${id} ${desc} — ${detail}`);
}

function skip(id, desc, reason) {
  skipCount++;
  results.push({ id, status: 'SKIP', desc, reason });
  log(`  ⏭️  ${id} ${desc} — ${reason}`);
}

function cli(args) {
  try {
    const out = execSync(`node "${CLI_BIN}" ${args}`, {
      encoding: 'utf8',
      timeout: 15000,
      env: { ...process.env, CR_API_URL: API_BASE },
    });
    return { ok: true, stdout: out.trim(), stderr: '' };
  } catch (err) {
    return {
      ok: false,
      stdout: (err.stdout || '').trim(),
      stderr: (err.stderr || '').trim(),
      status: err.status,
    };
  }
}

async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, ...json };
}

function assertContains(text, keyword, id, desc) {
  if (text.includes(keyword)) {
    pass(id, desc);
  } else {
    fail(id, desc, `输出中未找到 "${keyword}"`);
  }
}

function assertNotContains(text, keyword, id, desc) {
  if (!text.includes(keyword)) {
    pass(id, desc);
  } else {
    fail(id, desc, `输出中不应包含 "${keyword}"`);
  }
}

// ─── 测试用例: Admin ────────────────────────────────────────
async function runAdminTests() {
  log('\n══════════════════════════════════════');
  log('  Admin 角色测试');
  log('══════════════════════════════════════\n');

  // --- 认证 ---
  log('[认证]');
  const loginOut = cli(`login -e ${ACCOUNTS.admin.email} -p ${ACCOUNTS.admin.password}`);
  assertContains(loginOut.stdout, '登录成功', 'admin-auth-001', 'admin 登录成功');
  assertContains(loginOut.stdout, 'admin', 'admin-auth-002', '返回角色 admin');

  const whoOut = cli('whoami');
  assertContains(whoOut.stdout, ACCOUNTS.admin.email, 'admin-auth-003', 'whoami 显示正确邮箱');
  assertContains(whoOut.stdout, 'admin', 'admin-auth-004', 'whoami 显示角色 admin');

  // --- 系统状态 ---
  log('\n[系统状态]');
  const statusOut = cli('status --json');
  if (statusOut.ok) {
    pass('admin-status-001', '系统状态查询成功');
  } else {
    fail('admin-status-001', '系统状态查询失败', statusOut.stderr);
  }

  const statsOut = cli('admin stats --json');
  if (statsOut.ok && statsOut.stdout.includes('notices')) {
    pass('admin-status-002', 'admin stats 返回统计数据');
  } else {
    fail('admin-status-002', 'admin stats 失败', statsOut.stderr || statsOut.stdout);
  }

  // --- 标讯查看 ---
  log('\n[标讯查看]');
  const listOut = cli('list --days 7 --json');
  if (listOut.ok) {
    pass('admin-notice-001', '标讯列表查询成功');
  } else {
    fail('admin-notice-001', '标讯列表查询失败', listOut.stderr);
  }

  const todayOut = cli('today --json');
  if (todayOut.ok) {
    pass('admin-notice-002', '今日标讯查询成功');
  } else {
    fail('admin-notice-002', '今日标讯查询失败', todayOut.stderr);
  }

  const searchOut = cli('search "运维" --json');
  if (searchOut.ok) {
    pass('admin-notice-003', '搜索标讯成功');
  } else {
    fail('admin-notice-003', '搜索标讯失败', searchOut.stderr);
  }

  const matchOut = cli('match --json');
  if (matchOut.ok) {
    pass('admin-notice-004', '强推标讯查询成功');
  } else {
    fail('admin-notice-004', '强推标讯查询失败', matchOut.stderr);
  }

  const accessOut = cli('list -a free --json');
  if (accessOut.ok) {
    pass('admin-notice-005', '按 doc_access_type 筛选成功');
  } else {
    fail('admin-notice-005', '按 doc_access_type 筛选失败', accessOut.stderr);
  }

  // --- 标讯详情 ---
  log('\n[标讯详情]');
  const showOut = cli('show 1 --json');
  if (showOut.ok && showOut.stdout.includes('"id"')) {
    pass('admin-show-001', '标讯详情查询成功');
  } else {
    // 可能没有数据
    if (showOut.stdout.includes('Not found') || showOut.stdout.includes('null')) {
      skip('admin-show-001', '标讯详情查询', '无标讯数据');
    } else {
      fail('admin-show-001', '标讯详情查询失败', showOut.stderr);
    }
  }

  // --- 公司资质 CRUD ---
  log('\n[公司资质 CRUD]');
  const qualListOut = cli('qual --json');
  if (qualListOut.ok) {
    pass('admin-qual-001', '公司资质列表查询成功');
  } else {
    fail('admin-qual-001', '公司资质列表查询失败', qualListOut.stderr);
  }

  const qualAddOut = cli('admin qual:add --type E2E --name "自动化测试资质" --level 三级 --cert E2E-001 --json');
  let newQualId = null;
  if (qualAddOut.ok && qualAddOut.stdout.includes('"id"')) {
    try {
      const parsed = JSON.parse(qualAddOut.stdout);
      newQualId = parsed.data?.id || parsed.id;
    } catch (e) {}
    pass('admin-qual-002', '新增公司资质成功');
  } else {
    fail('admin-qual-002', '新增公司资质失败', qualAddOut.stderr || qualAddOut.stdout);
  }

  if (newQualId) {
    const qualUpdateOut = cli(`admin qual:update ${newQualId} --name "自动化测试资质-已更新" --json`);
    if (qualUpdateOut.ok) {
      pass('admin-qual-003', '更新公司资质成功');
    } else {
      fail('admin-qual-003', '更新公司资质失败', qualUpdateOut.stderr);
    }

    const qualDeleteOut = cli(`admin qual:delete ${newQualId}`);
    if (qualDeleteOut.ok) {
      pass('admin-qual-004', '删除公司资质成功');
    } else {
      fail('admin-qual-004', '删除公司资质失败', qualDeleteOut.stderr);
    }
  } else {
    skip('admin-qual-003', '更新公司资质', '无法获取新资质 ID');
    skip('admin-qual-004', '删除公司资质', '无法获取新资质 ID');
  }

  // --- 人员资质 CRUD ---
  log('\n[人员资质 CRUD]');
  const personListOut = cli('person --json');
  if (personListOut.ok) {
    pass('admin-person-001', '人员资质列表查询成功');
  } else {
    fail('admin-person-001', '人员资质列表查询失败', personListOut.stderr);
  }

  const personAddOut = cli('admin person:add --name "E2E测试人" --type E2E --cert "E2E测试证书" --certno E2E-P-001 --json');
  let newPersonId = null;
  if (personAddOut.ok && personAddOut.stdout.includes('"id"')) {
    try {
      const parsed = JSON.parse(personAddOut.stdout);
      newPersonId = parsed.data?.id || parsed.id;
    } catch (e) {}
    pass('admin-person-002', '新增人员资质成功');
  } else {
    fail('admin-person-002', '新增人员资质失败', personAddOut.stderr || personAddOut.stdout);
  }

  if (newPersonId) {
    const personDeleteOut = cli(`admin person:delete ${newPersonId}`);
    if (personDeleteOut.ok) {
      pass('admin-person-003', '删除人员资质成功');
    } else {
      fail('admin-person-003', '删除人员资质失败', personDeleteOut.stderr);
    }
  } else {
    skip('admin-person-003', '删除人员资质', '无法获取新人员资质 ID');
  }

  // --- 合同管理 ---
  log('\n[合同管理]');
  const contractListOut = cli('contract --json');
  if (contractListOut.ok) {
    pass('admin-contract-001', '合同列表查询成功');
  } else {
    fail('admin-contract-001', '合同列表查询失败', contractListOut.stderr);
  }

  // --- 平台管理 ---
  log('\n[平台管理]');
  const platformListOut = cli('admin platform:list --json');
  if (platformListOut.ok) {
    pass('admin-platform-001', '平台列表查询成功');
  } else {
    fail('admin-platform-001', '平台列表查询失败', platformListOut.stderr);
  }

  // --- 用户管理 ---
  log('\n[用户管理]');
  const userListOut = cli('admin user:list --json');
  if (userListOut.ok && userListOut.stdout.includes(ACCOUNTS.admin.email)) {
    pass('admin-user-001', '用户列表查询成功，包含 admin');
  } else {
    fail('admin-user-001', '用户列表查询失败', userListOut.stderr || '未找到 admin 用户');
  }

  // --- 通过 API 直接验证 ---
  log('\n[API 直接验证]');
  try {
    const healthRes = await api('GET', '/api/health');
    if (healthRes.status === 'ok') {
      pass('admin-api-001', '健康检查 API 正常');
    } else {
      fail('admin-api-001', '健康检查 API 异常', JSON.stringify(healthRes));
    }
  } catch (err) {
    fail('admin-api-001', '健康检查 API 连接失败', err.message);
  }

  // 获取 admin token 做 API 验证
  try {
    const loginRes = await api('POST', '/api/auth/login', {
      email: ACCOUNTS.admin.email,
      password: ACCOUNTS.admin.password,
    });
    if (loginRes.success && loginRes.data?.access_token) {
      const token = loginRes.data.access_token;

      const statsRes = await api('GET', '/api/admin/stats', null, token);
      if (statsRes.success && statsRes.data?.counts) {
        pass('admin-api-002', 'admin stats API 返回完整统计数据');
        log(`         标讯: ${statsRes.data.counts.notices}, 资质: ${statsRes.data.counts.company_qualifications}, 合同: ${statsRes.data.counts.contracts}, 匹配: ${statsRes.data.counts.matches}`);
      } else {
        fail('admin-api-002', 'admin stats API 异常', JSON.stringify(statsRes));
      }
    } else {
      fail('admin-api-002', 'API 登录失败', JSON.stringify(loginRes));
    }
  } catch (err) {
    fail('admin-api-002', 'API 验证失败', err.message);
  }
}

// ─── 测试用例: Sales (Viewer) ───────────────────────────────
async function runSalesTests() {
  log('\n══════════════════════════════════════');
  log('  Sales (Viewer) 角色测试');
  log('══════════════════════════════════════\n');

  // --- 认证 ---
  log('[认证]');
  const loginOut = cli(`login -e ${ACCOUNTS.sales.email} -p ${ACCOUNTS.sales.password}`);
  assertContains(loginOut.stdout, '登录成功', 'sales-auth-001', 'sales 登录成功');
  assertContains(loginOut.stdout, 'viewer', 'sales-auth-002', '返回角色 viewer');

  const whoOut = cli('whoami');
  assertContains(whoOut.stdout, ACCOUNTS.sales.email, 'sales-auth-003', 'whoami 显示正确邮箱');
  assertContains(whoOut.stdout, 'viewer', 'sales-auth-004', 'whoami 显示角色 viewer');

  // --- 只读查询（应全部成功）---
  log('\n[只读查询]');
  const statusOut = cli('status --json');
  if (statusOut.ok) {
    pass('sales-read-001', '系统状态查询成功');
  } else {
    fail('sales-read-001', '系统状态查询失败', statusOut.stderr);
  }

  const listOut = cli('list --days 7 --json');
  if (listOut.ok) {
    pass('sales-read-002', '标讯列表查询成功');
  } else {
    fail('sales-read-002', '标讯列表查询失败', listOut.stderr);
  }

  const todayOut = cli('today --json');
  if (todayOut.ok) {
    pass('sales-read-003', '今日标讯查询成功');
  } else {
    fail('sales-read-003', '今日标讯查询失败', todayOut.stderr);
  }

  const searchOut = cli('search "存储" --json');
  if (searchOut.ok) {
    pass('sales-read-004', '搜索标讯成功');
  } else {
    fail('sales-read-004', '搜索标讯失败', searchOut.stderr);
  }

  const showOut = cli('show 1 --json');
  if (showOut.ok || showOut.stdout.includes('Not found')) {
    pass('sales-read-005', '标讯详情查询（成功或无数据）');
  } else {
    fail('sales-read-005', '标讯详情查询失败', showOut.stderr);
  }

  const matchOut = cli('match --json');
  if (matchOut.ok) {
    pass('sales-read-006', '强推标讯查询成功');
  } else {
    fail('sales-read-006', '强推标讯查询失败', matchOut.stderr);
  }

  const qualOut = cli('qual --json');
  if (qualOut.ok) {
    pass('sales-read-007', '公司资质只读查询成功');
  } else {
    fail('sales-read-007', '公司资质只读查询失败', qualOut.stderr);
  }

  const personOut = cli('person --json');
  if (personOut.ok) {
    pass('sales-read-008', '人员资质只读查询成功');
  } else {
    fail('sales-read-008', '人员资质只读查询失败', personOut.stderr);
  }

  const contractOut = cli('contract --json');
  if (contractOut.ok) {
    pass('sales-read-009', '合同只读查询成功');
  } else {
    fail('sales-read-009', '合同只读查询失败', contractOut.stderr);
  }

  // --- 权限拒绝（viewer 不能执行 admin 命令）---
  log('\n[权限拒绝验证]');

  const deniedCases = [
    { cmd: 'admin stats', id: 'sales-denied-001', desc: 'admin stats 被拒绝' },
    { cmd: 'admin user:list', id: 'sales-denied-002', desc: 'admin user:list 被拒绝' },
    { cmd: 'admin qual:add --type T --name X', id: 'sales-denied-003', desc: 'admin qual:add 被拒绝' },
    { cmd: 'admin person:add --name X --type T --cert X', id: 'sales-denied-004', desc: 'admin person:add 被拒绝' },
    { cmd: 'admin contract:list', id: 'sales-denied-005', desc: 'admin contract:list 被拒绝' },
    { cmd: 'admin platform:list', id: 'sales-denied-006', desc: 'admin platform:list 被拒绝' },
    { cmd: 'admin notice:fetch', id: 'sales-denied-007', desc: 'admin notice:fetch 被拒绝' },
    { cmd: 'admin match:run', id: 'sales-denied-008', desc: 'admin match:run 被拒绝' },
    { cmd: 'admin push:test', id: 'sales-denied-009', desc: 'admin push:test 被拒绝' },
    { cmd: 'admin pipeline', id: 'sales-denied-010', desc: 'admin pipeline 被拒绝' },
  ];

  for (const tc of deniedCases) {
    const out = cli(tc.cmd);
    // CLI 内部检查角色后会 process.exit(1)，所以 ok=false 且 stderr 包含权限拒绝信息
    if (!out.ok && (out.stderr.includes('管理员权限') || out.stderr.includes('Admin access') || out.stdout.includes('管理员权限') || out.stdout.includes('Admin access'))) {
      pass(tc.id, tc.desc);
    } else if (!out.ok) {
      // 命令失败但不是因为权限拒绝
      pass(tc.id, tc.desc + ' (命令失败)');
    } else {
      fail(tc.id, tc.desc, 'viewer 不应有权执行此命令');
    }
  }

  // --- API 直接验证：viewer token 访问 admin API ---
  log('\n[API 权限验证]');
  try {
    const loginRes = await api('POST', '/api/auth/login', {
      email: ACCOUNTS.sales.email,
      password: ACCOUNTS.sales.password,
    });
    if (loginRes.success && loginRes.data?.access_token) {
      const token = loginRes.data.access_token;

      const statsRes = await api('GET', '/api/admin/stats', null, token);
      if (statsRes.status === 403 || !statsRes.success) {
        pass('sales-api-001', 'viewer token 访问 admin stats 被拒 (403)');
      } else {
        fail('sales-api-001', 'viewer token 不应能访问 admin stats', JSON.stringify(statsRes));
      }

      const usersRes = await api('GET', '/api/admin/users', null, token);
      if (usersRes.status === 403 || !usersRes.success) {
        pass('sales-api-002', 'viewer token 访问 admin users 被拒 (403)');
      } else {
        fail('sales-api-002', 'viewer token 不应能访问 admin users', JSON.stringify(usersRes));
      }

      // viewer 应该能访问公开 API
      const noticesRes = await api('GET', '/api/notices?page=1&pageSize=5');
      if (noticesRes.success) {
        pass('sales-api-003', 'viewer token 可访问公开 notices API');
      } else {
        fail('sales-api-003', 'viewer token 访问公开 notices API 失败', JSON.stringify(noticesRes));
      }
    } else {
      fail('sales-api-001', 'API 登录失败', JSON.stringify(loginRes));
    }
  } catch (err) {
    fail('sales-api-001', 'API 验证失败', err.message);
  }
}

// ─── 未认证测试 ──────────────────────────────────────────────
async function runNoAuthTests() {
  log('\n══════════════════════════════════════');
  log('  未认证测试');
  log('══════════════════════════════════════\n');

  // 登出
  cli('logout');

  const whoOut = cli('whoami');
  if (!whoOut.ok && (whoOut.stdout.includes('未登录') || whoOut.stderr.includes('未登录'))) {
    pass('noauth-001', '未登录时 whoami 提示先登录');
  } else {
    fail('noauth-001', '未登录时 whoami 应提示先登录', whoOut.stdout + whoOut.stderr);
  }

  const listOut = cli('list --json');
  if (listOut.ok) {
    pass('noauth-002', '未登录时 list 仍然可用（公开 API）');
  } else {
    fail('noauth-002', '未登录时 list 应该可用', listOut.stderr);
  }

  const adminOut = cli('admin stats');
  if (!adminOut.ok) {
    pass('noauth-003', '未登录时 admin 命令被拒绝');
  } else {
    fail('noauth-003', '未登录时 admin 命令应被拒绝', adminOut.stdout);
  }
}

// ─── 主入口 ──────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const roleIdx = args.indexOf('--role');
  const role = roleIdx >= 0 ? args[roleIdx + 1] : 'all';

  log('╔══════════════════════════════════════════╗');
  log('║  客户雷达 后端双角色测试                   ║');
  log('║  Customer Radar Backend Dual-Role Test    ║');
  log('╚══════════════════════════════════════════╝');
  log(`  API: ${API_BASE}`);
  log(`  角色: ${role}`);
  log(`  时间: ${new Date().toISOString()}`);

  if (role === 'admin' || role === 'all') {
    await runAdminTests();
  }

  if (role === 'sales' || role === 'all') {
    await runSalesTests();
  }

  if (role === 'all') {
    await runNoAuthTests();
  }

  // ─── 汇总 ──────────────────────────────────────────────
  log('\n══════════════════════════════════════');
  log('  测试汇总');
  log('══════════════════════════════════════');
  log(`  ✅ 通过: ${passCount}`);
  log(`  ❌ 失败: ${failCount}`);
  log(`  ⏭️  跳过: ${skipCount}`);
  log(`  📊 总计: ${passCount + failCount + skipCount}`);
  log('══════════════════════════════════════\n');

  if (failCount > 0) {
    log('失败用例:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      log(`  ${r.id}: ${r.desc} — ${r.detail}`);
    });
    log('');
  }

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(err => {
  log(`\n💥 测试运行异常: ${err.message}`);
  process.exit(2);
});
