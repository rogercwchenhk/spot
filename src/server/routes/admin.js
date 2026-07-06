/**
 * 管理员 API
 * 标讯处理、匹配计算、推送管理、用户管理
 */
const express = require('express');
const router = express.Router();
const { supabaseAdmin, supabaseAdmin: supabaseWrite } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { processNotice, processPendingNotices, resetAllAiStatus } = require('../services/ai-pipeline');
const { notifyNewStrongMatches } = require('../services/notification');
const { calculateMatch, calculatePendingMatches } = require('../services/match-engine');
const { downloadNoticeDoc, downloadBatch } = require('../services/doc-downloader');
const { extractNoticeScoring, extractBatch } = require('../services/scoring-extractor');
const { pushNoticeNotification, pushNewMatches, testPush } = require('../services/wecom-notify');
const { fetchAndStore } = require('../services/ingestion');

// 所有管理接口都需要 admin 权限
router.use(requireAuth, requireAdmin);

// POST /api/admin/notices/fetch - 手动触发标讯采集
router.post('/notices/fetch', async (req, res) => {
  try {
    const { keywords, province } = req.body;
    const searchKeywords = keywords || ['运维', '小型机'];
    const targetProvince = province || '广东';

    const result = await fetchAndStore(searchKeywords, {
      province: targetProvince,
      pageSize: 20,
      maxPages: 3,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/notices/:id/process - 触发单条标讯 AI 处理
router.post('/notices/:id/process', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await processNotice(Number(id));
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/notices/process-batch - 批量 AI 处理
router.post('/notices/process-batch', async (req, res) => {
  try {
    const { limit = 20 } = req.body;
    const result = await processPendingNotices(limit);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// POST /api/admin/notices/:id/download - 下载单条标讯的招标文件
router.post('/notices/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await downloadNoticeDoc(Number(id));
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/notices/download-batch - 批量下载招标文件
router.post('/notices/download-batch', async (req, res) => {
  try {
    const { limit = 20 } = req.body;
    const result = await downloadBatch(limit);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/notices/:id/scoring - 提取评分标准
router.post('/notices/:id/scoring', async (req, res) => {
  try {
    const result = await extractNoticeScoring(Number(req.params.id));
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/notices/scoring-batch - 批量提取评分标准
router.post('/notices/scoring-batch', async (req, res) => {
  try {
    const { limit = 20 } = req.body;
    const result = await extractBatch(limit);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// POST /api/admin/match/:noticeId - 计算单条匹配
router.post('/match/:noticeId', async (req, res) => {
  try {
    const { noticeId } = req.params;
    const result = await calculateMatch(Number(noticeId));
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/match/batch - 批量匹配计算
router.post('/match/batch', async (req, res) => {
  try {
    const { limit = 50 } = req.body;
    const result = await calculatePendingMatches(limit);
    // 自动发送强推通知
    if (result.calculated > 0) {
      const strongCount = await notifyNewStrongMatches(result.matchedIds || []);
      if (strongCount > 0) console.log(`[admin] 新增 ${strongCount} 条强推通知`);
    }
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/push/test - 测试企微推送
router.post('/push/test', async (req, res) => {
  try {
    const result = await testPush();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/push/:noticeId - 手动推送标讯
router.post('/push/:noticeId', async (req, res) => {
  try {
    const { noticeId } = req.params;

    // 获取标讯和匹配结果
    const { data: notice, error: noticeError } = await supabaseAdmin
      .from('bidding_notice')
      .select('*')
      .eq('id', noticeId)
      .single();

    if (noticeError || !notice) {
      return res.status(404).json({ success: false, error: 'Notice not found' });
    }

    const { data: match, error: matchError } = await supabaseAdmin
      .from('match_result')
      .select('*')
      .eq('notice_id', noticeId)
      .single();

    if (matchError || !match) {
      return res.status(400).json({ success: false, error: 'Match result not found. Run matching first.' });
    }

    const result = await pushNoticeNotification(notice, match);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/push/batch - 批量推送新匹配
router.post('/push/batch', async (req, res) => {
  try {
    const { limit = 20 } = req.body;
    const result = await pushNewMatches(limit);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/pipeline - 运行完整流程
router.post('/pipeline', async (req, res) => {
  try {
    const { runFullPipeline } = require('../services/scheduler');
    const result = await runFullPipeline();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/ai/reset - 重置所有 AI 状态并重新处理
router.post('/ai/reset', async (req, res) => {
  try {
    const resetResult = await resetAllAiStatus();
    const processResult = await processPendingNotices(500);
    const matchResult = await calculatePendingMatches(500);
    res.json({ success: true, data: { reset: resetResult, processed: processResult, matches: matchResult } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/stats - 系统统计
router.get('/stats', async (req, res) => {
  try {
    const [notices, companyQuals, personnelQuals, contracts, matches] = await Promise.all([
      supabaseAdmin.from('bidding_notice').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('company_qualification').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('personnel_qualification').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('company_contract').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('match_result').select('id', { count: 'exact', head: true }),
    ]);

    // AI 处理状态统计
    const { data: aiStatusStats } = await supabaseAdmin
      .from('bidding_notice')
      .select('ai_status')
      .then(({ data }) => {
        const stats = {};
        (data || []).forEach(n => {
          stats[n.ai_status] = (stats[n.ai_status] || 0) + 1;
        });
        return { data: stats };
      });

    // 匹配等级统计
    const { data: matchLevelStats } = await supabaseAdmin
      .from('match_result')
      .select('recommend_level')
      .then(({ data }) => {
        const stats = {};
        (data || []).forEach(m => {
          stats[m.recommend_level] = (stats[m.recommend_level] || 0) + 1;
        });
        return { data: stats };
      });

    res.json({
      success: true,
      data: {
        counts: {
          notices: notices.count || 0,
          company_qualifications: companyQuals.count || 0,
          personnel_qualifications: personnelQuals.count || 0,
          contracts: contracts.count || 0,
          matches: matches.count || 0,
        },
        ai_status: aiStatusStats || {},
        match_levels: matchLevelStats || {},
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// GET /api/admin/keyword-stats - 关键词效果统计
router.get('/keyword-stats', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('v_keyword_effectiveness')
      .select('*');
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/keyword-trend - 关键词周趋势
router.get('/keyword-trend', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('v_keyword_weekly_trend')
      .select('*')
      .order('week_start', { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});




// GET /api/admin/keyword-strategy - 获取完整的关键词策略信息
router.get('/keyword-strategy', async (req, res) => {
  try {
    const config = require('../config');
    const { getKeywordStats } = require('../services/keyword-report');
    const { calculatePageAdjustments } = require('../services/keyword-tuner');

    // 获取当前关键词分组配置
    const keywordGroups = config.keywordGroups || [];
    const excludeKeywords = config.excludeKeywords || [];

    // 获取统计数据
    const stats = await getKeywordStats();

    // 获取调优后的 maxPages
    const tunedMaxPages = await supabaseAdmin
      .from('system_config')
      .select('value, updated_at')
      .eq('key', 'fetch.tuned_max_pages')
      .single();

    // 获取调优建议
    const adjustments = await calculatePageAdjustments();

    res.json({
      success: true,
      data: {
        keyword_groups: keywordGroups,
        exclude_keywords: excludeKeywords,
        stats: stats,
        tuned_max_pages: tunedMaxPages?.data?.value || null,
        tuned_at: tunedMaxPages?.data?.updated_at || null,
        adjustments: adjustments,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// GET /api/admin/keyword-tuner - 获取调优建议
router.get('/keyword-tuner', async (req, res) => {
  try {
    const { runTuner } = require('../services/keyword-tuner');
    const result = await runTuner({ autoApply: false });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/keyword-tuner/apply - 执行调优（自动应用）
router.post('/keyword-tuner/apply', async (req, res) => {
  try {
    const { runTuner, applyPageAdjustments, calculatePageAdjustments } = require('../services/keyword-tuner');
    
    // 先计算调整
    const adjustments = await calculatePageAdjustments();
    const result = await applyPageAdjustments(adjustments);
    
    res.json({ success: true, data: { adjustments, applied: result } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/keyword-report - 生成并推送关键词效果报告
router.post('/keyword-report', async (req, res) => {
  try {
    const { weekly = true } = req.body;
    const { generateKeywordReport } = require('../services/keyword-report');
    const { pushKeywordReport } = require('../services/wecom-notify');

    const report = await generateKeywordReport({ weekly });
    
    // 推送到企微
    const pushResult = await pushKeywordReport(weekly);

    res.json({ 
      success: true, 
      data: { 
        markdown: report.markdown, 
        stats: report.stats,
        pushed: pushResult.success 
      } 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/users - 列出用户（简化版）
router.get('/users', async (req, res) => {
  try {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) throw error;

    const userList = (users || []).map(u => ({
      id: u.id,
      email: u.email,
      role: u.user_metadata?.role || u.app_metadata?.role || 'viewer',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    }));

    res.json({ success: true, data: userList });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/users - 新增用户
router.post('/users', async (req, res) => {
  try {
    const { email, password, role = 'viewer' } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { role },
      email_confirm: true,
    });

    if (error) throw error;

    res.status(201).json({
      success: true,
      data: {
        id: data.user.id,
        email: data.user.email,
        role: role,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/users/:id/role - 修改用户角色
router.put('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['admin', 'hr', 'presales', 'sales'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Role must be admin, hr, presales, or sales' });
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      user_metadata: { role },
    });

    if (error) throw error;

    res.json({
      success: true,
      data: {
        id: data.user.id,
        email: data.user.email,
        role: role,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// POST /api/admin/notices/cleanup - remove irrelevant notices (exclude + positive keyword filter)
router.post('/notices/cleanup', async (req, res) => {
  try {
    const config = require('../config');
    const { excludeKeywords } = config;

    const POSITIVE_IT_KEYWORDS = [
      '运维', '维保', 'IT', '信息化', '信息技术', '服务器', '存储', '网络', '数据库', '小型机', '驻场', '机房', '数据中心',
      '系统集成', '弱电', '安防', '监控', '视频会议', '通信', '云计算', '虚拟化', '中间件',
      '安全服务', '信息安全', '网络安全', '网安', '数据安全', '应用系统', '信息中心', '技术支撑', '技术支持',
      '桌面运维', '桌面外包', '网络运维', '系统运维', '基础设施', '计算机', '软件', '硬件', '数据', '数字化',
      '交换机', '路由器', '防火墙', 'UPS', '备份', '容灾', '灾备', '政务', '电子政务',
      'IBM', 'Oracle', 'HP', 'HPE', 'Dell', '华为', '华三', 'H3C', '锐捷', '深信服', '天融信',
      'Power', 'AIX', 'Linux', 'Windows Server', 'VMware', 'Vmware', 'ITO',
    ];
    const positivePattern = new RegExp(POSITIVE_IT_KEYWORDS.join('|'), 'i');
    const excludePattern = new RegExp(excludeKeywords.join('|'), 'i');

    const { data: notices, error } = await supabaseAdmin
      .from('bidding_notice')
      .select('id, title, tenderee, tender_agent');
    if (error) throw error;

    const toDelete = [];
    const details = [];
    for (const notice of notices || []) {
      const titleText = notice.title || '';
      // Only check title for exclude keywords (not tenderee/tender_agent to avoid false positives)
      if (excludePattern.test(titleText)) {
        toDelete.push(notice.id);
        details.push({ id: notice.id, title: notice.title, reason: 'exclude_keyword' });
        continue;
      }
      // Positive keyword check on title only
      if (!positivePattern.test(titleText)) {
        toDelete.push(notice.id);
        details.push({ id: notice.id, title: notice.title, reason: 'no_positive_keyword' });
      }
    }

    if (toDelete.length === 0) {
      return res.json({ success: true, data: { deleted: 0, message: 'nothing to clean' } });
    }

    const { error: delMatchErr } = await supabaseAdmin
      .from('match_result')
      .delete()
      .in('notice_id', toDelete);
    if (delMatchErr) console.error('[cleanup] match_result delete error:', delMatchErr.message);

    const { error: delErr } = await supabaseAdmin
      .from('bidding_notice')
      .delete()
      .in('id', toDelete);
    if (delErr) throw delErr;

    console.log('[cleanup] Deleted ' + toDelete.length + ' irrelevant notices');
    res.json({ success: true, data: { deleted: toDelete.length, details } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
