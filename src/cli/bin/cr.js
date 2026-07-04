#!/usr/bin/env node

/**
 * 客户雷达 CLI
 * cr - Customer Radar Command Line Interface
 */
const { Command } = require('commander');
const { isLoggedIn, isAdmin, getUser } = require('../lib/auth');

const program = new Command();

program
  .name('cr')
  .description('客户雷达 CLI - 广东励康标讯情报系统')
  .version('1.0.0');

// ============================================================
// 认证命令
// ============================================================

program
  .command('login')
  .description('登录')
  .option('-e, --email <email>', '邮箱')
  .option('-p, --password <password>', '密码')
  .action(async (options) => {
    const { login, isLoggedIn } = require('../lib/auth');
    const { success, error, info } = require('../lib/output');
    const inquirer = require('inquirer');

    try {
      let { email, password } = options;

      if (!email || !password) {
        const answers = await inquirer.prompt([
          { type: 'input', name: 'email', message: '邮箱:', default: email },
          { type: 'password', name: 'password', message: '密码:' },
        ]);
        email = answers.email;
        password = answers.password;
      }

      const user = await login(email, password);
      success(`登录成功: ${user.email} (${user.role})`);
    } catch (err) {
      error(`登录失败: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command('logout')
  .description('登出')
  .action(async () => {
    const { logout } = require('../lib/auth');
    const { success } = require('../lib/output');
    
    await logout();
    success('已登出');
  });

program
  .command('whoami')
  .description('显示当前用户')
  .action(() => {
    const { isLoggedIn, getUser } = require('../lib/auth');
    const { error, info } = require('../lib/output');

    if (!isLoggedIn()) {
      error('未登录，请先执行 cr login');
      process.exit(1);
    }

    const user = getUser();
    info(`用户: ${user.email}`);
    info(`角色: ${user.role}`);
  });

// ============================================================
// Viewer 命令
// ============================================================

program
  .command('list')
  .description('查看标讯列表')
  .option('-l, --level <level>', '推荐等级 (strong/yes/risky/no)')
  .option('-c, --city <city>', '城市')
  .option('-d, --days <days>', '最近N天', '7')
  .option('-a, --access <type>', '招标文件获取方式 (unknown/free/paid/registration_required)')
  .option('-p, --page <page>', '页码', '1')
  .option('--json', 'JSON 格式输出')
  .action(async (options) => {
    await require('../commands/list').execute(options);
  });

program
  .command('show <id>')
  .description('查看标讯详情')
  .option('--json', 'JSON 格式输出')
  .action(async (id, options) => {
    await require('../commands/show').execute(id, options);
  });

program
  .command('search <keyword>')
  .description('搜索标讯')
  .option('-p, --page <page>', '页码', '1')
  .option('--json', 'JSON 格式输出')
  .action(async (keyword, options) => {
    await require('../commands/search').execute(keyword, options);
  });

program
  .command('today')
  .description('查看今日标讯')
  .option('--json', 'JSON 格式输出')
  .action(async (options) => {
    await require('../commands/list').execute({ ...options, days: '1' });
  });

program
  .command('match')
  .description('查看强推和可以投的标讯')
  .option('--json', 'JSON 格式输出')
  .action(async (options) => {
    await require('../commands/list').execute({ ...options, level: 'strong' });
  });

// ============================================================
// 资质和合同查看命令
// ============================================================

program
  .command('qual')
  .description('查看公司资质')
  .option('-t, --type <type>', '资质类型')
  .option('--json', 'JSON 格式输出')
  .action(async (options) => {
    await require('../commands/qual').execute(options);
  });

program
  .command('person')
  .description('查看人员资质')
  .option('-t, --type <type>', '证书类型')
  .option('--json', 'JSON 格式输出')
  .action(async (options) => {
    await require('../commands/person').execute(options);
  });

program
  .command('contract')
  .description('查看合同列表')
  .option('-i, --industry <industry>', '行业')
  .option('-t, --type <type>', '服务类型')
  .option('--json', 'JSON 格式输出')
  .action(async (options) => {
    await require('../commands/contract').execute(options);
  });

program
  .command('status')
  .description('查看系统状态')
  .option('--json', 'JSON 格式输出')
  .action(async (options) => {
    await require('../commands/status').execute(options);
  });

// ============================================================
// Admin 命令
// ============================================================

const adminCmd = program
  .command('admin')
  .description('管理员命令')
  .hook('preAction', (thisCommand) => {
    if (!isLoggedIn()) {
      console.error('✗ 未登录，请先执行 cr login');
      process.exit(1);
    }
    if (!isAdmin()) {
      console.error('✗ 需要管理员权限');
      process.exit(1);
    }
  });

// 公司资质管理
adminCmd
  .command('qual:list')
  .description('列出公司资质')
  .option('-t, --type <type>', '资质类型')
  .option('--json', 'JSON 格式输出')
  .action(async (options) => {
    await require('../commands/admin/qual').list(options);
  });

adminCmd
  .command('qual:add')
  .description('新增公司资质')
  .requiredOption('--type <type>', '资质类型')
  .requiredOption('--name <name>', '资质名称')
  .option('--level <level>', '等级')
  .option('--cert <cert>', '证书编号')
  .option('--expiry <expiry>', '到期日期')
  .option('--json', 'JSON 格式输出')
  .action(async (options) => {
    await require('../commands/admin/qual').add(options);
  });

adminCmd
  .command('qual:update <id>')
  .description('更新公司资质')
  .option('--name <name>', '资质名称')
  .option('--level <level>', '等级')
  .option('--cert <cert>', '证书编号')
  .option('--expiry <expiry>', '到期日期')
  .option('--active <active>', '是否有效 (true/false)')
  .option('--json', 'JSON 格式输出')
  .action(async (id, options) => {
    await require('../commands/admin/qual').update(id, options);
  });

adminCmd
  .command('qual:delete <id>')
  .description('删除公司资质')
  .action(async (id) => {
    await require('../commands/admin/qual').remove(id);
  });

// 人员资质管理
adminCmd
  .command('person:list')
  .description('列出人员资质')
  .option('-t, --type <type>', '证书类型')
  .option('--json', 'JSON 格式输出')
  .action(async (options) => {
    await require('../commands/admin/person').list(options);
  });

adminCmd
  .command('person:add')
  .description('新增人员资质')
  .requiredOption('--name <name>', '姓名')
  .requiredOption('--type <type>', '证书类型')
  .requiredOption('--cert <cert>', '证书名称')
  .option('--certno <certno>', '证书编号')
  .option('--expiry <expiry>', '到期日期')
  .option('--json', 'JSON 格式输出')
  .action(async (options) => {
    await require('../commands/admin/person').add(options);
  });

adminCmd
  .command('person:update <id>')
  .description('更新人员资质')
  .option('--name <name>', '姓名')
  .option('--expiry <expiry>', '到期日期')
  .option('--active <active>', '是否有效 (true/false)')
  .option('--json', 'JSON 格式输出')
  .action(async (id, options) => {
    await require('../commands/admin/person').update(id, options);
  });

adminCmd
  .command('person:delete <id>')
  .description('删除人员资质')
  .action(async (id) => {
    await require('../commands/admin/person').remove(id);
  });

// 合同管理
adminCmd
  .command('contract:list')
  .description('列出合同')
  .option('-i, --industry <industry>', '行业')
  .option('-t, --type <type>', '服务类型')
  .option('--json', 'JSON 格式输出')
  .action(async (options) => {
    await require('../commands/admin/contract').list(options);
  });

adminCmd
  .command('contract:add')
  .description('新增合同')
  .option('--json-file <file>', 'JSON 文件路径')
  .option('--json', 'JSON 格式输出')
  .action(async (options) => {
    await require('../commands/admin/contract').add(options);
  });

adminCmd
  .command('contract:import')
  .description('批量导入合同')
  .requiredOption('--file <file>', 'JSONL 文件路径')
  .option('--json', 'JSON 格式输出')
  .action(async (options) => {
    await require('../commands/admin/contract').importFile(options);
  });

adminCmd
  .command('contract:update <id>')
  .description('更新合同')
  .option('--project <project>', '项目名称')
  .option('--amount <amount>', '合同金额')
  .option('--json', 'JSON 格式输出')
  .action(async (id, options) => {
    await require('../commands/admin/contract').update(id, options);
  });

adminCmd
  .command('contract:delete <id>')
  .description('删除合同')
  .action(async (id) => {
    await require('../commands/admin/contract').remove(id);
  });

// 平台管理
adminCmd
  .command('platform:list')
  .description('列出平台')
  .option('-t, --type <type>', '平台类型')
  .option('--json', 'JSON 格式输出')
  .action(async (options) => {
    await require('../commands/admin/platform').list(options);
  });

adminCmd
  .command('platform:add')
  .description('新增平台')
  .requiredOption('--name <name>', '平台名称')
  .requiredOption('--url <url>', '平台URL')
  .requiredOption('--type <type>', '平台类型 (agency/enterprise_srm/gov_platform)')
  .option('--anti-bot <level>', '反爬等级 (none/low/medium/high)', 'none')
  .option('--json', 'JSON 格式输出')
  .action(async (options) => {
    await require('../commands/admin/platform').add(options);
  });

adminCmd
  .command('platform:update <id>')
  .description('更新平台')
  .option('--name <name>', '平台名称')
  .option('--active <active>', '是否启用 (true/false)')
  .option('--json', 'JSON 格式输出')
  .action(async (id, options) => {
    await require('../commands/admin/platform').update(id, options);
  });

adminCmd
  .command('platform:delete <id>')
  .description('删除平台')
  .action(async (id) => {
    await require('../commands/admin/platform').remove(id);
  });

// 标讯处理
adminCmd
  .command('notice:fetch')
  .description('手动触发标讯采集')
  .option('--keyword <keyword>', '关键词', '运维,小型机')
  .option('--json', 'JSON 格式输出')
  .action(async (options) => {
    await require('../commands/admin/notice').fetch(options);
  });

adminCmd
  .command('notice:process [id]')
  .description('触发 AI Pipeline 处理')
  .option('--batch', '批量处理')
  .option('--json', 'JSON 格式输出')
  .action(async (id, options) => {
    await require('../commands/admin/notice').process(id, options);
  });

adminCmd
  .command('match:run [id]')
  .description('运行匹配引擎')
  .option('--batch', '批量计算')
  .option('--json', 'JSON 格式输出')
  .action(async (id, options) => {
    await require('../commands/admin/notice').match(id, options);
  });

// 推送管理
adminCmd
  .command('push:test')
  .description('测试企微推送')
  .action(async () => {
    await require('../commands/admin/push').test();
  });

adminCmd
  .command('push:send <id>')
  .description('手动推送标讯')
  .action(async (id) => {
    await require('../commands/admin/push').send(id);
  });

adminCmd
  .command('push:batch')
  .description('批量推送新匹配')
  .action(async () => {
    await require('../commands/admin/push').batch();
  });

// 用户管理
adminCmd
  .command('user:list')
  .description('列出用户')
  .option('--json', 'JSON 格式输出')
  .action(async (options) => {
    await require('../commands/admin/user').list(options);
  });

adminCmd
  .command('user:add')
  .description('新增用户')
  .requiredOption('--email <email>', '邮箱')
  .requiredOption('--password <password>', '密码')
  .option('--role <role>', '角色 (admin/viewer)', 'viewer')
  .option('--json', 'JSON 格式输出')
  .action(async (options) => {
    await require('../commands/admin/user').add(options);
  });

adminCmd
  .command('user:role <id>')
  .description('修改用户角色')
  .requiredOption('--role <role>', '角色 (admin/viewer)')
  .option('--json', 'JSON 格式输出')
  .action(async (id, options) => {
    await require('../commands/admin/user').role(id, options);
  });

// 系统统计
adminCmd
  .command('stats')
  .description('查看系统统计')
  .option('--json', 'JSON 格式输出')
  .action(async (options) => {
    await require('../commands/admin/stats').execute(options);
  });

// 完整流程
adminCmd
  .command('pipeline')
  .description('运行完整处理流程')
  .action(async () => {
    await require('../commands/admin/pipeline').execute();
  });

// 解析命令

// 系统配置
adminCmd
  .command('config:list')
  .description('查看系统配置')
  .option('--json', 'JSON 格式输出')
  .action(async (options) => {
    await require('../commands/admin/config').list(options);
  });

adminCmd
  .command('config:get <key>')
  .description('获取单个配置')
  .option('--json', 'JSON 格式输出')
  .action(async (key, options) => {
    await require('../commands/admin/config').get(key, options);
  });

adminCmd
  .command('config:set <key> <value>')
  .description('更新配置')
  .option('--desc <description>', '配置说明')
  .option('--json', 'JSON 格式输出')
  .action(async (key, value, options) => {
    await require('../commands/admin/config').set(key, value, options);
  });

adminCmd
  .command('config:push-schedule <cron>')
  .description('设置推送时间 (cron 表达式，如 "0 9,14 * * *")')
  .action(async (cron) => {
    await require('../commands/admin/config').setPushSchedule(cron);
  });

adminCmd
  .command('config:webhook <url>')
  .description('设置企微 Webhook 地址')
  .action(async (url) => {
    await require('../commands/admin/config').setWebhook(url);
  });

adminCmd
  .command('config:push-toggle <on|off>')
  .description('开关推送')
  .action(async (val) => {
    await require('../commands/admin/config').togglePush(val);
  });

// 解析命令
program.parse();
