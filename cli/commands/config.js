/**
 * 配置命令 — config list / config get / config set
 */
const { error, success } = require('../format');

function register(program, api) {
  const config = program.command('config').description('系统配置 (admin)');

  config
    .command('list')
    .description('查看所有配置')
    .action(async () => {
      try {
        const res = await api.get('/api/config');
        const configs = res.data || res || [];

        if (program.opts().json) {
          success(configs, true);
        } else {
          console.log('\n  系统配置:');
          for (const c of configs) {
            const val = typeof c.value === 'object' ? JSON.stringify(c.value) : String(c.value);
            console.log(`    ${c.key} = ${val.slice(0, 80)}`);
          }
          console.log('');
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  config
    .command('get <key>')
    .description('获取配置值')
    .action(async (key) => {
      try {
        const res = await api.get(`/api/config/${key}`);
        const c = res.data || res;

        if (program.opts().json) {
          success(c, true);
        } else {
          const val = typeof c.value === 'object' ? JSON.stringify(c.value, null, 2) : String(c.value);
          console.log(`\n  ${c.key} = ${val}`);
          if (c.description) console.log(`  # ${c.description}`);
          console.log('');
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  config
    .command('set <key> <value>')
    .description('设置配置值')
    .action(async (key, value) => {
      try {
        // 尝试解析JSON值
        let parsedValue;
        try {
          parsedValue = JSON.parse(value);
        } catch {
          parsedValue = value;
        }

        const res = await api.put(`/api/config/${key}`, { value: parsedValue });

        if (program.opts().json) {
          success(res, true);
        } else {
          console.log(`\n  已设置: ${key} = ${value}`);
          console.log('');
        }
      } catch (e) { error(e.message, program.opts().json); }
    });
}

module.exports = { register };
