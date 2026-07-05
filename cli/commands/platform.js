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
}

module.exports = { register };
