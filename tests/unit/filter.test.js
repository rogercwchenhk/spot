/**
 * 关键词过滤服务单元测试
 * 
 * 测试 filter.js 中的核心过滤逻辑
 */

const { filterByKeywords, extractLocationFromTitle, matchesPositiveITKeywords } = require('../../src/server/services/filter');

// ============================================================
// 测试工具函数
// ============================================================

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertArrayEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// ============================================================
// 测试用例
// ============================================================

function testExtractLocationFromTitle() {
  console.log('Testing extractLocationFromTitle...');
  
  // 测试城市匹配
  const result1 = extractLocationFromTitle('广州市政府采购项目');
  assertEqual(result1.city, '广州', '城市匹配');
  assertEqual(result1.region_scope, '广东', '省份匹配');
  
  // 测试省份匹配
  const result2 = extractLocationFromTitle('广东省政府采购项目');
  assertEqual(result2.city, '广东', '省份匹配-城市');
  assertEqual(result2.region_scope, '广东', '省份匹配-省份');
  
  // 测试全国性标题
  const result3 = extractLocationFromTitle('中央政府采购项目');
  assertEqual(result3, null, '全国性标题返回null');
  
  // 测试空标题
  const result4 = extractLocationFromTitle('');
  assertEqual(result4, null, '空标题返回null');
  
  // 测试null标题
  const result5 = extractLocationFromTitle(null);
  assertEqual(result5, null, 'null标题返回null');
  
  console.log('✓ extractLocationFromTitle tests passed');
}

function testFilterByKeywords() {
  console.log('Testing filterByKeywords...');
  
  const keywordGroups = [
    {
      name: '核心设备运维',
      groups: [
        { keywords: ['运维', '小型机'], match_modes: ['sm', 'title'] },
        { keywords: ['维保', '存储'], match_modes: ['sm', 'title'] },
      ],
    },
  ];
  
  const excludeKeywords = ['建筑', '施工', '监理'];
  
  // 测试正常过滤
  const notices1 = [
    { title: '广州市小型机运维项目', city: '广东', region_scope: '广东' },
    { title: '深圳市存储维保项目', city: '广东', region_scope: '广东' },
    { title: '北京市建筑施工项目', city: '北京', region_scope: '北京' },
  ];
  
  const result1 = filterByKeywords(notices1, keywordGroups, excludeKeywords, '广东');
  assertEqual(result1.length, 2, '正常过滤-数量');
  assertEqual(result1[0].title, '广州市小型机运维项目', '正常过滤-第一条');
  assertEqual(result1[1].title, '深圳市存储维保项目', '正常过滤-第二条');
  
  // 测试排除词过滤
  const notices2 = [
    { title: '广州市小型机运维项目', city: '广东', region_scope: '广东' },
    { title: '深圳市建筑施工项目', city: '广东', region_scope: '广东' },
  ];
  
  const result2 = filterByKeywords(notices2, keywordGroups, excludeKeywords, '广东');
  assertEqual(result2.length, 1, '排除词过滤-数量');
  assertEqual(result2[0].title, '广州市小型机运维项目', '排除词过滤-第一条');
  
  // 测试省份过滤
  const notices3 = [
    { title: '广州市小型机运维项目', city: '广东', region_scope: '广东' },
    { title: '北京市小型机运维项目', city: '北京', region_scope: '北京' },
  ];
  
  const result3 = filterByKeywords(notices3, keywordGroups, excludeKeywords, '广东');
  assertEqual(result3.length, 1, '省份过滤-数量');
  assertEqual(result3[0].title, '广州市小型机运维项目', '省份过滤-第一条');
  
  // 测试空数组
  const result4 = filterByKeywords([], keywordGroups, excludeKeywords, '广东');
  assertEqual(result4.length, 0, '空数组返回空数组');
  
  // 测试null数组
  const result5 = filterByKeywords(null, keywordGroups, excludeKeywords, '广东');
  assertEqual(result5.length, 0, 'null数组返回空数组');
  
  console.log('✓ filterByKeywords tests passed');
}

function testMatchesPositiveITKeywords() {
  console.log('Testing matchesPositiveITKeywords...');
  
  // 测试匹配
  assert(matchesPositiveITKeywords('广州市运维项目'), '匹配运维');
  assert(matchesPositiveITKeywords('深圳市服务器维保项目'), '匹配服务器');
  assert(matchesPositiveITKeywords('IBM小型机运维项目'), '匹配IBM');
  assert(matchesPositiveITKeywords('Oracle数据库维保项目'), '匹配Oracle');
  
  // 测试不匹配
  assert(!matchesPositiveITKeywords('广州市建筑施工项目'), '不匹配建筑');
  assert(!matchesPositiveITKeywords('深圳市食堂餐饮项目'), '不匹配食堂');
  
  // 测试空字符串
  assert(!matchesPositiveITKeywords(''), '空字符串不匹配');
  assert(!matchesPositiveITKeywords(null), 'null不匹配');
  
  console.log('✓ matchesPositiveITKeywords tests passed');
}

function testEdgeCases() {
  console.log('Testing edge cases...');
  
  const keywordGroups = [
    {
      name: '测试组',
      groups: [
        { keywords: ['运维'], match_modes: ['sm', 'title'] },
      ],
    },
  ];
  
  // 测试无关键词组
  const notices1 = [
    { title: '广州市运维项目', city: '广东', region_scope: '广东' },
  ];
  
  const result1 = filterByKeywords(notices1, [], [], '广东');
  // 无关键词组时，使用正向关键词兜底
  assertEqual(result1.length, 1, '无关键词组-使用正向关键词');
  
  // 测试无目标省份
  const result2 = filterByKeywords(notices1, keywordGroups, [], null);
  assertEqual(result2.length, 1, '无目标省份-通过');
  
  // 测试多省份
  const notices2 = [
    { title: '广州市运维项目', city: '广东', region_scope: '广东' },
    { title: '深圳市运维项目', city: '广东', region_scope: '广东' },
    { title: '北京市运维项目', city: '北京', region_scope: '北京' },
  ];
  
  const result3 = filterByKeywords(notices2, keywordGroups, [], ['广东', '北京']);
  assertEqual(result3.length, 3, '多省份-全部通过');
  
  console.log('✓ edge cases tests passed');
}

// ============================================================
// 运行测试
// ============================================================

function runAllTests() {
  console.log('=== 关键词过滤服务单元测试 ===\n');
  
  try {
    testExtractLocationFromTitle();
    testFilterByKeywords();
    testMatchesPositiveITKeywords();
    testEdgeCases();
    
    console.log('\n✓ 所有测试通过！');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ 测试失败:', error.message);
    process.exit(1);
  }
}

runAllTests();
