/**
 * 标讯命令 — notice list / notice get / notice search
 */
const { table, noticeRow, error, success } = require('../format');

function register(program, api) {
  const notice = program.command('notice').description('标讯查询');

  notice
    .command('list')
    .description('查看标讯列表')
    .option('--level <level>', '推荐等级 (strong/yes/risky/no)')
    .option('--region <region>', '地区筛选')
    .option('--days <n>', '最近N天', '1')
    .option('--source <source>', '数据来源 (zhiliao_api/scrapling)')
    .option('--limit <n>', '返回条数', '20')
    .action(async (opts) => {
      try {
        const params = new URLSearchParams();
        if (opts.level) params.set('recommend_level', opts.level);
        if (opts.region) params.set('region', opts.region);
        if (opts.source) params.set('data_source', opts.source);
        if (opts.days) params.set('days', opts.days);
        params.set('limit', opts.limit);

        const res = await api.get(`/api/notices?${params}`);
        const notices = (res.data || res || []).map(n => noticeRow(n));

        if (program.opts().json) {
          success(notices, true);
        } else {
          table(notices, [
            { key: 'id', label: 'ID', maxWidth: 8 },
            { key: 'level', label: '等级', maxWidth: 8, colorKey: 'level' },
            { key: 'title', label: '标题', maxWidth: 50 },
            { key: 'budget', label: '预算', maxWidth: 12 },
            { key: 'region', label: '地区', maxWidth: 10 },
            { key: 'date', label: '日期', maxWidth: 12 },
            { key: 'source', label: '来源', maxWidth: 12 },
          ]);
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  notice
    .command('get <id>')
    .description('查看标讯详情')
    .action(async (id) => {
      try {
        const res = await api.get(`/api/notices/${id}`);
        const n = res.data || res;

        if (program.opts().json) {
          success(n, true);
        } else {
          console.log(`\n  ID:       ${n.id}`);
          console.log(`  标题:     ${n.title}`);
          console.log(`  类型:     ${n.notice_type || '-'}`);
          console.log(`  预算:     ${n.budget_amount ? n.budget_amount + '万' : '-'}`);
          console.log(`  地区:     ${n.region_scope || n.city || '-'}`);
          console.log(`  发布:     ${(n.publish_date || '').slice(0, 10)}`);
          console.log(`  截止:     ${(n.end_date || '').slice(0, 10)}`);
          console.log(`  来源:     ${n.data_source || '-'}`);
          console.log(`  平台:     ${n.platform_id || '-'}`);
          console.log(`  URL:      ${n.source_url || '-'}`);
          if (n.tenderee) console.log(`  招标人:   ${n.tenderee}`);
          if (n.industry_type) console.log(`  行业:     ${n.industry_type}`);
          console.log(`  AI状态:   ${n.ai_status ?? '-'}`);
          console.log('');
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  notice
    .command('search <keyword>')
    .description('关键词搜索标讯')
    .option('--limit <n>', '返回条数', '20')
    .action(async (keyword, opts) => {
      try {
        const params = new URLSearchParams({ q: keyword, limit: opts.limit });
        const res = await api.get(`/api/notices/search?${params}`);
        const notices = (res.data || res || []).map(n => noticeRow(n));

        if (program.opts().json) {
          success(notices, true);
        } else {
          table(notices, [
            { key: 'id', label: 'ID', maxWidth: 8 },
            { key: 'level', label: '等级', maxWidth: 8, colorKey: 'level' },
            { key: 'title', label: '标题', maxWidth: 50 },
            { key: 'budget', label: '预算', maxWidth: 12 },
            { key: 'region', label: '地区', maxWidth: 10 },
            { key: 'date', label: '日期', maxWidth: 12 },
          ]);
        }
      } catch (e) { error(e.message, program.opts().json); }
    });
}

module.exports = { register };

  // ── 销售标注状态 (B5) ─────────────────────────────────────

  notice
    .command('status <id> [status]')
    .description('查看/更新标讯状态')
    .action(async (id, status) => {
      try {
        if (!status) {
          // 查看当前状态
          const res = await api.get(`/api/notices/${id}`);
          const n = res.data || res;
          if (program.opts().json) {
            success({ id: n.id, notice_status: n.notice_status }, true);
          } else {
            console.log(`\n  标讯 ${id} 状态: ${n.notice_status || 'new'}`);
            console.log('');
          }
        } else {
          // 更新状态
          const validStatuses = ['new', 'following', 'ignored', 'bidding', 'won', 'lost'];
          if (!validStatuses.includes(status)) {
            error(`无效状态: ${status}，可选: ${validStatuses.join(', ')}`, program.opts().json);
            return;
          }

          const res = await api.patch(`/api/notices/${id}/status`, { notice_status: status });
          if (program.opts().json) {
            success(res.data || res, true);
          } else {
            console.log(`\n  已更新标讯 ${id} 状态: ${status}`);
            console.log('');
          }
        }
      } catch (e) { error(e.message, program.opts().json); }
    });
