/**
 * 通知服务
 * 自动创建系统通知：采集完成、强推标讯、匹配结果
 */
const { supabaseAdmin } = require('../db');

/**
 * 创建通知
 */
async function createNotification(type, title, body, link) {
  const { data, error } = await supabaseAdmin
    .from('notification')
    .insert({ type, title, body, link })
    .select()
    .single();
  if (error) console.error('[notification] create error:', error.message);
  return data;
}

/**
 * 采集完成通知
 */
async function notifyCrawlDone(newCount) {
  if (newCount <= 0) return;
  return createNotification(
    'crawl_done',
    `采集完成：新增 ${newCount} 条标讯`,
    `本次采集新增 ${newCount} 条招标公告，等待 AI 处理和匹配`,
    '/',
  );
}

/**
 * 强推标讯通知（匹配完成后，对每条 strong 标讯发通知）
 */
async function notifyStrongMatch(notice) {
  const budget = notice.budget_amount ? `¥${notice.budget_amount}万` : '未公开';
  return createNotification(
    'match_strong',
    `强推标讯：${notice.title}`,
    `预算 ${budget}，建议尽快跟进`,
    `/notices/${notice.id}`,
  );
}

/**
 * 批量匹配完成后，检查新的 strong 标讯并发送通知
 */
async function notifyNewStrongMatches(matchedNoticeIds) {
  if (!matchedNoticeIds || matchedNoticeIds.length === 0) return 0;

  // 查这批标讯中 recommend_level = strong 的
  const { data: strongMatches } = await supabaseAdmin
    .from('match_result')
    .select('notice_id')
    .in('notice_id', matchedNoticeIds)
    .eq('recommend_level', 'strong');

  if (!strongMatches || strongMatches.length === 0) return 0;

  // 查标讯详情
  const noticeIds = strongMatches.map(m => m.notice_id);
  const { data: notices } = await supabaseAdmin
    .from('bidding_notice')
    .select('id, title, budget_amount')
    .in('id', noticeIds);

  // 检查是否已有重复通知（避免重复推送）
  const { data: existing } = await supabaseAdmin
    .from('notification')
    .select('link')
    .eq('type', 'match_strong')
    .in('link', noticeIds.map(id => `/notices/${id}`));

  const existingLinks = new Set((existing || []).map(e => e.link));
  const newNotices = (notices || []).filter(n => !existingLinks.has(`/notices/${n.id}`));

  for (const notice of newNotices) {
    await notifyStrongMatch(notice);
  }

  return newNotices.length;
}

module.exports = {
  createNotification,
  notifyCrawlDone,
  notifyStrongMatch,
  notifyNewStrongMatches,
};
