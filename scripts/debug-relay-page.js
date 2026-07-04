/**
 * 调试脚本：查看知了中转页的实际 HTML 结构
 */
const cheerio = require('cheerio');

(async () => {
  const url = 'https://www.zhiliaobiaoxun.com/content/509480774/b2?sk=CA21D4ADF408EA39DE8A9264B';
  console.log('抓取知了中转页:', url);

  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    redirect: 'follow',
  });

  console.log('Status:', resp.status);
  console.log('Final URL:', resp.url);
  console.log('Content-Type:', resp.headers.get('content-type'));

  const html = await resp.text();
  console.log('HTML 长度:', html.length);

  const $ = cheerio.load(html);

  console.log('\n--- 页面 title ---');
  console.log($('title').text());

  console.log('\n--- 所有外部链接 ---');
  $('a').each((i, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim().substring(0, 80);
    if (href && href.startsWith('http')) {
      console.log(`  [${text}] -> ${href.substring(0, 150)}`);
    }
  });

  console.log('\n--- meta 标签 ---');
  $('meta').each((i, el) => {
    const name = $(el).attr('name') || $(el).attr('http-equiv') || '';
    const content = $(el).attr('content') || '';
    if (name) console.log(`  ${name}: ${content.substring(0, 120)}`);
  });

  console.log('\n--- 含 download/file/pdf/doc 的链接 ---');
  $('a').each((i, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().trim();
    if (/download|file|pdf|doc|attach|招标|附件/i.test(href + text)) {
      console.log(`  [${text.substring(0, 60)}] -> ${href.substring(0, 150)}`);
    }
  });

  console.log('\n--- 按钮/下载相关元素 ---');
  $('[class*=download], [id*=download], [class*=btn], button').each((i, el) => {
    const tag = el.tagName;
    const cls = $(el).attr('class') || '';
    const text = $(el).text().trim().substring(0, 60);
    console.log(`  <${tag} class="${cls}"> ${text}`);
  });

  // 打印 body 文本的前 500 字
  console.log('\n--- body 文本 (前 500 字) ---');
  console.log($('body').text().replace(/\s+/g, ' ').substring(0, 500));
})();
