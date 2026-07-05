/**
 * 采集命令 — crawl run / crawl runs / crawl platforms
 */
const { table, error, success } = require('../format');

function register(program, api) {
  const crawl = program.command('crawl').description('采集管理 (admin)');

  crawl
    .command('run')
    .description('触发Scrapling采集')
    .option('--platform <id>', '指定平台ID')
    .option('--type <type>', '平台类型过滤')
    .action(async (opts) => {
      try {
        const body = {};
        if (opts.platform) body.platform_id = Number(opts.platform);
        if (opts.type) body.platform_type = opts.type;
        const res = await api.post('/api/crawl/scrapling', body);

        if (program.opts().json) {
          success(res, true);
        } else {
          console.log(`\n  采集完成`);
          console.log(`  平台: ${res.platforms || '-'}`);
          console.log(`  新增: ${res.inserted || 0}`);
          console.log(`  跳过: ${res.skipped || 0}`);
          console.log('');
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  crawl
    .command('runs')
    .description('查看采集记录')
    .option('--source <source>', '数据来源 (scrapling/zhiliao)')
    .option('--status <status>', '状态 (success/failed/running)')
    .option('--limit <n>', '返回条数', '20')
    .action(async (opts) => {
      try {
        const params = new URLSearchParams({ limit: opts.limit });
        if (opts.source) params.set('data_source', opts.source);
        if (opts.status) params.set('status', opts.status);
        const res = await api.get(`/api/crawl/runs?${params}`);
        const runs = (res.data || res || []).map(r => ({
          id: r.id,
          platform: r.platform_id || '-',
          source: r.data_source,
          status: r.status,
          found: r.items_found || 0,
          inserted: r.items_inserted || 0,
          skipped: r.items_skipped || 0,
          duration: r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : '-',
          time: (r.started_at || '').slice(5, 16),
        }));

        if (program.opts().json) {
          success(runs, true);
        } else {
          table(runs, [
            { key: 'id', label: 'ID', maxWidth: 8 },
            { key: 'platform', label: '平台', maxWidth: 8 },
            { key: 'source', label: '来源', maxWidth: 10 },
            { key: 'status', label: '状态', maxWidth: 10 },
            { key: 'found', label: '发现', maxWidth: 6 },
            { key: 'inserted', label: '新增', maxWidth: 6 },
            { key: 'skipped', label: '跳过', maxWidth: 6 },
            { key: 'duration', label: '耗时', maxWidth: 8 },
            { key: 'time', label: '时间', maxWidth: 12 },
          ]);
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  crawl
    .command('stats')
    .description('采集统计概览')
    .action(async () => {
      try {
        const res = await api.get('/api/crawl/stats');

        if (program.opts().json) {
          success(res, true);
        } else {
          console.log('\n  采集统计:');
          const stats = res.data || res;
          if (stats.by_source) {
            for (const [source, data] of Object.entries(stats.by_source)) {
              console.log(`    ${source}: 发现${data.found || 0} 新增${data.inserted || 0}`);
            }
          }
          console.log('');
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  crawl
    .command('platforms')
    .description('已配置Scrapling平台列表')
    .action(async () => {
      try {
        const res = await api.get('/api/crawl/platforms/ready');
        const platforms = res.data || res || [];

        if (program.opts().json) {
          success(platforms, true);
        } else {
          table(platforms, [
            { key: 'id', label: 'ID', maxWidth: 6 },
            { key: 'platform_name', label: '平台名称', maxWidth: 30 },
            { key: 'spider_strategy', label: '策略', maxWidth: 20 },
            { key: 'region_scope', label: '地区', maxWidth: 10 },
          ]);
        }
      } catch (e) { error(e.message, program.opts().json); }
    });
}

module.exports = { register };
