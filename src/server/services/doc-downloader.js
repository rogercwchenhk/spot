/**
 * 招标文件下载服务
 * 只处理 tender 类型标讯，优先下载 ZIP（含完整招标文件），跳过代理协议等无效文件
 */
const { supabaseAdmin } = require('../db');
const { getBidDetail } = require('./zhiliao-api');
const AdmZip = require('adm-zip');

const STORAGE_BUCKET = 'bid-documents';
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function inferFileType(url) {
  const m = url.toLowerCase().match(/\.(\w+)(\?|$)/);
  const ext = m?.[1];
  if (['pdf', 'docx', 'doc', 'zip'].includes(ext)) return ext;
  return 'pdf';
}

/**
 * 从 ZIP 中识别招标文件（最大的 PDF/DOCX）
 */
function findBiddingDocInZip(zipBuffer) {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries().filter(e => {
    const name = e.entryName.toLowerCase();
    return !e.isDirectory && (name.endsWith('.pdf') || name.endsWith('.docx') || name.endsWith('.doc'));
  });
  if (entries.length === 0) return null;
  // 优先含"招标"
  const bidding = entries.find(e => /招标|采购文件/.test(e.entryName));
  if (bidding) return bidding;
  // 否则最大的
  entries.sort((a, b) => b.header.size - a.header.size);
  return entries[0];
}

