/**
 * 邮件服务管理命令
 */
const { Command } = require('commander');
const { apiClient } = require('../api');

const email = new Command('email').description('邮件服务管理 (admin)');

email
  .command('test')
  .description('发送测试邮件')
  .requiredOption('--to <email>', '收件人邮箱')
  .action(async (opts) => {
    try {
      const res = await apiClient.post('/admin/email/test', { to: opts.to });
      if (res.success) {
        console.log('✅ 测试邮件已发送');
        if (res.data?.id) console.log('  邮件ID:', res.data.id);
      } else {
        console.error('❌ 发送失败:', res.error);
      }
    } catch (err) {
      console.error('❌ 错误:', err.message);
    }
  });

email
  .command('config')
  .description('查看邮件配置')
  .action(async () => {
    try {
      const res = await apiClient.get('/config');
      if (!res.success) { console.error('❌ 获取配置失败'); return; }

      const config = res.data;
      console.log('📧 邮件服务配置:');
      console.log('  SMTP 服务器:', config['email.smtp_host']?.value || '未配置');
      console.log('  端口:', config['email.smtp_port']?.value || '未配置');
      console.log('  账号:', config['email.smtp_user']?.value || '未配置');
      console.log('  密码:', config['email.smtp_pass']?.value ? '已配置' : '未配置');
      console.log('  发件人:', config['email.from_address']?.value || '未配置');
    } catch (err) {
      console.error('❌ 错误:', err.message);
    }
  });

module.exports = email;
