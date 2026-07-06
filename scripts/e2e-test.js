/**
 * 销售用户 E2E 测试脚本
 * 模拟销售登录后遍历所有页面，检查核心功能
 */
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'http://127.0.0.1:5173';
const SCREENSHOT_DIR = '/tmp/radar-test-screenshots';

(async () => {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const errors = [];
  const passes = [];

  function pass(name) { passes.push(name); console.log(`  PASS  ${name}`); }
  function fail(name, reason) { errors.push({ name, reason }); console.log(`  FAIL  ${name}: ${reason}`); }

  async function screenshot(name) {
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png`, fullPage: false });
  }

  // ── 1. Login Page ──────────────────────────────────────────
  console.log('\n[1/11] 登录页');
  try {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=客户雷达', { timeout: 5000 });
    const hasEmailInput = await page.isVisible('input[type="email"]');
    const hasPasswordInput = await page.isVisible('input[type="password"]');
    const hasLoginBtn = await page.isVisible('button:has-text("登录")');
    const hasForgotLink = await page.isVisible('text=忘记密码');
    if (hasEmailInput && hasPasswordInput && hasLoginBtn) pass('登录页元素完整');
    else fail('登录页元素', `email:${hasEmailInput} pwd:${hasPasswordInput} btn:${hasLoginBtn}`);
    if (hasForgotLink) pass('忘记密码链接');
    else fail('忘记密码链接', '未找到');
    await screenshot('01-login');
  } catch (e) { fail('登录页', e.message); }

  // ── 2. Forgot Password Page ────────────────────────────────
  console.log('\n[2/11] 忘记密码页');
  try {
    await page.click('text=忘记密码');
    await page.waitForSelector('text=重置密码', { timeout: 5000 });
    const hasEmailInput = await page.isVisible('input[type="email"]');
    const hasSendBtn = await page.isVisible('button:has-text("发送")');
    if (hasEmailInput && hasSendBtn) pass('忘记密码页完整');
    else fail('忘记密码页', '元素缺失');
    await screenshot('02-forgot-password');
    await page.goBack();
  } catch (e) { fail('忘记密码页', e.message); }

  // ── 3. Login ───────────────────────────────────────────────
  console.log('\n[3/11] 执行登录');
  try {
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    await page.fill('input[type="email"]', 'admin@leadcom.chat');
    await page.fill('input[type="password"]', 'admin123456');
    await page.click('button:has-text("登录")');
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    pass('登录成功，跳转到 Dashboard');
    await screenshot('03-logged-in');
  } catch (e) { fail('登录', e.message); }

  // ── 4. Dashboard ───────────────────────────────────────────
  console.log('\n[4/11] Dashboard 工作台');
  try {
    await page.waitForSelector('text=标讯总量', { timeout: 5000 });
    const hasTotal = await page.isVisible('text=标讯总量');
    const hasToday = await page.isVisible('text=今日新增');
    const hasStrong = await page.isVisible('text=强推标讯');
    const hasRate = await page.isVisible('text=匹配率');
    const hasDistribution = await page.isVisible('text=匹配等级分布');
    const hasRecent = await page.isVisible('text=最近标讯');
    if (hasTotal && hasToday && hasStrong && hasRate) pass('Dashboard 统计卡片');
    else fail('Dashboard 统计卡片', '部分缺失');
    if (hasDistribution) pass('匹配分布图');
    else fail('匹配分布图', '未找到');
    if (hasRecent) pass('最近标讯列表');
    else fail('最近标讯列表', '未找到');
    await screenshot('04-dashboard');
  } catch (e) { fail('Dashboard', e.message); }

  // ── 5. Notice List ─────────────────────────────────────────
  console.log('\n[5/11] 标讯列表');
  try {
    await page.click('text=标讯');
    await page.waitForSelector('text=标讯列表', { timeout: 5000 });
    const hasFilter = await page.isVisible('button:has-text("强推")');
    const hasCards = await page.locator('a[href^="/notices/"]').count();
    if (hasFilter) pass('等级筛选 Tab');
    else fail('等级筛选', '未找到');
    if (hasCards > 0) pass(`标讯卡片 (${hasCards} 条)`);
    else fail('标讯卡片', '列表为空');
    // Test filter
    await page.click('button:has-text("强推")');
    await page.waitForTimeout(1500);
    const filteredCards = await page.locator('a[href^="/notices/"]').count();
    if (filteredCards > 0) pass(`强推筛选 (${filteredCards} 条)`);
    else fail('强推筛选', '无结果');
    await page.click('button:has-text("全部")');
    await page.waitForTimeout(1000);
    await screenshot('05-notice-list');
  } catch (e) { fail('标讯列表', e.message); }

  // ── 6. Notice Detail ───────────────────────────────────────
  console.log('\n[6/11] 标讯详情');
  try {
    const firstNotice = page.locator('a[href^="/notices/"]').first();
    await firstNotice.click();
    await page.waitForSelector('text=返回列表', { timeout: 5000 });
    const hasTitle = await page.locator('h1').count() > 0;
    const hasMatchResult = await page.isVisible('text=匹配结果');
    const hasBackLink = await page.isVisible('text=返回列表');
    if (hasTitle && hasBackLink) pass('标讯详情页结构');
    else fail('标讯详情页', '结构不完整');
    if (hasMatchResult) pass('匹配结果面板');
    else fail('匹配结果面板', '未找到（可能无匹配数据）');
    await screenshot('06-notice-detail');
    await page.click('text=返回列表');
  } catch (e) { fail('标讯详情', e.message); }

  // ── 7. Search ──────────────────────────────────────────────
  console.log('\n[7/11] 搜索页');
  try {
    await page.click('text=搜索');
    await page.waitForSelector('text=搜索标讯', { timeout: 5000 });
    const hasInput = await page.isVisible('input[placeholder*="关键词"]');
    const hasHotTags = await page.isVisible('text=热门关键词');
    if (hasInput && hasHotTags) pass('搜索页完整');
    else fail('搜索页', '元素缺失');
    // Search for "运维"
    await page.fill('input[placeholder*="关键词"]', '运维');
    await page.click('button:has-text("搜索")');
    await page.waitForTimeout(2000);
    const resultCount = await page.locator('a[href^="/notices/"]').count();
    if (resultCount > 0) pass(`搜索"运维" (${resultCount} 条)`);
    else fail('搜索功能', '无结果');
    await screenshot('07-search');
  } catch (e) { fail('搜索页', e.message); }

  // ── 8. Qualifications ──────────────────────────────────────
  console.log('\n[8/11] 资质管理');
  try {
    await page.click('text=资质');
    await page.waitForSelector('text=资质管理', { timeout: 5000 });
    const hasCompanyTab = await page.isVisible('button:has-text("公司资质")');
    const hasPersonnelTab = await page.isVisible('button:has-text("人员资质")');
    const hasAddBtn = await page.isVisible('button:has-text("新增")');
    if (hasCompanyTab && hasPersonnelTab) pass('资质 Tab 切换');
    else fail('资质 Tab', '缺失');
    if (hasAddBtn) pass('新增按钮（admin 可见）');
    // Test add modal
    await page.click('button:has-text("新增")');
    await page.waitForSelector('text=新增公司资质', { timeout: 3000 });
    const hasForm = await page.isVisible('input[placeholder*="ISO"]');
    if (hasForm) pass('新增弹窗表单');
    else fail('新增弹窗', '表单缺失');
    await page.click('button:has-text("取消")');
    await page.waitForTimeout(500);
    // Switch to personnel
    await page.click('button:has-text("人员资质")');
    await page.waitForTimeout(1000);
    const hasPersonnelData = await page.locator('td').count() > 0;
    if (hasPersonnelData) pass('人员资质数据');
    else fail('人员资质', '无数据');
    await screenshot('08-qualifications');
  } catch (e) { fail('资质管理', e.message); }

  // ── 9. Contracts ───────────────────────────────────────────
  console.log('\n[9/11] 合同业绩库');
  try {
    await page.click('text=合同');
    await page.waitForSelector('text=合同业绩库', { timeout: 5000 });
    const hasSearch = await page.isVisible('input[placeholder*="项目名"]');
    const hasAddBtn = await page.isVisible('button:has-text("新增合同")');
    if (hasSearch) pass('合同搜索框');
    else fail('合同搜索框', '缺失');
    if (hasAddBtn) pass('新增合同按钮');
    // Check if data exists
    const contractRows = await page.locator('td').count();
    if (contractRows > 0) pass('合同数据加载');
    else fail('合同数据', '无数据');
    await screenshot('09-contracts');
  } catch (e) { fail('合同业绩库', e.message); }

  // ── 10. Reports ────────────────────────────────────────────
  console.log('\n[10/11] 数据看板');
  try {
    await page.click('text=报表');
    await page.waitForSelector('text=数据看板', { timeout: 5000 });
    const hasTotalStats = await page.isVisible('text=标讯总量');
    const hasTrendChart = await page.isVisible('text=标讯入库趋势');
    const hasTimeButtons = await page.isVisible('button:has-text("7 天")');
    if (hasTotalStats) pass('报表总览数字');
    else fail('报表总览', '缺失');
    if (hasTrendChart) pass('趋势图');
    else fail('趋势图', '缺失');
    if (hasTimeButtons) pass('时间范围切换');
    // Switch to 7 days
    await page.click('button:has-text("7 天")');
    await page.waitForTimeout(1500);
    pass('7 天视图切换');
    await screenshot('10-reports');
  } catch (e) { fail('数据看板', e.message); }

  // ── 11. Notifications ─────────────────────────────────────
  console.log('\n[11/11] 通知中心');
  try {
    const bellBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
    // Find the bell button (NotificationBell component)
    const bellArea = page.locator('.relative').filter({ hasText: '' }).first();
    // Try clicking the notification bell area
    const allButtons = await page.locator('header button').all();
    let bellClicked = false;
    for (const btn of allButtons) {
      const text = await btn.textContent();
      const hasChild = await btn.locator('svg').count();
      if (hasChild > 0 && !text.includes('登出') && !text.includes('R')) {
        await btn.click();
        bellClicked = true;
        break;
      }
    }
    if (bellClicked) {
      await page.waitForTimeout(1000);
      const hasNotificationTitle = await page.isVisible('text=通知');
      if (hasNotificationTitle) pass('通知下拉面板');
      else fail('通知面板', '未打开');
      await screenshot('11-notifications');
    } else {
      fail('通知中心', '未找到 Bell 按钮');
    }
  } catch (e) { fail('通知中心', e.message); }

  // ── Summary ────────────────────────────────────────────────
  console.log('\n' + '='.repeat(50));
  console.log(`测试结果: ${passes.length} 通过, ${errors.length} 失败`);
  console.log('='.repeat(50));
  if (errors.length > 0) {
    console.log('\n失败项:');
    for (const e of errors) console.log(`  - ${e.name}: ${e.reason}`);
  }
  console.log(`\n截图保存在: ${SCREENSHOT_DIR}/`);

  await browser.close();
  process.exit(errors.length > 0 ? 1 : 0);
})();
