/**
 * 资质到期预警服务 (B6)
 * 检查即将到期的资质并推送预警到企微群
 */
const { supabaseAdmin } = require('../db');
const { getConfig } = require('./config-reader');
const { sendMarkdown } = require('./wecom-notify');
const { createNotification } = require('./notification');

const DEFAULT_WARNING_DAYS = 30;

/**
 * 检查即将到期的资质
 * @param {number} warningDays - 预警天数（默认30天）
 * @returns {Object} { companyQuals: [...], personnelQuals: [...], total: number }
 */
async function checkExpiringQualifications(warningDays = DEFAULT_WARNING_DAYS) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + warningDays * 24 * 60 * 60 * 1000);

  console.log(`[qual-warning] 检查 ${warningDays} 天内到期的资质 (${now.toISOString().split('T')[0]} ~ ${futureDate.toISOString().split('T')[0]})`);

  // 查询公司资质
  const { data: companyQuals, error: companyErr } = await supabaseAdmin
    .from('company_qualification')
    .select('id, qual_type, qual_name, cert_number, expiry_date, issuing_body')
    .eq('is_active', true)
    .not('expiry_date', 'is', null)
    .lte('expiry_date', futureDate.toISOString().split('T')[0])
    .gte('expiry_date', now.toISOString().split('T')[0]);

  if (companyErr) {
    console.error('[qual-warning] 查询公司资质失败:', companyErr.message);
    throw companyErr;
  }

  // 查询人员资质
  const { data: personnelQuals, error: personnelErr } = await supabaseAdmin
    .from('personnel_qualification')
    .select('id, person_name, qual_type, qual_name, cert_number, expiry_date')
    .eq('is_active', true)
    .not('expiry_date', 'is', null)
    .lte('expiry_date', futureDate.toISOString().split('T')[0])
    .gte('expiry_date', now.toISOString().split('T')[0]);

  if (personnelErr) {
    console.error('[qual-warning] 查询人员资质失败:', personnelErr.message);
    throw personnelErr;
  }

  // 计算剩余天数
  const enrichedCompany = (companyQuals || []).map(q => ({
    ...q,
    days_remaining: Math.ceil((new Date(q.expiry_date) - now) / (1000 * 60 * 60 * 24)),
    qual_category: 'company'
  }));

  const enrichedPersonnel = (personnelQuals || []).map(q => ({
    ...q,
    days_remaining: Math.ceil((new Date(q.expiry_date) - now) / (1000 * 60 * 60 * 24)),
    qual_category: 'personnel'
  }));

  return {
    companyQuals: enrichedCompany,
    personnelQuals: enrichedPersonnel,
    total: enrichedCompany.length + enrichedPersonnel.length
  };
}

/**
 * 生成预警报告（Markdown 格式）
 */
function generateWarningReport(warningData) {
  const { companyQuals, personnelQuals, total } = warningData;

  if (total === 0) {
    return null; // 无预警，不推送
  }

  let report = `## ⚠️ 资质到期预警\n\n`;
  report += `共 ${total} 项资质即将到期，请及时处理！\n\n`;

  // 按剩余天数排序
  const sortByDays = (a, b) => a.days_remaining - b.days_remaining;

  // 公司资质
  if (companyQuals.length > 0) {
    report += `### 🏢 公司资质 (${companyQuals.length}项)\n\n`;
    report += `| 资质名称 | 证书编号 | 到期日 | 剩余天数 |\n`;
    report += `|----------|----------|--------|----------|\n`;

    companyQuals.sort(sortByDays).forEach(q => {
      const urgency = q.days_remaining <= 7 ? '🔴' : q.days_remaining <= 14 ? '🟡' : '🟢';
      const expiryDate = new Date(q.expiry_date).toLocaleDateString('zh-CN');
      report += `| ${q.qual_name} | ${q.cert_number || '-'} | ${expiryDate} | ${urgency} ${q.days_remaining}天 |\n`;
    });
    report += '\n';
  }

  // 人员资质
  if (personnelQuals.length > 0) {
    report += `### 👤 人员资质 (${personnelQuals.length}项)\n\n`;
    report += `| 姓名 | 资质类型 | 到期日 | 剩余天数 |\n`;
    report += `|------|----------|--------|----------|\n`;

    personnelQuals.sort(sortByDays).forEach(q => {
      const urgency = q.days_remaining <= 7 ? '🔴' : q.days_remaining <= 14 ? '🟡' : '🟢';
      const expiryDate = new Date(q.expiry_date).toLocaleDateString('zh-CN');
      report += `| ${q.person_name} | ${q.qual_name} | ${expiryDate} | ${urgency} ${q.days_remaining}天 |\n`;
    });
    report += '\n';
  }

  report += `> 请尽快安排续期或更新资质`;

  return report;
}

