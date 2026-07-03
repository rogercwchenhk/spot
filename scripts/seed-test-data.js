/**
 * 测试数据种子脚本
 * 创建 admin 用户 + 示例资质 + 示例合同
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seed() {
  console.log('=== 开始创建测试数据 ===\n');

  // 1. 创建 admin 用户
  console.log('[1/5] 创建 admin 用户...');
  try {
    const { data: user, error } = await supabase.auth.admin.createUser({
      email: process.env.ADMIN_EMAIL || 'admin@leadcom.chat',
      password: process.env.ADMIN_PASSWORD || 'Admin123456',
      user_metadata: { role: 'admin' },
      email_confirm: true,
    });

    if (error) {
      if (error.message.includes('already been registered')) {
        console.log('  ✓ admin 用户已存在');
      } else {
        console.log('  ✗ 创建失败:', error.message);
      }
    } else {
      console.log('  ✓ admin 用户创建成功:', user.user.email);
    }
  } catch (err) {
    console.log('  ✗ 错误:', err.message);
  }

  // 2. 创建 viewer 用户
  console.log('\n[2/5] 创建 viewer 用户...');
  try {
    const { data: user, error } = await supabase.auth.admin.createUser({
      email: 'viewer@leadcom.chat',
      password: 'Viewer123456',
      user_metadata: { role: 'viewer' },
      email_confirm: true,
    });

    if (error) {
      if (error.message.includes('already been registered')) {
        console.log('  ✓ viewer 用户已存在');
      } else {
        console.log('  ✗ 创建失败:', error.message);
      }
    } else {
      console.log('  ✓ viewer 用户创建成功:', user.user.email);
    }
  } catch (err) {
    console.log('  ✗ 错误:', err.message);
  }

  // 3. 插入示例公司资质
  console.log('\n[3/5] 插入示例公司资质...');
  const companyQuals = [
    { qual_type: 'ISO9001', qual_name: '质量管理体系认证', qual_level: '-', cert_number: 'QM-2024-001', issue_date: '2024-01-01', expiry_date: '2027-01-01', issuing_body: '中国质量认证中心', scope: 'IT运维服务、系统集成', is_active: true },
    { qual_type: 'ISO27001', qual_name: '信息安全管理体系认证', qual_level: '-', cert_number: 'IS-2024-002', issue_date: '2024-03-01', expiry_date: '2027-03-01', issuing_body: 'BSI', scope: '信息安全管理', is_active: true },
    { qual_type: 'ITSS', qual_name: 'ITSS运行维护服务能力', qual_level: '三级', cert_number: 'ITSS-2023-003', issue_date: '2023-06-01', expiry_date: '2026-06-01', issuing_body: 'ITSS分会', scope: 'IT运维服务能力', is_active: true },
    { qual_type: 'CCRC', qual_name: 'CCRC信息安全服务-安全集成', qual_level: '三级', cert_number: 'CCRC-2024-004', issue_date: '2024-05-01', expiry_date: '2027-05-01', issuing_body: '中国网络安全审查技术与认证中心', scope: '安全集成服务', is_active: true },
    { qual_type: 'CCRC', qual_name: 'CCRC信息安全服务-安全运维', qual_level: '三级', cert_number: 'CCRC-2024-005', issue_date: '2024-05-01', expiry_date: '2027-05-01', issuing_body: '中国网络安全审查技术与认证中心', scope: '安全运维服务', is_active: true },
    { qual_type: '营业执照', qual_name: '营业执照', qual_level: '-', cert_number: '91440000MA5XXXXX', issue_date: '2020-01-01', expiry_date: '2030-01-01', issuing_body: '广州市市场监督管理局', scope: '信息技术服务', is_active: true },
  ];

  let companyOk = 0;
  for (const qual of companyQuals) {
    const { error } = await supabase.from('company_qualification').insert(qual);
    if (error) {
      console.log(`  ✗ ${qual.qual_name}: ${error.message}`);
    } else {
      console.log(`  ✓ ${qual.qual_name}`);
      companyOk++;
    }
  }

  // 4. 插入示例人员资质
  console.log('\n[4/5] 插入示例人员资质...');
  const personnelQuals = [
    { person_name: '张三', qual_type: 'PMP', qual_name: 'PMP项目管理专业人士', cert_number: 'PMP-2023-001', issue_date: '2023-01-01', expiry_date: '2026-01-01', is_active: true },
    { person_name: '张三', qual_type: 'OCP', qual_name: 'Oracle Certified Professional', cert_number: 'OCP-2022-002', issue_date: '2022-06-01', expiry_date: '2025-06-01', is_active: true },
    { person_name: '李四', qual_type: 'RHCE', qual_name: 'Red Hat Certified Engineer', cert_number: 'RHCE-2023-003', issue_date: '2023-03-01', expiry_date: '2026-03-01', is_active: true },
    { person_name: '李四', qual_type: 'RHCA', qual_name: 'Red Hat Certified Architect', cert_number: 'RHCA-2024-004', issue_date: '2024-01-01', expiry_date: '2027-01-01', is_active: true },
    { person_name: '王五', qual_type: 'HCIP-Storage', qual_name: '华为存储技术认证-高级', cert_number: 'HCIP-S-2023-005', issue_date: '2023-09-01', expiry_date: '2026-09-01', is_active: true },
    { person_name: '王五', qual_type: 'VCP', qual_name: 'VMware Certified Professional', cert_number: 'VCP-2024-006', issue_date: '2024-02-01', expiry_date: '2027-02-01', is_active: true },
    { person_name: '赵六', qual_type: 'CCNP', qual_name: 'Cisco Certified Network Professional', cert_number: 'CCNP-2023-007', issue_date: '2023-05-01', expiry_date: '2026-05-01', is_active: true },
    { person_name: '赵六', qual_type: 'CCIE', qual_name: 'Cisco Certified Internetwork Expert', cert_number: 'CCIE-2024-008', issue_date: '2024-01-01', expiry_date: '2027-01-01', is_active: true },
    { person_name: '钱七', qual_type: 'CISP', qual_name: '注册信息安全专业人员', cert_number: 'CISP-2023-009', issue_date: '2023-07-01', expiry_date: '2026-07-01', is_active: true },
    { person_name: '钱七', qual_type: 'CKA', qual_name: 'Certified Kubernetes Administrator', cert_number: 'CKA-2024-010', issue_date: '2024-04-01', expiry_date: '2027-04-01', is_active: true },
  ];

  let personnelOk = 0;
  for (const qual of personnelQuals) {
    const { error } = await supabase.from('personnel_qualification').insert(qual);
    if (error) {
      console.log(`  ✗ ${qual.person_name} - ${qual.qual_name}: ${error.message}`);
    } else {
      console.log(`  ✓ ${qual.person_name} - ${qual.qual_name}`);
      personnelOk++;
    }
  }

  // 5. 插入示例合同
  console.log('\n[5/5] 插入示例合同...');
  const contracts = [
    {
      source_file: 'XX银行运维合同-2024.pdf',
      project_name: 'XX银行核心系统运维服务',
      client_name: 'XX银行股份有限公司',
      service_type: '驻场运维',
      tech_keywords: ['小型机', '存储', 'Oracle', 'AIX'],
      industry: '银行',
      contract_amount: 2800000,
      start_date: '2024-01-01',
      end_date: '2026-12-31',
      region: '广州',
      raw_text: '甲方委托乙方提供核心系统运维服务，包括IBM小型机、存储设备、Oracle数据库的日常运维和应急保障。',
      process_status: 1,
      is_active: true,
    },
    {
      source_file: 'XX医院信息化运维-2023.pdf',
      project_name: 'XX医院信息化系统运维服务',
      client_name: 'XX市人民医院',
      service_type: '桌面运维',
      tech_keywords: ['桌面', '网络', '服务器', 'Windows'],
      industry: '医院',
      contract_amount: 1200000,
      start_date: '2023-07-01',
      end_date: '2025-06-30',
      region: '深圳',
      raw_text: '甲方委托乙方提供医院信息化系统运维服务，包括桌面终端、网络设备、服务器的日常维护。',
      process_status: 1,
      is_active: true,
    },
    {
      source_file: 'XX市政府IT维保-2024.pdf',
      project_name: 'XX市政府IT设备维保服务',
      client_name: 'XX市人民政府',
      service_type: '维保',
      tech_keywords: ['服务器', '存储', '网络', '华为'],
      industry: '政府',
      contract_amount: 950000,
      start_date: '2024-04-01',
      end_date: '2025-03-31',
      region: '广州',
      raw_text: '甲方委托乙方提供IT设备维保服务，包括华为服务器、存储、网络设备的保修和应急响应。',
      process_status: 1,
      is_active: true,
    },
    {
      source_file: 'XX电力系统集成-2023.pdf',
      project_name: 'XX电力公司数据中心系统集成',
      client_name: 'XX电力有限公司',
      service_type: '集成',
      tech_keywords: ['数据中心', '服务器', '存储', '虚拟化', 'VMware'],
      industry: '电力',
      contract_amount: 5500000,
      start_date: '2023-01-01',
      end_date: '2023-12-31',
      region: '佛山',
      raw_text: '甲方委托乙方实施数据中心系统集成项目，包括服务器、存储、虚拟化平台的规划和部署。',
      process_status: 1,
      is_active: true,
    },
    {
      source_file: 'XX交通网络优化-2024.pdf',
      project_name: 'XX交通集团网络优化服务',
      client_name: 'XX交通集团有限公司',
      service_type: '咨询',
      tech_keywords: ['网络', 'Cisco', '安全', '防火墙'],
      industry: '交通',
      contract_amount: 680000,
      start_date: '2024-06-01',
      end_date: '2024-12-31',
      region: '广州',
      raw_text: '甲方委托乙方提供网络优化咨询服务，包括Cisco网络设备升级、安全策略优化。',
      process_status: 1,
      is_active: true,
    },
  ];

  let contractOk = 0;
  for (const contract of contracts) {
    const { error } = await supabase.from('company_contract').insert(contract);
    if (error) {
      console.log(`  ✗ ${contract.project_name}: ${error.message}`);
    } else {
      console.log(`  ✓ ${contract.project_name}`);
      contractOk++;
    }
  }

  console.log('\n=== 测试数据创建完成 ===');
  console.log(`\n统计:`);
  console.log(`  公司资质: ${companyOk}/${companyQuals.length}`);
  console.log(`  人员资质: ${personnelOk}/${personnelQuals.length}`);
  console.log(`  合同: ${contractOk}/${contracts.length}`);
  console.log('\n账号信息:');
  console.log('  Admin: admin@leadcom.chat / Admin123456');
  console.log('  Viewer: viewer@leadcom.chat / Viewer123456');
}

seed().catch(console.error);