async function downloadToBuffer(url) {
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(60000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const buffer = Buffer.from(await resp.arrayBuffer());
  if (buffer.length > MAX_FILE_SIZE) throw new Error(`过大 ${(buffer.length/1024/1024).toFixed(1)}MB`);
  return buffer;
}

async function uploadToStorage(buffer, storagePath, contentType) {
  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Storage: ${error.message}`);
}

/**
 * 对附件 URL 列表做智能筛选
 * 有 ZIP → 只下载 ZIP（里面已有完整招标文件）
 * 无 ZIP → 下载 PDF/DOCX（可能是代理协议，但先保留）
 */
function filterAttachments(urls) {
  const zips = urls.filter(u => /\.zip(\?|$)/i.test(u));
  if (zips.length > 0) return { type: 'zip', urls: zips };
  const docs = urls.filter(u => /\.(pdf|docx?)(\?|$)/i.test(u));
  return { type: 'doc', urls: docs };
}

async function downloadNoticeDoc(noticeId) {
  console.log(`[doc-downloader] #${noticeId}`);

  const { data: notice, error } = await supabaseAdmin
    .from('bidding_notice')
    .select('id, title, source_url, source_unique_id, doc_access_type, notice_type')
    .eq('id', noticeId).single();
  if (error || !notice) return { status: 'error', message: '标讯不存在' };
  if (!notice.source_url) return { status: 'skip', message: '无来源链接' };

  // 已有成功记录则跳过
  const { data: existing } = await supabaseAdmin
    .from('bid_document').select('id').eq('notice_id', noticeId).eq('download_status', 'completed');
  if (existing?.length > 0) return { status: 'skip', message: '已有记录' };

  // 调用知了 API
  let detail;
  try {
    detail = await getBidDetail(notice.source_unique_id, { bid_url: notice.source_url });
  } catch (err) {
    await recordFailure(noticeId, notice.source_url, 'API 失败: ' + err.message);
    return { status: 'fail', message: 'API 失败' };
  }

  const allUrls = detail.attachment_urls || [];
  if (allUrls.length === 0) {
    await supabaseAdmin.from('bidding_notice').update({ doc_access_type: 'registration_required' }).eq('id', noticeId);
    await recordFailure(noticeId, notice.source_url, '无附件');
    return { status: 'fail', message: '无附件' };
  }

  // 智能筛选：有 ZIP 只下 ZIP，无 ZIP 才下 PDF/DOCX
  const filtered = filterAttachments(allUrls);
  const urlsToDownload = filtered.urls;
  console.log(`  附件${allUrls.length}个, 筛选后${urlsToDownload.length}个 (${filtered.type})`);

  const results = [];
  for (const url of urlsToDownload) {
    const fileType = inferFileType(url);
    const fileName = url.split('/').pop().split('?')[0] || `file.${fileType}`;
    const storagePath = `${noticeId}/${fileName}`;

    try {
      const buffer = await downloadToBuffer(url);
      await uploadToStorage(buffer, storagePath);

      // ZIP 解压
      if (fileType === 'zip') {
        console.log(`  解压 ZIP`);
        const entry = findBiddingDocInZip(buffer);
        if (entry) {
          const rawName = entry.entryName.split('/').pop();
          const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_');
          const extractedPath = `${noticeId}/${safeName}`;
          const extractedBuf = entry.getData();
          const extractedType = inferFileType(safeName);

          await uploadToStorage(extractedBuf, extractedPath, `application/${extractedType}`);
          await supabaseAdmin.from('bid_document').insert({
            notice_id: noticeId, file_name: safeName, file_type: extractedType,
            file_size: extractedBuf.length, storage_path: extractedPath,
            source_download_url: url, download_status: 'completed',
            downloaded_at: new Date().toISOString(),
          });
          results.push({ name: safeName, type: extractedType, size: extractedBuf.length });
          console.log(`  提取: ${safeName} (${(extractedBuf.length/1024).toFixed(0)}KB)`);
        }
      }

      // 记录原始文件
      await supabaseAdmin.from('bid_document').insert({
        notice_id: noticeId, file_name: fileName, file_type: fileType,
        file_size: buffer.length, storage_path,
        source_download_url: url, download_status: 'completed',
        downloaded_at: new Date().toISOString(),
      });
      if (fileType !== 'zip') results.push({ name: fileName, type: fileType, size: buffer.length });

    } catch (err) {
      console.error(`  失败 ${fileName}: ${err.message}`);
      await supabaseAdmin.from('bid_document').insert({
        notice_id: noticeId, file_name: fileName, file_type: fileType,
        storage_path, source_download_url: url,
        download_status: 'failed', error_message: err.message,
      });
    }
  }

  if (results.length > 0) {
    await supabaseAdmin.from('bidding_notice').update({ doc_access_type: 'free' }).eq('id', noticeId);
    return { status: 'success', message: `${results.length} 个文件`, documents: results };
  }
  return { status: 'fail', message: '全部失败' };
}

async function recordFailure(noticeId, url, msg) {
  await supabaseAdmin.from('bid_document').insert({
    notice_id: noticeId, file_name: 'unknown', file_type: 'unknown',
    storage_path: '', source_download_url: url,
    download_status: 'failed', error_message: msg,
  });
}

/**
 * 批量下载 — 只处理 tender 类型，优先有附件的
 */
async function downloadBatch(limit = 20) {
  console.log(`[doc-downloader] 批量 ${limit} 条 (仅 tender)`);
  const { data: notices, error } = await supabaseAdmin
    .from('bidding_notice').select('id, title')
    .eq('doc_access_type', 'unknown')
    .eq('notice_type', 'tender')
    .not('source_url', 'is', null)
    .order('publish_date', { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  if (!notices?.length) return { success: 0, failed: 0, skipped: 0, total: 0 };

  let success = 0, failed = 0, skipped = 0;
  for (const n of notices) {
    try {
      const r = await downloadNoticeDoc(n.id);
      if (r.status === 'success') success++;
      else if (r.status === 'skip') skipped++;
      else failed++;
      await new Promise(r => setTimeout(r, 2500)); // 限流：每2.5秒一条
    } catch (e) { failed++; }
  }
  return { success, failed, skipped, total: notices.length };
}

async function getSignedUrl(storagePath) {
  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET).createSignedUrl(storagePath, 3600);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

module.exports = { downloadNoticeDoc, downloadBatch, getSignedUrl };
