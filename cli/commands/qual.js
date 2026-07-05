/**
 * 资质命令 — qual list / qual add / qual update / qual delete
 */
const { table, error, success } = require('../format');

function register(program, api) {
  const qual = program.command('qual').description('资质管理 (admin)');

  qual
    .command('list')
    .description('查看资质列表')
    .option('--type <type>', '资质类型筛选')
    .action(async (opts) => {
      try {
        const params = new URLSearchParams();
        if (opts.type) params.set('qual_type', opts.type);
        const res = await api.get(`/api/qualifications?${params}`);
        const quals = res.data || res || [];

        if (program.opts().json) {
          success(quals, true);
        } else {
          table(quals, [
            { key: 'id', label: 'ID', maxWidth: 6 },
            { key: 'qual_type', label: '类型', maxWidth: 15 },
            { key: 'qual_name', label: '名称', maxWidth: 30 },
            { key: 'qual_level', label: '等级', maxWidth: 10 },
            { key: 'cert_number', label: '证书编号', maxWidth: 20 },
            { key: 'expiry_date', label: '到期日', maxWidth: 12 },
            { key: 'is_active', label: '有效', maxWidth: 6 },
          ]);
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  qual
    .command('add')
    .description('添加资质')
    .requiredOption('--type <type>', '资质类型')
    .requiredOption('--name <name>', '资质名称')
    .option('--level <level>', '等级')
    .option('--cert <cert>', '证书编号')
    .option('--expiry <date>', '到期日 (YYYY-MM-DD)')
    .option('--scope <scope>', '覆盖范围')
    .action(async (opts) => {
      try {
        const body = {
          qual_type: opts.type,
          qual_name: opts.name,
          qual_level: opts.level || null,
          cert_number: opts.cert || null,
          expiry_date: opts.expiry || null,
          scope: opts.scope || null,
        };
        const res = await api.post('/api/qualifications', body);

        if (program.opts().json) {
          success(res, true);
        } else {
          console.log(`\n  已添加资质: ${opts.name} (ID: ${res.id || res.data?.id || '?'})`);
          console.log('');
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  qual
    .command('update <id>')
    .description('更新资质')
    .option('--name <name>', '资质名称')
    .option('--level <level>', '等级')
    .option('--cert <cert>', '证书编号')
    .option('--expiry <date>', '到期日')
    .option('--active <bool>', '是否有效 (true/false)')
    .action(async (id, opts) => {
      try {
        const body = {};
        if (opts.name) body.qual_name = opts.name;
        if (opts.level) body.qual_level = opts.level;
        if (opts.cert) body.cert_number = opts.cert;
        if (opts.expiry) body.expiry_date = opts.expiry;
        if (opts.active !== undefined) body.is_active = opts.active === 'true';

        await api.put(`/api/qualifications/${id}`, body);

        if (program.opts().json) {
          success({ id, updated: true }, true);
        } else {
          console.log(`\n  已更新资质 ID: ${id}`);
          console.log('');
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  qual
    .command('delete <id>')
    .description('删除资质')
    .action(async (id) => {
      try {
        await api.del(`/api/qualifications/${id}`);

        if (program.opts().json) {
          success({ id, deleted: true }, true);
        } else {
          console.log(`\n  已删除资质 ID: ${id}`);
          console.log('');
        }
      } catch (e) { error(e.message, program.opts().json); }
    });
}

module.exports = { register };
