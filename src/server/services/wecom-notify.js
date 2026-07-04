/**
 * 企微群机器人推送服务
 * 发送标讯通知到企业微信群
 */
const config = require('../config');
const { supabaseAdmin } = require('../db');
const { getConfig } = require('./config-reader');

const DEFAULT_WEBHOOK = config.wecom.webhookUrl;

/**
 * 发送 Markdown 消息到企微群
 */
async function sendMarkdown(content) {
  const webhookUrl = await getConfig('push.webhook_url', DEFAULT_WEBHOOK);
  if (!webhookUrl) {
    console.warn('[wecom] Webhook URL not configured');
    return { success: false, error: 'Webhook URL not configured' };
  }

  const pushEnabled = await getConfig('push.enabled', true);
  if (!pushEnabled) {
    console.log('[wecom] Push disabled in config');
    return { success: false, reason: 'push_disabled' };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msgtype: 'markdown',
        markdown: { content },
      }),
    });

    const result = await response.json();

    if (result.errcode !== 0) {
      console.error('[wecom] Send failed:', result);
      return { success: false, error: result.errmsg };
    }

    console.log('[wecom] Message sent successfully');
    return { success: true };
  } catch (err) {
    console.error('[wecom] Send error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 推送标讯通知
 */
async function pushNoticeNotification(notice, matchResult) {
  if (!['strong', 'yes'].includes(matchResult.recommend_level)) {
    console.log(`[wecom] Skip notice ${notice.id}: level=${matchResult.recommend_level}`);
    return { success: false, reason: 'level_not_qualified' };
  }

  const isDuplicate = await checkDuplicate(notice.tenderee);
  if (isDuplicate) {
    console.log(`[wecom] Skip notice ${notice.id}: duplicate tenderee ${notice.tenderee}`);
    return { success: false, reason: 'duplicate_tenderee' };
  }

  const levelEmoji = matchResult.recommend_level === 'strong' ? '🟢' : '🟡';
  const levelText = matchResult.recommend_level === 'strong' ? '强推' : '可以投';
  const budgetText = notice.budget_amount ? `¥${(notice.budget_amount / 10000).toFixed(0)}万` : '未公开';
  const deadlineText = notice.end_date ? new Date(notice.end_date).toLocaleDateString('zh-CN') : '未知';

  const pwaUrl = process.env.PWA_URL || 'http://localhost:5173';

  const content = `## ${levelEmoji} 新标讯 - ${levelText}
**${notice.title}**
- 预算: ${budgetText}
- 地区: ${notice.city || '未知'}
- 截止: ${deadlineText}
- 预估扣分: ${matchResult.total_deduction}分
- [查看详情](${pwaUrl}/notice/${notice.id})`;

  const result = await sendMarkdown(content);

  if (result.success) {
    await recordPushHistory(notice.id, notice.tenderee);
  }

  return result;
}

/**
 * 检查是否重复推送（24小时内同一采购单位）
 */
async function checkDuplicate(tenderee) {
  if (!tenderee) return false;

  const oneDayAgo = new Date();
  oneDayAgo.setHours(oneDayAgo.getHours() - 24);

  const { data, error } = await supabaseAdmin
    .from('push_history')
    .select('id')
    .eq('tenderee', tenderee)
    .gte('pushed_at', oneDayAgo.toISOString())
    .limit(1);

  if (error) {
    // push_history 表可能还未创建，降级为不检查
    console.warn('[wecom] Duplicate check error:', error.message);
    return false;
  }

  return data && data.length > 0;
}

/**
 * 记录推送历史
 */
async function recordPushHistory(noticeId, tenderee) {
  try {
    await supabaseAdmin
      .from('push_history')
      .insert({ notice_id: noticeId, tenderee, channel: 'wecom' });
  } catch (err) {
    console.warn('[wecom] Record push history failed:', err.message);
  }
}

/**
 * 推送新匹配的标讯
 */
async function pushNewMatches(limit = 20) {
  const { data: matches, error } = await supabaseAdmin
    .from('match_result')
    .select(`*, bidding_notice (*)`)
    .in('recommend_level', ['strong', 'yes'])
    .order('calculated_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  if (!matches || matches.length === 0) {
    console.log('[wecom] No new matches to push');
    return { pushed: 0, skipped: 0 };
  }

  let pushed = 0;
  let skipped = 0;

  for (const match of matches) {
    const notice = match.bidding_notice;
    if (!notice) continue;

    // 检查是否已推送（通过 push_history 表）
    const { data: alreadyPushed } = await supabaseAdmin
      .from('push_history')
      .select('id')
      .eq('notice_id', notice.id)
      .limit(1);

    if (alreadyPushed && alreadyPushed.length > 0) {
      skipped++;
      continue;
    }

    try {
      await pushNoticeNotification(notice, match);
      pushed++;
    } catch (err) {
      console.error(`[wecom] Push failed for notice ${notice.id}:`, err.message);
      skipped++;
    }
  }

  console.log(`[wecom] Push complete: ${pushed} pushed, ${skipped} skipped`);
  return { pushed, skipped };
}

/**
 * 推送日报：汇总当天新标讯 + 匹配结果
 */
async function pushDailyReport() {
  const today = new Date().toISOString().slice(0, 10);

  const { data: notices, error } = await supabaseAdmin
    .from('bidding_notice')
    .select('*, match_result(*)')
    .gte('publish_date', today)
    .order('publish_date', { ascending: false });

  if (error) throw error;
  if (!notices || notices.length === 0) {
    console.log('[wecom] 今日无新标讯，跳过推送');
    return { pushed: 0, reason: 'no_data' };
  }

  const groups = { strong: [], yes: [], risky: [], no: [], unmatched: [] };
  for (const n of notices) {
    const mr = Array.isArray(n.match_result) ? n.match_result[0] : n.match_result;
    const level = mr ? mr.recommend_level : 'unmatched';
    (groups[level] || groups.unmatched).push({ notice: n, match: mr });
  }

  const levelConfig = {
    strong: { emoji: '🟢', label: '强推' },
    yes: { emoji: '🟡', label: '可以投' },
    risky: { emoji: '🟠', label: '风险' },
    no: { emoji: '🔴', label: '不建议' },
    unmatched: { emoji: '⚪', label: '待匹配' },
  };

  const dateStr = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const timeStr = new Date().toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit' });
  let md = `## 📊 客户雷达日报 (${dateStr} ${timeStr})\n`;
  md += `> 共 **${notices.length}** 条新标讯\n\n`;

  for (const level of ['strong', 'yes', 'risky', 'no', 'unmatched']) {
    const items = groups[level];
    if (items.length === 0) continue;
    const cfg = levelConfig[level];
    md += `### ${cfg.emoji} ${cfg.label} (${items.length}条)\n`;

    const show = items.slice(0, 5);
    for (const { notice: n, match: m } of show) {
      const budget = n.budget_amount ? `¥${(n.budget_amount / 10000).toFixed(0)}万` : '-';
      const deduction = m ? ` 扣${m.total_deduction}分` : '';
      md += `> ${n.title?.substring(0, 35)}${n.title?.length > 35 ? '...' : ''} | ${budget} | ${n.city || '-'}${deduction}\n`;
    }
    if (items.length > 5) md += `> ...等 ${items.length - 5} 条\n`;
    md += '\n';
  }

  const result = await sendMarkdown(md);
  if (result.success) {
    console.log(`[wecom] 日报推送成功: ${notices.length} 条标讯`);
  }
  return { pushed: notices.length, success: result.success };
}

/**
 * 测试推送
 */
async function testPush() {
  return await sendMarkdown('## 🔔 客户雷达推送测试\n\n企微推送功能已配置成功！');
}

module.exports = { pushNoticeNotification, pushNewMatches, pushDailyReport, testPush, sendMarkdown };
