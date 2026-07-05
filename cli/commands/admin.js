/**
 * 管理命令 — fetch / process / match / download / scoring / push / pipeline
 */
const { error, success } = require('../format');

function register(program, api) {
  // fetch — 手动触发采集
  program
    .command('fetch')
    .description('手动触发知了API采集')
    .option('--keywords <keywords>', '关键词(逗号分隔)', '运维,小型机')
    .option('--province <province>', '省份', '广东')
    .action(async (opts) => {
      try {
        const body = {
          keywords: opts.keywords.split(',').map(k => k.trim()),
          province: opts.province,
        };
        const res = await api.post('/api/admin/notices/fetch', body);

        if (program.opts().json) {
          success(res, true);
        } else {
          console.log(`\n  采集完成:`);
          console.log(`    获取: ${res.fetched || 0}`);
          console.log(`    新增: ${res.inserted || 0}`);
          console.log(`    跳过: ${res.skipped || 0}`);
          console.log('');
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  // process — AI提取
  program
    .command('process [id]')
    .description('AI提取标讯字段')
    .option('--batch', '批量处理待处理标讯')
    .action(async (id, opts) => {
      try {
        let res;
        if (opts.batch) {
          res = await api.post('/api/admin/notices/process-batch');
        } else if (id) {
          res = await api.post(`/api/admin/notices/${id}/process`);
        } else {
          error('请指定标讯ID或使用 --batch', program.opts().json);
          return;
        }

        if (program.opts().json) {
          success(res, true);
        } else {
          console.log(`\n  AI提取完成`);
          if (res.processed) console.log(`    处理: ${res.processed}`);
          if (res.failed) console.log(`    失败: ${res.failed}`);
          console.log('');
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  // match — 计算匹配
  program
    .command('match-calc [noticeId]')
    .description('计算匹配结果')
    .option('--batch', '批量计算待匹配标讯')
    .action(async (noticeId, opts) => {
      try {
        let res;
        if (opts.batch) {
          res = await api.post('/api/admin/match/batch');
        } else if (noticeId) {
          res = await api.post(`/api/admin/match/${noticeId}`);
        } else {
          error('请指定标讯ID或使用 --batch', program.opts().json);
          return;
        }

        if (program.opts().json) {
          success(res, true);
        } else {
          console.log(`\n  匹配计算完成`);
          if (res.calculated) console.log(`    计算: ${res.calculated}`);
          console.log('');
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  // download — 下载招标文件
  program
    .command('download [id]')
    .description('下载招标文件')
    .option('--batch', '批量下载')
    .action(async (id, opts) => {
      try {
        let res;
        if (opts.batch) {
          res = await api.post('/api/admin/notices/download-batch');
        } else if (id) {
          res = await api.post(`/api/admin/notices/${id}/download`);
        } else {
          error('请指定标讯ID或使用 --batch', program.opts().json);
          return;
        }

        if (program.opts().json) {
          success(res, true);
        } else {
          console.log(`\n  下载完成`);
          console.log('');
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  // scoring — 提取评分标准
  program
    .command('scoring [id]')
    .description('提取评分标准')
    .option('--batch', '批量提取')
    .action(async (id, opts) => {
      try {
        let res;
        if (opts.batch) {
          res = await api.post('/api/admin/notices/scoring-batch');
        } else if (id) {
          res = await api.post(`/api/admin/notices/${id}/scoring`);
        } else {
          error('请指定标讯ID或使用 --batch', program.opts().json);
          return;
        }

        if (program.opts().json) {
          success(res, true);
        } else {
          console.log(`\n  评分标准提取完成`);
          console.log('');
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  // push — 推送管理
  program
    .command('push')
    .description('推送管理')
    .option('--test', '测试企微推送')
    .option('--notice <id>', '推送指定标讯')
    .option('--batch', '批量推送新匹配标讯')
    .action(async (opts) => {
      try {
        let res;
        if (opts.test) {
          res = await api.post('/api/admin/push/test');
        } else if (opts.notice) {
          res = await api.post(`/api/admin/push/${opts.notice}`);
        } else if (opts.batch) {
          res = await api.post('/api/admin/push/batch');
        } else {
          error('请指定 --test / --notice <id> / --batch', program.opts().json);
          return;
        }

        if (program.opts().json) {
          success(res, true);
        } else {
          console.log(`\n  推送完成`);
          console.log('');
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  // pipeline — 完整pipeline
  program
    .command('pipeline')
    .description('运行完整pipeline (采集→AI→匹配→推送)')
    .action(async () => {
      try {
        const res = await api.post('/api/admin/pipeline');

        if (program.opts().json) {
          success(res, true);
        } else {
          console.log(`\n  Pipeline完成`);
          console.log('');
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  // stats — 系统统计
  program
    .command('stats')
    .description('系统统计概览')
    .action(async () => {
      try {
        const res = await api.get('/api/admin/stats');
        const stats = res.data || res;

        if (program.opts().json) {
          success(stats, true);
        } else {
          console.log('\n  系统统计:');
          if (stats.total_notices !== undefined) console.log(`    标讯总数: ${stats.total_notices}`);
          if (stats.ai_completed !== undefined) console.log(`    AI完成:   ${stats.ai_completed}`);
          if (stats.matched !== undefined) console.log(`    已匹配:   ${stats.matched}`);
          if (stats.strong !== undefined) console.log(`    强推:     ${stats.strong}`);
          if (stats.yes !== undefined) console.log(`    可投:     ${stats.yes}`);
          console.log('');
        }
      } catch (e) { error(e.message, program.opts().json); }
    });
}

module.exports = { register };
