/**
 * 关键词过滤服务 — 统一过滤逻辑
 * 
 * 从 ingestion.js 和 scrapling-client.js 抽取，提供统一的过滤接口
 * 
 * 功能：
 * 1. 排除词过滤（仅检查标题）
 * 2. 省份过滤（支持多省份）
 * 3. 关键词过滤（组内 AND、组间 OR）
 * 4. 正向关键词兜底（IT 核心词）
 * 5. 从标题提取省/市信息
 */

// ============================================================
// 省份 → 主要城市映射（用于从标题提取 location）
// ============================================================

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

// ============================================================
// 正向 IT 关键词（用于兜底过滤）
// ============================================================

const POSITIVE_IT_KEYWORDS = [
  '运维', '维保', 'IT', '信息化', '信息技术', '服务器', '存储', '网络', '数据库', '小型机', '驻场', '机房', '数据中心',
  '系统集成', '弱电', '安防', '监控', '视频会议', '通信', '云计算', '虚拟化', '中间件',
  '安全服务', '信息安全', '网络安全', '网安', '数据安全', '应用系统', '信息中心', '技术支撑', '技术支持',
  '桌面运维', '桌面外包', '网络运维', '系统运维', '基础设施', '计算机', '软件', '硬件', '数据', '数字化',
  '交换机', '路由器', '防火墙', 'UPS', '备份', '容灾', '灾备', '政务', '电子政务',
  'IBM', 'Oracle', 'HP', 'HPE', 'Dell', '华为', '华三', 'H3C', '锐捷', '深信服', '天融信',
  'Power', 'AIX', 'Linux', 'Windows Server', 'VMware', 'Vmware', 'ITO',
];

const POSITIVE_IT_PATTERN = new RegExp(POSITIVE_IT_KEYWORDS.join('|'), 'i');

// ============================================================
// 核心过滤函数
// ============================================================

/**
 * 从标题中提取省/市信息
 * 用于全国性平台（ccgp.gov.cn等）的公告，补充 location 信息
 * @param {string} title - 公告标题
 * @returns {{ city: string, region_scope: string } | null}
 */
function extractLocationFromTitle(title) {
  if (!title) return null;

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
 * 对标讯进行关键词+省份过滤
 * 返回与 keywordGroups 匹配的标讯，排除 excludeKeywords 命中的标讯
 * 
 * @param {Array} notices - 标讯列表
 * @param {Array} keywordGroups - 关键词分组配置
 * @param {Array} excludeKeywords - 排除词列表
 * @param {string|Array} targetProvince - 目标省份（支持多省份）
 * @returns {Array} 过滤后的标讯列表
 */
function filterByKeywords(notices, keywordGroups, excludeKeywords, targetProvince) {
  if (!notices || notices.length === 0) return [];

  // 构建关键词模式：每组内 AND（所有词必须出现），组间 OR（任意组匹配）
  const groupPatterns = (keywordGroups || []).map(group => {
    const subGroups = (group.groups || []).filter(g => g.keywords && g.keywords.length > 0);
    if (subGroups.length === 0) return null;
    return subGroups.map(sg => {
      return sg.keywords.map(k => {
        const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(escaped, 'i');
      });
    });
  }).filter(Boolean);

  // 排除词正则
  const excludePattern = (excludeKeywords && excludeKeywords.length > 0)
    ? new RegExp(excludeKeywords.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i')
    : null;

  return notices.filter(notice => {
    const text = [notice.title, notice.tenderee, notice.tender_agent].filter(Boolean).join(' ');

    // 排除词过滤（仅检查标题，避免采购方公司名误伤）
    const titleText = notice.title || '';
    if (excludePattern && excludePattern.test(titleText)) return false;

    // 省份过滤：支持多省份（数组或逗号分隔字符串）
    if (targetProvince) {
      const region = (notice.city || notice.region_scope || '').toLowerCase();
      const provinces = Array.isArray(targetProvince)
        ? targetProvince.map(p => p.toLowerCase().trim())
        : targetProvince.split(/[,，]/).map(p => p.toLowerCase().trim()).filter(Boolean);
      // 城市或省份必须包含任一目标省份
      if (!provinces.some(p => region.includes(p))) return false;
    }

    // 关键词过滤：至少匹配一组的至少一个子组（子组内 AND，组间 OR）
    if (groupPatterns.length > 0) {
      return groupPatterns.some(subGroups =>
        subGroups.some(ands => ands.every(re => re.test(text)))
      );
    }

    // 正向关键词兜底（检查标题，必须包含至少一个 IT 核心词才放行）
    if (!POSITIVE_IT_PATTERN.test(titleText)) return false;

    return true;
  });
}

/**
 * 构建关键词正则模式（用于其他场景）
 * @param {Array} keywordGroups - 关键词分组配置
 * @returns {Array} 正则模式数组
 */
function buildKeywordPatterns(keywordGroups) {
  return (keywordGroups || []).map(group => {
    const subGroups = (group.groups || []).filter(g => g.keywords && g.keywords.length > 0);
    if (subGroups.length === 0) return null;
    return subGroups.map(sg => {
      return sg.keywords.map(k => {
        const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(escaped, 'i');
      });
    });
  }).filter(Boolean);
}

/**
 * 构建排除词正则模式（用于其他场景）
 * @param {Array} excludeKeywords - 排除词列表
 * @returns {RegExp|null} 排除词正则
 */
function buildExcludePattern(excludeKeywords) {
  if (!excludeKeywords || excludeKeywords.length === 0) return null;
  return new RegExp(excludeKeywords.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');
}

/**
 * 检查标讯是否匹配正向 IT 关键词
 * @param {string} title - 标讯标题
 * @returns {boolean} 是否匹配
 */
function matchesPositiveITKeywords(title) {
  if (!title) return false;
  return POSITIVE_IT_PATTERN.test(title);
}

// ============================================================
// 导出
// ============================================================

module.exports = {
  // 核心过滤函数
  filterByKeywords,
  extractLocationFromTitle,
  
  // 辅助函数
  buildKeywordPatterns,
  buildExcludePattern,
  matchesPositiveITKeywords,
  
  // 常量（供外部使用）
  PROVINCES,
  POSITIVE_IT_KEYWORDS,
};
