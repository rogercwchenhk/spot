/**
 * 平台命令 — platform list / platform ready
 */
const { table, error, success } = require('../format');

function register(program, api) {
  const platform = program.command('platform').description('平台管理 (admin)');

  platform
    .command('list')
    .description('查看平台列表')
    .option('--type <type>', '平台类型筛选')
    .option('--region <region>', '地区筛选')
    .action(async (opts) => {
      try {
        const params = new URLSearchParams();
        if (opts.type) params.set('platform_type', opts.type);
        if (opts.region) params.set('region_scope', opts.region);
        const res = await api.get(`/api/platforms?${params}`);
        const platforms = res.data || res || [];

        if (program.opts().json) {
          success(platforms, true);
        } else {
          table(platforms, [
            { key: 'id', label: 'ID', maxWidth: 6 },
            { key: 'platform_name', label: '平台名称', maxWidth: 30 },
            { key: 'platform_type', label: '类型', maxWidth: 12 },
            { key: 'region_scope', label: '地区', maxWidth: 10 },
            { key: 'spider_strategy', label: '爬虫策略', maxWidth: 18 },
            { key: 'is_active', label: '活跃', maxWidth: 6 },
          ]);
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  platform
    .command('ready')
    .description('已配置Scrapling选择器的平台')
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
            { key: 'spider_strategy', label: '策略', maxWidth: 18 },
            { key: 'region_scope', label: '地区', maxWidth: 10 },
          ]);
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  platform
    .command('test')
    .description('测试平台可达性')
    .option('--id <id>', '测试指定平台ID')
    .option('--all', '测试所有已启用平台')
    .action(async (opts) => {
      try {
        const res = await api.get('/api/platforms?pageSize=200');
        let platforms = res.data || res || [];

        if (opts.id) {
          platforms = platforms.filter(p => p.id === Number(opts.id));
        } else if (!opts.all) {
          // 默认只测试前5个
          platforms = platforms.slice(0, 5);
        }

        console.log('测试平台可达性 (' + platforms.length + ' 个)...\n');

        const results = [];
        for (const p of platforms) {
          const url = p.base_url;
          if (!url) {
            results.push({ name: p.platform_name, status: '❌', error: 'URL未配置' });
            continue;
          }

          try {
            const start = Date.now();
            const response = await fetch(url, {
              method: 'GET',
              headers: { 'User-Agent': 'Mozilla/5.0' },
              signal: AbortSignal.timeout(10000),
            });
            const elapsed = Date.now() - start;
            results.push({
              name: p.platform_name,
              status: response.ok ? '✅' : '⚠️',
              code: response.status,
              time: elapsed + 'ms',
            });
          } catch (err) {
            results.push({
              name: p.platform_name,
              status: '❌',
              error: err.message.substring(0, 50),
            });
          }
        }

        // 输出结果
        console.log('测试结果:');
        console.log('─'.repeat(70));
        const successCount = results.filter(r => r.status === '✅').length;
        const failCount = results.filter(r => r.status === '❌').length;
        const warnCount = results.filter(r => r.status === '⚠️').length;
        console.log('总计:', results.length, '| 成功:', successCount, '| 警告:', warnCount, '| 失败:', failCount);
        console.log('─'.repeat(70));
        results.forEach(r => {
          const statusStr = r.status + ' ' + r.name;
          const detail = r.error || (r.code + ' ' + r.time);
          console.log(statusStr.padEnd(40), detail);
        });

        if (program.opts().json) {
          success(results, true);
        }
      } catch (e) { error(e.message, program.opts().json); }
    });
}

module.exports = { register };
