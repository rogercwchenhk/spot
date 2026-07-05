/**
 * 合同命令 — contract list / contract add
 */
const { table, error, success } = require('../format');

function register(program, api) {
  const contract = program.command('contract').description('合同管理 (admin)');

  contract
    .command('list')
    .description('查看合同列表')
    .option('--service <type>', '服务类型筛选')
    .action(async (opts) => {
      try {
        const params = new URLSearchParams();
        if (opts.service) params.set('service_type', opts.service);
        const res = await api.get(`/api/contracts?${params}`);
        const contracts = res.data || res || [];

        if (program.opts().json) {
          success(contracts, true);
        } else {
          table(contracts, [
            { key: 'id', label: 'ID', maxWidth: 6 },
            { key: 'project_name', label: '项目名称', maxWidth: 35 },
            { key: 'client_name', label: '客户', maxWidth: 20 },
            { key: 'service_type', label: '服务类型', maxWidth: 12 },
            { key: 'amount', label: '金额(万)', maxWidth: 10 },
            { key: 'industry', label: '行业', maxWidth: 10 },
            { key: 'start_date', label: '开始', maxWidth: 12 },
          ]);
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  contract
    .command('add')
    .description('添加合同')
    .requiredOption('--name <name>', '项目名称')
    .requiredOption('--client <client>', '客户名称')
    .option('--service <type>', '服务类型')
    .option('--amount <amount>', '金额(万)')
    .option('--industry <industry>', '行业')
    .option('--region <region>', '地区')
    .option('--start <date>', '开始日期')
    .option('--end <date>', '结束日期')
    .option('--keywords <keywords>', '技术关键词(逗号分隔)')
    .action(async (opts) => {
      try {
        const body = {
          project_name: opts.name,
          client_name: opts.client,
          service_type: opts.service || null,
          amount: opts.amount ? Number(opts.amount) : null,
          industry: opts.industry || null,
          region: opts.region || null,
          start_date: opts.start || null,
          end_date: opts.end || null,
          tech_keywords: opts.keywords ? opts.keywords.split(',').map(k => k.trim()) : [],
        };
        const res = await api.post('/api/contracts', body);

        if (program.opts().json) {
          success(res, true);
        } else {
          console.log(`\n  已添加合同: ${opts.name} (ID: ${res.id || res.data?.id || '?'})`);
          console.log('');
        }
      } catch (e) { error(e.message, program.opts().json); }
    });
}

module.exports = { register };
