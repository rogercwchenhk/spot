/**
 * 匹配命令 — match list / match get
 */
const { table, error, success, LEVEL_COLORS, RESET } = require('../format');

function register(program, api) {
  const match = program.command('match').description('匹配结果');

  match
    .command('list')
    .description('查看匹配结果')
    .option('--level <level>', '推荐等级 (strong/yes/risky/no)')
    .option('--limit <n>', '返回条数', '20')
    .action(async (opts) => {
      try {
        const params = new URLSearchParams({ limit: opts.limit });
        if (opts.level) params.set('recommend_level', opts.level);
        const res = await api.get(`/api/match?${params}`);
        const rows = (res.data || res || []).map(m => ({
          notice_id: m.notice_id,
          level: m.recommend_level,
          deduction: m.total_deduction,
          title: (m.bidding_notice?.title || '').slice(0, 40),
          calculated: (m.calculated_at || '').slice(0, 10),
        }));

        if (program.opts().json) {
          success(rows, true);
        } else {
          table(rows, [
            { key: 'notice_id', label: 'NoticeID', maxWidth: 10 },
            { key: 'level', label: '等级', maxWidth: 8, colorKey: 'level' },
            { key: 'deduction', label: '扣分', maxWidth: 8 },
            { key: 'title', label: '标题', maxWidth: 40 },
            { key: 'calculated', label: '计算时间', maxWidth: 12 },
          ]);
        }
      } catch (e) { error(e.message, program.opts().json); }
    });

  match
    .command('get <noticeId>')
    .description('查看匹配详情')
    .action(async (noticeId) => {
      try {
        const res = await api.get(`/api/match/${noticeId}`);
        const m = res.data || res;

        if (program.opts().json) {
          success(m, true);
        } else {
          const color = LEVEL_COLORS[m.recommend_level] || '';
          console.log(`\n  Notice ID:  ${m.notice_id}`);
          console.log(`  推荐等级:   ${color}${m.recommend_level}${RESET}`);
          console.log(`  预估扣分:   ${m.total_deduction}`);
          console.log(`  计算时间:   ${(m.calculated_at || '').slice(0, 19)}`);

          if (m.match_details && Array.isArray(m.match_details)) {
            console.log('\n  匹配明细:');
            for (const d of m.match_details) {
              const mark = d.matched ? '✓' : '✗';
              const ded = d.deduction > 0 ? ` (-${d.deduction}分)` : '';
              console.log(`    ${mark} ${d.requirement || d.dimension || ''}${ded}`);
            }
          }

          if (m.risk_notes && m.risk_notes.length > 0) {
            console.log('\n  风险提示:');
            for (const note of m.risk_notes) {
              console.log(`    ⚠ ${note}`);
            }
          }
          console.log('');
        }
      } catch (e) { error(e.message, program.opts().json); }
    });
}

module.exports = { register };