/**
 * 记录预警历史（避免重复推送）
 */
async function recordWarningHistory(qualType, qualId, qualName, expiryDate, daysRemaining) {
  const { error } = await supabaseAdmin
    .from('qual_warning_history')
    .upsert({
      qual_type: qualType,
      qual_id: qualId,
      qual_name: qualName,
      expiry_date: expiryDate,
      days_remaining: daysRemaining,
      pushed_date: new Date().toISOString().split('T')[0]
    }, { onConflict: 'qual_type,qual_id,pushed_date' });

  if (error) {
    console.error('[qual-warning] 记录预警历史失败:', error.message);
  }
}

/**
 * 检查今天是否已推送过该资质的预警
 */
async function isAlreadyPushedToday(qualType, qualId) {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabaseAdmin
    .from('qual_warning_history')
    .select('id')
    .eq('qual_type', qualType)
    .eq('qual_id', qualId)
    .eq('pushed_date', today)
    .maybeSingle();

  return !!data;
}

/**
 * 执行资质到期预警检查与推送
 */
async function runQualWarning() {
  console.log('[qual-warning] 开始资质到期预警检查...');

  // 检查是否启用
  const enabled = await getConfig('qual.warning_enabled', true);
  if (!enabled) {
    console.log('[qual-warning] 预警功能已禁用');
    return { success: false, reason: 'disabled' };
  }

  // 获取预警天数配置
  const warningDays = await getConfig('qual.warning_days', DEFAULT_WARNING_DAYS);

  try {
    // 检查即将到期的资质
    const warningData = await checkExpiringQualifications(warningDays);

    if (warningData.total === 0) {
      console.log('[qual-warning] 没有即将到期的资质');
      return { success: true, total: 0, pushed: 0 };
    }

    console.log(`[qual-warning] 发现 ${warningData.total} 项即将到期的资质`);

    // 过滤今天已推送过的
    const companyToPush = [];
    for (const q of warningData.companyQuals) {
      if (!(await isAlreadyPushedToday('company', q.id))) {
        companyToPush.push(q);
      }
    }

    const personnelToPush = [];
    for (const q of warningData.personnelQuals) {
      if (!(await isAlreadyPushedToday('personnel', q.id))) {
        personnelToPush.push(q);
      }
    }

    if (companyToPush.length === 0 && personnelToPush.length === 0) {
      console.log('[qual-warning] 今天已全部推送过，跳过');
      return { success: true, total: warningData.total, pushed: 0 };
    }

    // 生成报告
    const report = generateWarningReport({
      companyQuals: companyToPush,
      personnelQuals: personnelToPush,
      total: companyToPush.length + personnelToPush.length
    });

    // 推送到企微
    const pushResult = await sendMarkdown(report);

    if (pushResult.success) {
      console.log('[qual-warning] 预警推送成功');

      // 记录推送历史
      for (const q of companyToPush) {
        await recordWarningHistory('company', q.id, q.qual_name, q.expiry_date, q.days_remaining);
      }
      for (const q of personnelToPush) {
        await recordWarningHistory('personnel', q.id, q.qual_name, q.expiry_date, q.days_remaining);
      }

      // 创建系统通知
      await createNotification(
        'qual_warning',
        `资质到期预警：${companyToPush.length + personnelToPush.length}项`,
        report.substring(0, 200) + '...',
        '/qualifications'
      );
    } else {
      console.error('[qual-warning] 预警推送失败:', pushResult.error);
    }

    return {
      success: pushResult.success,
      total: warningData.total,
      pushed: companyToPush.length + personnelToPush.length,
      company: companyToPush.length,
      personnel: personnelToPush.length
    };
  } catch (err) {
    console.error('[qual-warning] 预警检查失败:', err.message);
    throw err;
  }
}

module.exports = {
  checkExpiringQualifications,
  generateWarningReport,
  runQualWarning
};
