/**
 * Scrapling 爬虫客户端 — Node.js ↔ Python 桥接
 * 通过 child_process 调用 scrapling_engine.py，解析 JSON 输出
 */
const { execFile } = require('child_process');
const path = require('path');
const { supabaseAdmin } = require('../db');
const { getConfig } = require('./config-reader');

const ENGINE_PATH = path.join(__dirname, '../../../scripts/scrapling_engine.py');
const PYTHON = process.env.SCRAPLING_PYTHON || 'python3.13';

/**
 * 调用 Scrapling 引擎爬取列表页
 * @param {Object} platform - platform_source 行
 * @returns {Object} {items: [...], pages_crawled, errors}
 */
async function crawlListing(platform) {
  const timeout = await getConfig('datasource.scrapling.timeout_ms', 30000);

  const payload = JSON.stringify({ platform });

  return new Promise((resolve, reject) => {
    const child = execFile(PYTHON, [ENGINE_PATH, '--stdin'], {
      timeout: timeout + 10000,  // 引擎超时 + 10s buffer
      maxBuffer: 10 * 1024 * 1024,  // 10MB
      encoding: 'utf-8',
    }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[scrapling-client] Engine error: ${error.message}`);
        if (stderr) console.error(`[scrapling-client] stderr: ${stderr.slice(0, 500)}`);
        return reject(new Error(`Scrapling engine failed: ${error.message}`));
      }

      try {
        const result = JSON.parse(stdout);
        if (stderr) console.log(`[scrapling-client] Engine log:\n${stderr}`);
        resolve(result);
      } catch (parseErr) {
        console.error(`[scrapling-client] JSON parse error. stdout: ${stdout.slice(0, 200)}`);
        reject(new Error(`Invalid JSON from Scrapling engine: ${parseErr.message}`));
      }
    });

    child.stdin.write(payload);
    child.stdin.end();
  });
}

/**
 * 调用 Scrapling 引擎爬取详情页
 * @param {string} url - 详情页 URL
 * @param {Object} selectors - detail_selectors
 * @param {string} strategy - spider_strategy
 * @returns {Object} {title, content, publish_date, budget_amount, attachment_urls}
 */
async function crawlDetail(url, selectors, strategy = 'requests_plain') {
  const timeout = await getConfig('datasource.scrapling.timeout_ms', 30000);

  const payload = JSON.stringify({ url, selectors, strategy });

  return new Promise((resolve, reject) => {
    const child = execFile(PYTHON, [ENGINE_PATH, '--stdin', '--detail'], {
      timeout: timeout + 10000,
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf-8',
    }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(`Scrapling detail failed: ${error.message}`));
      }
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (parseErr) {
        reject(new Error(`Invalid JSON from detail engine: ${parseErr.message}`));
      }
    });

    child.stdin.write(payload);
    child.stdin.end();
  });
}

/**
 * 从标题中提取省/市信息
 * 用于全国性平台（ccgp.gov.cn等）的公告，补充 location 信息
 * @param {string} title - 公告标题
 * @returns {{ city: string, region_scope: string } | null}
 */
function extractLocationFromTitle(title) {
  if (!title) return null;

  // 省份 → 主要城市映射
  const PROVINCES = {
    '广东': ['广州', '深圳', '珠海', '汕头', '佛山', '韶关', '湛江', '肇庆', '江门', '茂名', '惠州', '梅州', '汕尾', '河源', '阳江', '清远', '东莞', '中山', '潮州', '揭阳', '云浮'],
    '北京': ['北京'],
    '上海': ['上海'],
    '天津': ['天津'],
    '重庆': ['重庆'],
    '河北': ['石家庄', '唐山', '秦皇岛', '邯郸', '邢台', '保定', '张家口', '承德', '沧州', '廊坊', '衡水'],
    '山西': ['太原', '大同', '阳泉', '长治', '晋城', '朔州', '晋中', '运城', '忻州', '临汾', '吕梁'],
    '内蒙古': ['呼和浩特', '包头', '乌海', '赤峰', '通辽', '鄂尔多斯', '呼伦贝尔', '巴彦淖尔', '乌兰察布'],
    '辽宁': ['沈阳', '大连', '鞍山', '抚顺', '本溪', '丹东', '锦州', '营口', '阜新', '辽阳', '盘锦', '铁岭', '朝阳', '葫芦岛'],
    '吉林': ['长春', '吉林', '四平', '辽源', '通化', '白山', '松原', '白城'],
    '黑龙江': ['哈尔滨', '齐齐哈尔', '鸡西', '鹤岗', '双鸭山', '大庆', '伊春', '佳木斯', '七台河', '牡丹江', '黑河', '绥化'],
    '江苏': ['南京', '无锡', '徐州', '常州', '苏州', '南通', '连云港', '淮安', '盐城', '扬州', '镇江', '泰州', '宿迁'],
    '浙江': ['杭州', '宁波', '温州', '嘉兴', '湖州', '绍兴', '金华', '衢州', '舟山', '台州', '丽水'],
    '安徽': ['合肥', '芜湖', '蚌埠', '淮南', '马鞍山', '淮北', '铜陵', '安庆', '黄山', '滁州', '阜阳', '宿州', '六安', '亳州', '池州', '宣城'],
    '福建': ['福州', '厦门', '莆田', '三明', '泉州', '漳州', '南平', '龙岩', '宁德'],
    '江西': ['南昌', '景德镇', '萍乡', '九江', '新余', '鹰潭', '赣州', '吉安', '宜春', '抚州', '上饶'],
    '山东': ['济南', '青岛', '淄博', '枣庄', '东营', '烟台', '潍坊', '济宁', '泰安', '威海', '日照', '临沂', '德州', '聊城', '滨州', '菏泽'],
    '河南': ['郑州', '开封', '洛阳', '平顶山', '安阳', '鹤壁', '新乡', '焦作', '濮阳', '许昌', '漯河', '三门峡', '南阳', '商丘', '信阳', '周口', '驻马店'],
    '湖北': ['武汉', '黄石', '十堰', '宜昌', '襄阳', '鄂州', '荆门', '孝感', '荆州', '黄冈', '咸宁', '随州', '恩施'],
    '湖南': ['长沙', '株洲', '湘潭', '衡阳', '邵阳', '岳阳', '常德', '张家界', '益阳', '郴州', '永州', '怀化', '娄底', '湘西'],
    '广西': ['南宁', '柳州', '桂林', '梧州', '北海', '防城港', '钦州', '贵港', '玉林', '百色', '贺州', '河池', '来宾', '崇左'],
    '海南': ['海口', '三亚', '三沙', '儋州'],
    '四川': ['成都', '自贡', '攀枝花', '泸州', '德阳', '绵阳', '广元', '遂宁', '内江', '乐山', '南充', '眉山', '宜宾', '广安', '达州', '雅安', '巴中', '资阳', '阿坝', '甘孜', '凉山'],
    '贵州': ['贵阳', '六盘水', '遵义', '安顺', '毕节', '铜仁', '黔西南', '黔东南', '黔南'],
    '云南': ['昆明', '曲靖', '玉溪', '保山', '昭通', '丽江', '普洱', '临沧', '楚雄', '红河', '文山', '西双版纳', '大理', '德宏', '怒江', '迪庆'],
    '西藏': ['拉萨', '日喀则', '昌都', '林芝', '山南', '那曲', '阿里'],
    '陕西': ['西安', '铜川', '宝鸡', '咸阳', '渭南', '延安', '汉中', '榆林', '安康', '商洛'],
    '甘肃': ['兰州', '嘉峪关', '金昌', '白银', '天水', '武威', '张掖', '平凉', '酒泉', '庆阳', '定西', '陇南', '临夏', '甘南'],
    '青海': ['西宁', '海东', '海北', '黄南', '海南', '果洛', '玉树', '海西'],
    '宁夏': ['银川', '石嘴山', '吴忠', '固原', '中卫'],
    '新疆': ['乌鲁木齐', '克拉玛依', '吐鲁番', '哈密', '昌吉', '博尔塔拉', '巴音郭楞', '阿克苏', '克孜勒苏', '喀什', '和田', '伊犁', '塔城', '阿勒泰'],
  };

  // 先匹配城市（更精确）
  for (const [province, cities] of Object.entries(PROVINCES)) {
    for (const city of cities) {
      if (title.includes(city)) {
        return { city, region_scope: province };
      }
    }
  }

  // 再匹配省份
  for (const province of Object.keys(PROVINCES)) {
    if (title.includes(province + '省') || title.includes(province + '市') || title.includes(province + '自治区') || title.includes(province + '壮族自治区') || title.includes(province + '回族自治区') || title.includes(province + '维吾尔自治区')) {
      return { city: province, region_scope: province };
    }
  }

  return null;
}

/**
 * 将 Scrapling 提取的 item 映射为 bidding_notice 行
 * (对齐 mapZlbxItemToNotice 的输出格式)
 * 如果 city 是"全国"，尝试从标题提取更精确的 location
 */
function mapScraplingItemToNotice(item, platformId) {
  let city = item.city || '广东省';
  let region_scope = item.region_scope || '广东省';

  // 全国性平台：尝试从标题提取省/市
  if (city === '全国' || region_scope === '全国') {
    const extracted = extractLocationFromTitle(item.title);
    if (extracted) {
      city = extracted.city;
      region_scope = extracted.region_scope;
    }
  }

  return {
    platform_id: platformId,
    source_unique_id: item.source_unique_id,
    title: item.title || '',
    notice_type: item.notice_type || 'tender',
    city,
    region_scope,
    publish_date: item.publish_date || new Date().toISOString().slice(0, 10),
    end_date: item.end_date || null,
    budget_amount: item.budget_amount || 0,
    source_url: item.source_url || '',
    notice_content: item.content || '',
    data_source: 'scrapling',
    ai_status: 0,
    keyword_source: item.keyword_source || 'scrapling',
  };
}

/**
 * 记录 crawl_run 开始
 */
async function startCrawlRun(platformId, dataSource, triggerType = 'manual', keywordGroup = null) {
  const { data, error } = await supabaseAdmin
    .from('crawl_run')
    .insert({
      platform_id: platformId,
      data_source: dataSource,
      status: 'running',
      trigger_type: triggerType,
      keyword_group: keywordGroup,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create crawl_run: ${error.message}`);
  return data.id;
}

/**
 * 更新 crawl_run 结束状态
 */
async function finishCrawlRun(runId, stats) {
  const { error } = await supabaseAdmin
    .from('crawl_run')
    .update({
      status: stats.status || 'success',
      pages_crawled: stats.pages_crawled || 0,
      items_found: stats.items_found || 0,
      items_inserted: stats.items_inserted || 0,
      items_skipped: stats.items_skipped || 0,
      items_failed: stats.items_failed || 0,
      spider_strategy: stats.spider_strategy || null,
      error_message: stats.error_message || null,
      duration_ms: stats.duration_ms || 0,
      finished_at: new Date().toISOString(),
    })
    .eq('id', runId);

  if (error) console.error(`[scrapling-client] Failed to update crawl_run: ${error.message}`);
}

/**
 * 获取所有活跃平台（可选：按类型过滤）
 */
async function getActivePlatforms(filters = {}) {
  let query = supabaseAdmin
    .from('platform_source')
    .select('*')
    .eq('is_active', true)
    .not('extraction_selectors', 'is', null);  // 只选有选择器配置的平台

  if (filters.platform_type) {
    query = query.eq('platform_type', filters.platform_type);
  }
  if (filters.region_scope) {
    query = query.eq('region_scope', filters.region_scope);
  }
  if (filters.spider_strategy) {
    query = query.eq('spider_strategy', filters.spider_strategy);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load platforms: ${error.message}`);
  return data || [];
}

module.exports = {
  crawlListing,
  crawlDetail,
  mapScraplingItemToNotice,
  startCrawlRun,
  finishCrawlRun,
  getActivePlatforms,
};
