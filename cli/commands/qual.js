/**
 * 资质命令 — qual list / qual add / qual update / qual delete / qual images / qual upload / qual ocr / qual primary / qual delete-image
 */
const fs = require('fs');
const path = require('path');
const { table, error, success } = require('../format');

function register(program, api) {
  const qual = program.command('qual').description('资质管理 (admin)');

  qual
    .command('list')
    .description('查看资质列表')
    .option('--type <type>', '类型筛选: company / personnel')
    .action(async (opts) => {
      try {
        const type = opts.type || 'company';
        const res = await api.get(`/api/qualifications/${type}`);
        const quals = res.data || res || [];

        if (program.opts().json) {
          success(quals, true);
        } else {
          const cols = type === 'company'
            ? [
                { key: 'id', label: 'ID', maxWidth: 6 },
                { key: 'qual_type', label: '类型', maxWidth: 15 },
                { key: 'qual_name', label: '名称', maxWidth: 30 },
                { key: 'qual_level', label: '等级', maxWidth: 10 },
                { key: 'cert_number', label: '证书编号', maxWidth: 20 },
                { key: 'expiry_date', label: '到期日', maxWidth: 12 },
              ]
            : [
                { key: 'id', label: 'ID', maxWidth: 6 },
                { key: 'person_name', label: '姓名', maxWidth: 10 },
                { key: 'qual_type', label: '类型', maxWidth: 15 },
                { key: 'qual_name', label: '证书名称', maxWidth: 30 },
                { key: 'cert_number', label: '证书编号', maxWidth: 20 },
                { key: 'expiry_date', label: '到期日', maxWidth: 12 },
              ];
          table(quals, cols);
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  qual
    .command('add')
    .description('添加资质')
    .option('--kind <kind>', '类别: company / personnel', 'company')
    .requiredOption('--type <type>', '资质类型 (如 ISO9001 / PMP)')
    .requiredOption('--name <name>', '资质/证书名称')
    .option('--level <level>', '等级')
    .option('--cert <cert>', '证书编号')
    .option('--expiry <date>', '到期日 (YYYY-MM-DD)')
    .option('--issue <date>', '发证日期 (YYYY-MM-DD)')
    .option('--issuer <issuer>', '发证机关')
    .option('--scope <scope>', '覆盖范围')
    .option('--person <name>', '人员姓名 (kind=personnel 时必填)')
    .action(async (opts) => {
      try {
        const kind = opts.kind;
        const body = {
          qual_type: opts.type,
          qual_name: opts.name,
          qual_level: opts.level || null,
          cert_number: opts.cert || null,
          expiry_date: opts.expiry || null,
          issue_date: opts.issue || null,
          issuing_body: opts.issuer || null,
          scope: opts.scope || null,
        };
        if (kind === 'personnel') {
          body.person_name = opts.person || opts.name;
        }
        const res = await api.post(`/api/qualifications/${kind}`, body);
        const id = res.id || res.data?.id || '?';

        if (program.opts().json) {
          success({ id, ...res }, true);
        } else {
          console.log(`\n  已添加${kind === 'company' ? '公司' : '人员'}资质: ${opts.name} (ID: ${id})`);
          console.log('');
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  qual
    .command('update <id>')
    .description('更新资质')
    .option('--kind <kind>', '类别: company / personnel', 'company')
    .option('--name <name>', '资质名称')
    .option('--level <level>', '等级')
    .option('--cert <cert>', '证书编号')
    .option('--expiry <date>', '到期日')
    .option('--issuer <issuer>', '发证机关')
    .option('--scope <scope>', '覆盖范围')
    .action(async (id, opts) => {
      try {
        const body = {};
        if (opts.name) body.qual_name = opts.name;
        if (opts.level) body.qual_level = opts.level;
        if (opts.cert) body.cert_number = opts.cert;
        if (opts.expiry) body.expiry_date = opts.expiry;
        if (opts.issuer) body.issuing_body = opts.issuer;
        if (opts.scope) body.scope = opts.scope;

        await api.put(`/api/qualifications/${opts.kind}/${id}`, body);

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
    .option('--kind <kind>', '类别: company / personnel', 'company')
    .action(async (id, opts) => {
      try {
        await api.del(`/api/qualifications/${opts.kind}/${id}`);

        if (program.opts().json) {
          success({ id, deleted: true }, true);
        } else {
          console.log(`\n  已删除资质 ID: ${id}`);
          console.log('');
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  // ── 资质图片管理 ─────────────────────────────────────

  qual
    .command('images <type> <id>')
    .description('查看资质图片列表')
    .action(async (type, id) => {
      try {
        const res = await api.get(`/api/qual-images/${type}/${id}`);
        const images = res.data || res || [];

        if (program.opts().json) {
          success(images, true);
        } else {
          table(images, [
            { key: 'id', label: 'ID', maxWidth: 6 },
            { key: 'image_name', label: '文件名', maxWidth: 30 },
            { key: 'is_primary', label: '主图', maxWidth: 6 },
            { key: 'file_size', label: '大小', maxWidth: 10 },
            { key: 'mime_type', label: '格式', maxWidth: 15 },
            { key: 'created_at', label: '上传时间', maxWidth: 20 },
          ]);
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  qual
    .command('upload <type> <id> <file>')
    .description('上传资质图片')
    .option('--primary', '设为主图')
    .action(async (type, id, file, opts) => {
      try {
        const filePath = path.resolve(file);
        if (!fs.existsSync(filePath)) {
          error(`文件不存在: ${filePath}`, program.opts().json);
          return;
        }

        const FormData = require('form-data');
        const fileName = path.basename(filePath);
        const form = new FormData();
        form.append('image', fs.createReadStream(filePath), fileName);
        form.append('is_primary', opts.primary ? 'true' : 'false');

        const res = await api.postForm(`/api/qual-images/${type}/${id}`, form);

        if (program.opts().json) {
          success(res, true);
        } else {
          console.log(`\n  已上传图片: ${fileName} → ${type}/${id}`);
          console.log('');
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  qual
    .command('ocr <image_url>')
    .description('AI 识别资质图片')
    .option('--type <type>', '资质类型 (company / personnel)', 'company')
    .action(async (imageUrl, opts) => {
      try {
        const res = await api.post('/api/qual-images/ocr', {
          image_url: imageUrl,
          qual_type: opts.type,
        });

        if (program.opts().json) {
          success(res.data || res, true);
        } else {
          const data = res.data || res;
          console.log('\n  AI 识别结果:');
          console.log('  ─────────────────────────');
          for (const [key, value] of Object.entries(data)) {
            if (value) console.log(`  ${key}: ${value}`);
          }
          console.log('');
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  qual
    .command('primary <image_id>')
    .description('设为主图')
    .action(async (imageId) => {
      try {
        await api.put(`/api/qual-images/${imageId}`, { is_primary: true });

        if (program.opts().json) {
          success({ imageId, is_primary: true }, true);
        } else {
          console.log(`\n  已将图片 ${imageId} 设为主图`);
          console.log('');
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  qual
    .command('delete-image <image_id>')
    .description('删除资质图片')
    .action(async (imageId) => {
      try {
        await api.del(`/api/qual-images/${imageId}`);

        if (program.opts().json) {
          success({ imageId, deleted: true }, true);
        } else {
          console.log(`\n  已删除图片 ID: ${imageId}`);
          console.log('');
        }
      } catch (e) { error(e.message, program.opts().json); }
    });
}

module.exports = { register };

  // ── 资质到期预警 (B6) ─────────────────────────────────────

  qual
    .command('warning')
    .description('查看即将到期的资质')
    .option('--days <days>', '预警天数', '30')
    .option('--push', '手动触发预警推送')
    .action(async (opts) => {
      try {
        if (opts.push) {
          const res = await api.post('/api/admin/qual-warning/push');
          if (program.opts().json) {
            success(res.data || res, true);
          } else {
            const data = res.data || res;
            console.log('\n  预警推送结果:');
            console.log('  ─────────────────────────');
            console.log(`  总计: ${data.total} 项`);
            console.log(`  已推送: ${data.pushed} 项`);
            console.log(`  公司资质: ${data.company || 0} 项`);
            console.log(`  人员资质: ${data.personnel || 0} 项`);
            console.log('');
          }
        } else {
          const res = await api.get(`/api/admin/qual-warning?days=${opts.days}`);
          const data = res.data || res;

          if (program.opts().json) {
            success(data, true);
          } else {
            console.log(`\n  资质到期预警 (${opts.days}天内):`);
            console.log('  ─────────────────────────');

            if (data.companyQuals?.length > 0) {
              console.log('\n  🏢 公司资质:');
              table(data.companyQuals, [
                { key: 'qual_name', label: '资质名称', maxWidth: 30 },
                { key: 'cert_number', label: '证书编号', maxWidth: 20 },
                { key: 'expiry_date', label: '到期日', maxWidth: 12 },
                { key: 'days_remaining', label: '剩余天数', maxWidth: 10 },
              ]);
            }

            if (data.personnelQuals?.length > 0) {
              console.log('\n  👤 人员资质:');
              table(data.personnelQuals, [
                { key: 'person_name', label: '姓名', maxWidth: 10 },
                { key: 'qual_name', label: '资质名称', maxWidth: 30 },
                { key: 'expiry_date', label: '到期日', maxWidth: 12 },
                { key: 'days_remaining', label: '剩余天数', maxWidth: 10 },
              ]);
            }

            if (data.total === 0) {
              console.log('\n  ✅ 没有即将到期的资质');
            }
            console.log('');
          }
        }
      } catch (e) { error(e.message, program.opts().json); }
    });
