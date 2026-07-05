/**
 * 关键词命令 — keyword stats / keyword report / keyword tune
 */
const { table, error, success } = require('../format');

function register(program, api) {
  const kw = program.command('keyword').description('关键词管理 (admin)');

  kw
    .command('stats')
    .description('关键词效果统计')
    .action(async () => {
      try {
        const res = await api.get('/api/admin/keyword-stats');
        const stats = res.data || res || [];

        if (program.opts().json) {
          success(stats, true);
        } else {
          table(stats, [
            { key: 'keyword_group', label: '关键词组', maxWidth: 20 },
            { key: 'total_hits', label: '命中', maxWidth: 8 },
            { key: 'effective_count', label: '有效', maxWidth: 8 },
            { key: 'effective_rate', label: '有效率', maxWidth: 8 },
            { key: 'strong_count', label: '强推', maxWidth: 6 },
            { key: 'yes_count', label: '可投', maxWidth: 6 },
          ]);
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  kw
    .command('report')
    .description('生成关键词报告并推送企微')
    .action(async () => {
      try {
        const res = await api.post('/api/admin/keyword-report');

        if (program.opts().json) {
          success(res, true);
        } else {
          console.log('\n  关键词报告已生成并推送到企微群');
          console.log('');
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  kw
    .command('tune')
    .description('查看/应用调优建议')
    .option('--apply', '应用调优建议')
    .action(async (opts) => {
      try {
        if (opts.apply) {
          const res = await api.post('/api/admin/keyword-tuner/apply');
          if (program.opts().json) {
            success(res, true);
          } else {
            console.log('\n  调优建议已应用');
            console.log('');
          }
        } else {
          const res = await api.get('/api/admin/keyword-tuner');
          const suggestions = res.data || res || [];

          if (program.opts().json) {
            success(suggestions, true);
          } else {
            console.log('\n  调优建议:');
            if (Array.isArray(suggestions)) {
              for (const s of suggestions) {
                console.log(`    ${s.type}: ${s.group} → ${s.action || s.reason || ''}`);
              }
            } else {
              console.log(JSON.stringify(suggestions, null, 4));
            }
            console.log('');
          }
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  kw
    .command('strategy')
    .description('查看关键词策略配置')
    .action(async () => {
      try {
        const res = await api.get('/api/admin/keyword-strategy');

        if (program.opts().json) {
          success(res, true);
        } else {
          console.log('\n  关键词策略:');
          console.log(JSON.stringify(res.data || res, null, 4));
          console.log('');
        }
      } catch (e) { error(e.message, program.opts().json); }
    });
}

module.exports = { register };
