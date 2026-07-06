/**
 * 邮件服务 — 基于 SMTP (nodemailer)
 * 文档: https://nodemailer.com
 */
const nodemailer = require('nodemailer');
const { getConfig } = require('./config-reader');

let transporter = null;

/**
 * 获取 SMTP transporter（懒加载）
 */
async function getTransporter() {
  if (transporter) return transporter;

  const host = await getConfig('email.smtp_host', process.env.SMTP_HOST || 'smtp.yunyou.top');
  const port = Number(await getConfig('email.smtp_port', process.env.SMTP_PORT || '465'));
  const secure = port === 465; // 465 端口用 SSL
  const user = await getConfig('email.smtp_user', process.env.SMTP_USER);
  const pass = await getConfig('email.smtp_pass', process.env.SMTP_PASS);

  if (!user || !pass) {
    console.warn('[email] SMTP 账号或密码未配置，邮件功能不可用');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return transporter;
}

/**
 * 获取发件人地址
 */
async function getFromAddress() {
  return await getConfig('email.from_address', process.env.SMTP_USER || 'noreply@leadcom.chat');
}

/**
 * 发送邮件
 * @param {Object} options
 * @param {string} options.to - 收件人
 * @param {string} options.subject - 主题
 * @param {string} options.html - HTML 内容
 * @param {string} [options.text] - 纯文本内容（可选）
 */
async function sendEmail({ to, subject, html, text }) {
  const transport = await getTransporter();
  if (!transport) {
    console.warn('[email] 邮件服务未启用，跳过发送');
    return { success: false, error: '邮件服务未配置' };
  }

  const from = await getFromAddress();

  try {
    const info = await transport.sendMail({
      from,
      to,
      subject,
      html,
      text: text || subject,
    });

    console.log('[email] 邮件已发送:', info.messageId);
    return { success: true, id: info.messageId };
  } catch (err) {
    console.error('[email] 发送异常:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 发送欢迎邮件（用户创建时）
 */
async function sendWelcomeEmail(email, password, role) {
  const roleNames = {
    admin: '管理员',
    hr: '人事',
    presales: '售前',
    sales: '销售',
  };

  const subject = '欢迎加入客户雷达系统';
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4f46e5;">欢迎加入客户雷达</h2>
      <p>您好，</p>
      <p>您已被添加为客户雷达系统的用户。以下是您的登录信息：</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 8px 0;"><strong>登录邮箱：</strong>${email}</p>
        <p style="margin: 8px 0;"><strong>初始密码：</strong>${password}</p>
        <p style="margin: 8px 0;"><strong>角色：</strong>${roleNames[role] || role}</p>
      </div>
      <p>请登录后及时修改密码。</p>
      <a href="${await getConfig('app.url', process.env.APP_URL || 'http://localhost:5173')}/login"
         style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">
        立即登录
      </a>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
        此邮件由系统自动发送，请勿回复。
      </p>
    </div>
  `;

  return sendEmail({ to: email, subject, html });
}

/**
 * 发送密码重置邮件
 */
async function sendPasswordResetEmail(email, resetLink) {
  const subject = '密码重置 - 客户雷达';
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4f46e5;">密码重置</h2>
      <p>您好，</p>
      <p>我们收到了您的密码重置请求。点击以下链接重置密码：</p>
      <a href="${resetLink}"
         style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">
        重置密码
      </a>
      <p style="color: #94a3b8; font-size: 12px;">
        此链接有效期为 1 小时。如果您没有请求重置密码，请忽略此邮件。
      </p>
    </div>
  `;

  return sendEmail({ to: email, subject, html });
}

/**
 * 发送邮箱变更确认邮件
 */
async function sendEmailChangeConfirmation(oldEmail, newEmail) {
  const subject = '邮箱已变更 - 客户雷达';
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4f46e5;">邮箱变更通知</h2>
      <p>您好，</p>
      <p>您的登录邮箱已从 <strong>${oldEmail}</strong> 变更为 <strong>${newEmail}</strong>。</p>
      <p>请使用新邮箱登录系统。</p>
      <a href="${await getConfig('app.url', process.env.APP_URL || 'http://localhost:5173')}/login"
         style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">
        立即登录
      </a>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
        如果您没有进行此操作，请立即联系管理员。
      </p>
    </div>
  `;

  return sendEmail({ to: newEmail, subject, html });
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendEmailChangeConfirmation,
};
