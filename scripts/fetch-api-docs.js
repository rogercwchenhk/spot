const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // 获取 API 文档主页
  console.log('正在加载 API 文档主页...');
  await page.goto('https://ai.zhiliaobiaoxun.com/docs/api', {
    waitUntil: 'networkidle',
    timeout: 30000,
  });
  await page.waitForTimeout(2000);

  // 提取所有 API 端点链接
  const links = await page.evaluate(() => {
    const anchors = document.querySelectorAll('a[href*="/docs/api/"]');
    return Array.from(anchors).map(a => ({
      text: a.innerText.trim(),
      href: a.href
    }));
  });

  console.log('\n=== 可用 API 端点 ===');
  links.forEach(l => console.log(`  ${l.text}: ${l.href}`));

  // 查找与 bid_detail 或下载相关的端点
  const relevantLinks = links.filter(l => 
    l.text.includes('详情') || 
    l.text.includes('detail') || 
    l.text.includes('下载') || 
    l.text.includes('download') ||
    l.text.includes('文件') ||
    l.text.includes('file')
  );

  if (relevantLinks.length > 0) {
    console.log('\n=== 可能相关的端点 ===');
    relevantLinks.forEach(l => console.log(`  ${l.text}: ${l.href}`));
    
    // 访问第一个相关端点
    console.log('\n访问:', relevantLinks[0].text);
    await page.goto(relevantLinks[0].href, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    const content = await page.evaluate(() => {
      const main = document.querySelector('main') || document.body;
      return main.innerText;
    });
    
    console.log('\n=== 文档内容 ===\n');
    console.log(content.substring(0, 3000));
  } else {
    console.log('\n未找到明显的详情/下载相关端点');
    
    // 列出所有端点的简要描述
    console.log('\n=== 所有端点概览 ===');
    links.forEach(l => console.log(`  ${l.text}`));
  }

  await browser.close();
})();
