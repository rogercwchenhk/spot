/**
 * 企微群机器人推送服务
 * 发送标讯通知到企业微信群
 */
const config = require('../config');
const { supabaseAdmin } = require('../db');

const WEBHOOK_URL = config.wecom.webhookUrl;

/**
 * 发送 Markdown 消息到企微群
 */
async function sendMarkdown(content) {
  if (!WEBHOOK_URL) {
    console.warn('[wecom] Webhook URL not configured');
    return { success: false, error: 'Webhook URL not configured' };
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
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
  // 只推送 strong 和 yes 等级
  if (!['strong', 'yes'].includes(matchResult.recommend_level)) {
    console.log(`[wecom] Skip notice ${notice.id}: level=${matchResult.recommend_level}`);
    return { success: false, reason: 'level_not_qualified' };
  }

  // 检查去重：同一采购单位24小时内只推一次
  const isDuplicate = await checkDuplicate(notice.tenderee, notice.id);
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
    // 记录推送历史
    await recordPushHistory(notice.id, notice.tenderee);
  }

  return result;
}

/**
 * 检查是否重复推送（24小时内同一采购单位）
 */
async function checkDuplicate(tenderee, currentNoticeId) {
  if (!tenderee) return false;

  const oneDayAgo = new Date();
  oneDayAgo.setHours(oneDayAgo.getHours() - 24);

  // 检查最近24小时内是否推送过同一采购单位的标讯
  const { data, error } = await supabaseAdmin
    .from('bidding_notice')
    .select('id')
    .eq('tenderee', tenderee)
    .lt('created_at', oneDayAgo.toISOString())
    .neq('id', currentNoticeId)
    .limit(1);

  if (error) {
    console.warn('[wecom] Duplicate check error:', error.message);
    return false;
  }

  return data && data.length > 0;
}

/**
 * 记录推送历史
 */
async function recordPushHistory(noticeId, tenderee) {
  // 这里可以扩展为独立的推送历史表
  // 目前简单记录在 notice_tag 中
  try {
    await supabaseAdmin
      .from('notice_tag')
      .insert({
        notice_id: noticeId,
        tag_type: 'push_status',
        tag_value: 'pushed',
        confidence: 1.0,
      });
  } catch (err) {
    console.warn('[wecom] Record push history failed:', err.message);
  }
}

/**
 * 推送新匹配的标讯
 */
async function pushNewMatches(limit = 20) {
  // 找出有匹配结果但未推送的标讯
  const { data: matches, error } = await supabaseAdmin
    .from('match_result')
    .select(`
      *,
      bidding_notice (*)
    `)
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

    // 检查是否已推送
    const { data: pushTag } = await supabaseAdmin
      .from('notice_tag')
      .select('id')
      .eq('notice_id', notice.id)
      .eq('tag_type', 'push_status')
      .eq('tag_value', 'pushed')
      .limit(1);

    if (pushTag && pushTag.length > 0) {
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

  // 查询当天发布的标讯及其匹配结果
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

  // 按匹配等级分组
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

  // 构建日报内容
  const dateStr = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const timeStr = new Date().toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit' });
  let md = `## 📊 客户雷达日报 (${dateStr} ${timeStr})\n`;
  md += `> 共 **${notices.length}** 条新标讯\n\n`;

  for (const level of ['strong', 'yes', 'risky', 'no', 'unmatched']) {
    const items = groups[level];
    if (items.length === 0) continue;
    const cfg = levelConfig[level];
    md += `### ${cfg.emoji} ${cfg.label} (${items.length}条)\n`;

    const show = items.slice(0, 5); // 每类最多显示 5 条
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
