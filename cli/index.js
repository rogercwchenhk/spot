#!/usr/bin/env node
/**
 * Customer Radar CLI (cr)
 * 广东励康标讯情报系统命令行工具
 *
 * 用法:
 *   cr notice list                    # 查看今日标讯
 *   cr notice list --level strong     # 按等级筛选
 *   cr notice get <id>                # 查看详情
 *   cr notice search <keyword>        # 搜索
 *   cr match list                     # 查看匹配结果
 *   cr stats                          # 系统概览
 *
 *   cr admin fetch                    # 手动采集
 *   cr admin process --batch          # AI提取
 *   cr admin match --batch            # 匹配计算
 *   cr admin pipeline                 # 完整pipeline
 *   cr admin crawl run                # Scrapling采集
 *   cr admin keyword stats            # 关键词统计
 *   cr admin config list              # 查看配置
 *   cr admin qual list                # 查看资质
 *   cr admin platform list            # 查看平台
 *
 * 全局选项:
 *   --json       JSON输出（AI Agent模式）
 *   --token      指定API Token
 *   --server     指定后端地址
 */
const { Command } = require('commander');
const CrAPI = require('./api');
const { getToken } = require('./auth');

const program = new Command();

program
  .name('cr')
  .description('客户雷达 — 广东励康标讯情报系统 CLI')
  .version('1.0.0')
  .option('--json', 'JSON输出模式（供AI Agent使用）')
  .option('--token <token>', 'API Token')
  .option('--server <server>', '后端地址', 'http://localhost:3200');

// 初始化API客户端
function getAPI() {
  const opts = program.opts();
  const token = opts.token || getToken();
  return new CrAPI(opts.server, token);
}

// 注册命令模块
const noticeCmd = require('./commands/notice');
const matchCmd = require('./commands/match');
const crawlCmd = require('./commands/crawl');
const keywordCmd = require('./commands/keyword');
const configCmd = require('./commands/config');
const qualCmd = require('./commands/qual');
const contractCmd = require('./commands/contract');
const platformCmd = require('./commands/platform');
const adminCmd = require('./commands/admin');
const emailCmd = require('./commands/email');
const userCmd = require('./commands/user');

const api = getAPI();

// viewer 命令（直接挂在 program 下）
noticeCmd.register(program, api);
matchCmd.register(program, api);

// admin 父命令
const admin = program.command('admin').description('管理命令 (admin)');

// admin 子命令（挂在 admin 下）
crawlCmd.register(admin, api);
keywordCmd.register(admin, api);
configCmd.register(admin, api);
qualCmd.register(admin, api);
contractCmd.register(admin, api);
platformCmd.register(admin, api);
adminCmd.register(admin, api);
admin.addCommand(emailCmd);
admin.addCommand(userCmd);

// stats 命令（viewer级别）
program
  .command('stats')
  .description('系统概览统计')
  .action(async () => {
    try {
      const res = await api.get('/api/admin/stats');
      const stats = res.data || res;

      if (program.opts().json) {
        console.log(JSON.stringify({ success: true, data: stats }, null, 2));
      } else {
        console.log('\n  系统概览:');
        console.log(`    标讯总数:   ${stats.total_notices ?? '-'}`);
        console.log(`    AI完成:     ${stats.ai_completed ?? '-'}`);
        console.log(`    待处理:     ${stats.pending_ai ?? '-'}`);
        console.log(`    已匹配:     ${stats.matched ?? '-'}`);
        console.log(`    ─────────────────`);
        console.log(`    🟢 强推:     ${stats.strong ?? '-'}`);
        console.log(`    🟡 可投:     ${stats.yes ?? '-'}`);
        console.log(`    🔴 风险:     ${stats.risky ?? '-'}`);
        console.log(`    ⚫ 不建议:   ${stats.no ?? '-'}`);
        console.log('');
      }
    } catch (e) {
      if (program.opts().json) {
        console.log(JSON.stringify({ success: false, error: e.message }));
      } else {
        console.error(`\x1b[31mError:\x1b[0m ${e.message}`);
      }
      process.exit(1);
    }
  });

// 解析参数
program.parse();
