/**
 * 用户管理命令
 */
const { Command } = require('commander');
const { apiClient } = require('../api');

const user = new Command('user').description('用户管理 (admin)');

user
  .command('list')
  .description('查看用户列表')
  .action(async () => {
    try {
      const res = await apiClient.get('/admin/users');
      if (!res.success) { console.error('❌ 获取用户列表失败'); return; }

      const users = res.data || [];
      console.log(`👥 用户列表 (${users.length} 个):`);
      console.log('─'.repeat(80));
      console.log('邮箱'.padEnd(30), '角色'.padEnd(10), '最后登录');
      console.log('─'.repeat(80));
      users.forEach(u => {
        const lastLogin = u.last_sign_in_at
          ? new Date(u.last_sign_in_at).toLocaleString('zh-CN')
          : '从未登录';
        console.log(u.email.padEnd(30), u.role.padEnd(10), lastLogin);
      });
    } catch (err) {
      console.error('❌ 错误:', err.message);
    }
  });

user
  .command('add')
  .description('新增用户')
  .requiredOption('--email <email>', '邮箱')
  .requiredOption('--password <password>', '密码')
  .option('--role <role>', '角色 (admin/hr/presales/sales)', 'sales')
  .action(async (opts) => {
    try {
      const res = await apiClient.post('/admin/users', {
        email: opts.email,
        password: opts.password,
        role: opts.role,
      });
      if (res.success) {
        console.log('✅ 用户已创建');
        console.log('  ID:', res.data.id);
        console.log('  邮箱:', res.data.email);
        console.log('  角色:', res.data.role);
      } else {
        console.error('❌ 创建失败:', res.error);
      }
    } catch (err) {
      console.error('❌ 错误:', err.message);
    }
  });

user
  .command('delete')
  .description('删除用户')
  .requiredOption('--id <id>', '用户ID')
  .action(async (opts) => {
    try {
      const res = await apiClient.delete(`/admin/users/${opts.id}`);
      if (res.success) {
        console.log('✅ 用户已删除');
      } else {
        console.error('❌ 删除失败:', res.error);
      }
    } catch (err) {
      console.error('❌ 错误:', err.message);
    }
  });

user
  .command('reset-password')
  .description('重置用户密码')
  .requiredOption('--id <id>', '用户ID')
  .requiredOption('--password <password>', '新密码')
  .action(async (opts) => {
    try {
      const res = await apiClient.post(`/admin/users/${opts.id}/reset-password`, {
        password: opts.password,
      });
      if (res.success) {
        console.log('✅ 密码已重置');
      } else {
        console.error('❌ 重置失败:', res.error);
      }
    } catch (err) {
      console.error('❌ 错误:', err.message);
    }
  });

user
  .command('update')
  .description('更新用户信息')
  .requiredOption('--id <id>', '用户ID')
  .option('--email <email>', '新邮箱')
  .option('--password <password>', '新密码')
  .action(async (opts) => {
    try {
      const body = {};
      if (opts.email) body.email = opts.email;
      if (opts.password) body.password = opts.password;

      if (Object.keys(body).length === 0) {
        console.error('❌ 请指定要更新的字段 (--email 或 --password)');
        return;
      }

      const res = await apiClient.put(`/admin/users/${opts.id}`, body);
      if (res.success) {
        console.log('✅ 用户已更新');
        console.log('  邮箱:', res.data.email);
      } else {
        console.error('❌ 更新失败:', res.error);
      }
    } catch (err) {
      console.error('❌ 错误:', err.message);
    }
  });

module.exports = user;
