#!/usr/bin/env node
/**
 * One-shot cleanup: delete irrelevant bidding_notice rows
 * Uses service-role key to bypass RLS
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Same exclude list as config.js
const EXCLUDE_KEYWORDS = [
  '建筑', '施工', '监理', '装修', '幕墙', '消防工程', '土建', '钢结构', '脚手架', '桩基', '地基', '防水工程', '保温工程', '装饰', '装潢', '改建', '扩建', '拆除', '拆迁',
  '医疗设备', '医疗器械', '药品', '药品配送', '中药材', '疫苗', '血站', '临床', '检验试剂', '医用耗材', '卫生材料',
  '食材', '食堂', '餐饮', '厨师', '烹饪', '厨具', '餐具', '配餐', '供餐', '饭堂', '团餐', '送餐', '中央厨房', '团膳', '食材配送', '食材采购', '米面油', '蔬菜配送', '肉类配送',
  '工勤', '保洁', '保安', '物业', '物业管理', '物业服务', '保安服务', '环卫', '清扫', '垃圾清运', '垃圾收运', '消杀', '白蚁防治', '四害消杀', '灭鼠', '灭蟑',
  '服装', '被服', '窗帘', '床上用品', '布草', '洗涤', '洗衣', '印务', '印刷', '广告', '标识', '灯箱',
  '花卉', '苗木', '盆栽', '肥料', '农药', '种子', '饲料',
  '电梯', '扶梯', '起重', '压力容器', '锅炉', '特种设备检验',
];

// Same positive list as ingestion.js
const POSITIVE_IT_KEYWORDS = [
  '运维', '维保', 'IT', '信息化', '信息技术', '服务器', '存储', '网络', '数据库', '小型机', '驻场', '机房', '数据中心',
  '系统集成', '弱电', '安防', '监控', '视频会议', '通信', '云计算', '虚拟化', '中间件',
  '安全服务', '信息安全', '网络安全', '网安', '数据安全', '应用系统', '信息中心', '技术支撑', '技术支持',
  '桌面运维', '桌面外包', '网络运维', '系统运维', '基础设施', '计算机', '软件', '硬件', '数据', '数字化',
  '交换机', '路由器', '防火墙', 'UPS', '备份', '容灾', '灾备', '政务', '电子政务',
  'IBM', 'Oracle', 'HP', 'HPE', 'Dell', '华为', '华三', 'H3C', '锐捷', '深信服', '天融信',
  'Power', 'AIX', 'Linux', 'Windows Server', 'VMware', 'Vmware', 'ITO',
];

const excludePattern = new RegExp(EXCLUDE_KEYWORDS.join('|'), 'i');
const positivePattern = new RegExp(POSITIVE_IT_KEYWORDS.join('|'), 'i');

async function main() {
  console.log('Fetching all notices...');
  const { data: notices, error } = await supabase
    .from('bidding_notice')
    .select('id, title, tenderee, tender_agent');
  if (error) throw error;
  console.log(`Found ${notices.length} total notices`);

  const toDelete = [];
  for (const notice of notices) {
    // Only check title for exclude keywords (avoid company name false positives)
    const titleText = notice.title || '';
    if (excludePattern.test(titleText)) {
      toDelete.push({ id: notice.id, title: notice.title, reason: 'exclude_keyword' });
      continue;
    }
    // Positive keyword check on title only
    if (!positivePattern.test(titleText)) {
      toDelete.push({ id: notice.id, title: notice.title, reason: 'no_positive_keyword' });
    }
  }

  if (toDelete.length === 0) {
    console.log('No irrelevant notices found. DB is clean.');
    return;
  }

  console.log(`\nFound ${toDelete.length} irrelevant notices to delete:`);
  for (const d of toDelete) {
    console.log(`  [${d.reason}] #${d.id}: ${d.title}`);
  }

  const ids = toDelete.map(d => d.id);

  // Delete match_results first
  const { error: dmErr } = await supabase.from('match_result').delete().in('notice_id', ids);
  if (dmErr) console.error('match_result delete error:', dmErr.message);
  else console.log(`Deleted match_results for ${ids.length} notices`);

  // Delete notices
  const { error: dnErr } = await supabase.from('bidding_notice').delete().in('id', ids);
  if (dnErr) throw dnErr;
  console.log(`Deleted ${ids.length} irrelevant notices successfully.`);
}

main().catch(err => { console.error(err); process.exit(1); });
