/**
 * 匹配引擎服务 (v2)
 * 启发式匹配：基于公司能力 vs 标讯需求的契合度
 * 注意：标讯不含招标文件正文，无法获取资质要求和评分标准
 * 匹配基于：技术关键词、行业经验、项目类型、地区、合同业绩
 */
const { supabaseAdmin } = require('../db');

/**
 * 计算单条标讯的匹配结果
 */
async function calculateMatch(noticeId) {
  console.log(`[match-engine] Calculating match for notice ${noticeId}`);

  const { data: notice, error: noticeError } = await supabaseAdmin
    .from('bidding_notice')
    .select('*')
    .eq('id', noticeId)
    .single();

  if (noticeError || !notice) {
    throw new Error(`Notice not found: ${noticeId}`);
  }

  if (!notice.ai_extracted_fields) {
    throw new Error(`Notice ${noticeId} has no AI extracted fields (run ai-pipeline first)`);
  }

  const extracted = notice.ai_extracted_fields;

  // 加载公司能力数据
  const { data: companyQuals } = await supabaseAdmin
    .from('company_qualification')
    .select('*')
    .eq('is_active', true);

  const { data: personnelQuals } = await supabaseAdmin
    .from('personnel_qualification')
    .select('*')
    .eq('is_active', true);

  const { data: contracts } = await supabaseAdmin
    .from('company_contract')
    .select('*')
    .eq('is_active', true);

  const matchDetails = [];
  const riskNotes = [];
  let totalScore = 0; // 满分 100

  // ─────────────────────────────────────────────
  // 1. 技术关键词匹配 (最高 30 分)
  // ─────────────────────────────────────────────
  const noticeTechKw = (extracted.tech_keywords || []).map(k => k.toLowerCase());
  const matchedTechKw = [];
  const unmatchedTechKw = [];

  if (noticeTechKw.length > 0) {
    // 合并所有公司资质关键词
    const companyKw = [
      ...(companyQuals || []).map(q => q.qual_name?.toLowerCase() || ''),
      ...(companyQuals || []).map(q => q.scope?.toLowerCase() || ''),
      ...(personnelQuals || []).map(q => q.qual_name?.toLowerCase() || ''),
    ].join(' ');

    // 合并合同关键词
    const contractKw = (contracts || []).flatMap(c => (c.tech_keywords || []).map(k => k.toLowerCase()));
    const allCompanyKw = companyKw + ' ' + contractKw.join(' ');

    for (const kw of noticeTechKw) {
      if (allCompanyKw.includes(kw)) {
        matchedTechKw.push(kw);
      } else {
        unmatchedTechKw.push(kw);
      }
    }

    const techScore = Math.round((matchedTechKw.length / noticeTechKw.length) * 30);
    totalScore += techScore;

    matchDetails.push({
      dimension: '技术关键词',
      score: techScore,
      max_score: 30,
      matched: matchedTechKw,
      unmatched: unmatchedTechKw,
    });

    if (unmatchedTechKw.length > 0) {
      riskNotes.push(`技术缺口: ${unmatchedTechKw.join('、')}`);
    }
  } else {
    // 没有技术关键词，给中间分
    totalScore += 15;
    matchDetails.push({ dimension: '技术关键词', score: 15, max_score: 30, note: '标讯未提取到技术关键词' });
  }

  // ─────────────────────────────────────────────
  // 2. 行业经验匹配 (最高 25 分)
  // ─────────────────────────────────────────────
  const noticeIndustry = (extracted.industry_type || '').toLowerCase();
  let industryMatched = false;

  if (noticeIndustry && noticeIndustry !== 'other') {
    const contractIndustries = (contracts || []).map(c => (c.industry || '').toLowerCase());
    industryMatched = contractIndustries.some(ci => ci.includes(noticeIndustry) || noticeIndustry.includes(ci));

    const industryScore = industryMatched ? 25 : 5;
    totalScore += industryScore;

    matchDetails.push({
      dimension: '行业经验',
      score: industryScore,
      max_score: 25,
      notice_industry: noticeIndustry,
      matched: industryMatched,
      company_industries: [...new Set(contractIndustries.filter(Boolean))],
    });

    if (!industryMatched) {
      riskNotes.push(`无${noticeIndustry}行业经验`);
    }
  } else {
    totalScore += 12;
    matchDetails.push({ dimension: '行业经验', score: 12, max_score: 25, note: '行业类型不明确' });
  }

  // ─────────────────────────────────────────────
  // 3. 项目类型匹配 (最高 20 分)
  // ─────────────────────────────────────────────
  const noticeProjectType = (extracted.project_type || '').toLowerCase();
  let projectTypeMatched = false;

  if (noticeProjectType && noticeProjectType !== 'other') {
    const contractTypes = (contracts || []).map(c => (c.service_type || '').toLowerCase());
    projectTypeMatched = contractTypes.some(ct => ct.includes(noticeProjectType) || noticeProjectType.includes(ct));

    const typeScore = projectTypeMatched ? 20 : 5;
    totalScore += typeScore;

    matchDetails.push({
      dimension: '项目类型',
      score: typeScore,
      max_score: 20,
      notice_type: noticeProjectType,
      matched: projectTypeMatched,
      company_types: [...new Set(contractTypes.filter(Boolean))],
    });

    if (!projectTypeMatched) {
      riskNotes.push(`无${noticeProjectType}类型经验`);
    }
  } else {
    totalScore += 10;
    matchDetails.push({ dimension: '项目类型', score: 10, max_score: 20, note: '项目类型不明确' });
  }

  // ─────────────────────────────────────────────
  // 4. 地区匹配 (最高 15 分)
  // ─────────────────────────────────────────────
  const noticeRegion = (extracted.region || notice.region_scope || notice.city || '').toLowerCase();
  let regionMatched = false;

  if (noticeRegion) {
    const contractRegions = (contracts || []).map(c => (c.region || '').toLowerCase());
    // 广东省内各市视为匹配
    const guangdongCities = ['广州', '深圳', '佛山', '东莞', '珠海', '中山', '惠州', '江门', '肇庆', '汕头', '韶关', '湛江', '茂名', '梅州', '汕尾', '河源', '阳江', '清远', '潮州', '揭阳', '云浮'];
    const isGuangdong = (r) => r.includes('广东') || guangdongCities.some(c => r.includes(c.toLowerCase()));

    regionMatched = contractRegions.some(cr =>
      cr.includes(noticeRegion) || noticeRegion.includes(cr) ||
      (isGuangdong(cr) && isGuangdong(noticeRegion))
    );

    const regionScore = regionMatched ? 15 : 8;
    totalScore += regionScore;

    matchDetails.push({
      dimension: '地区匹配',
      score: regionScore,
      max_score: 15,
      notice_region: noticeRegion,
      matched: regionMatched,
    });
  } else {
    totalScore += 8;
    matchDetails.push({ dimension: '地区匹配', score: 8, max_score: 15, note: '地区不明确' });
  }

  // ─────────────────────────────────────────────
  // 5. 同类业绩匹配 (最高 10 分)
  // ─────────────────────────────────────────────
  const similarContracts = findSimilarContracts(extracted, contracts || []);
  if (similarContracts.length > 0) {
    totalScore += 10;
    matchDetails.push({
      dimension: '同类业绩',
      score: 10,
      max_score: 10,
      matched: true,
      contracts: similarContracts.map(c => c.project_name),
    });
  } else {
    totalScore += 0;
    matchDetails.push({ dimension: '同类业绩', score: 0, max_score: 10, matched: false });
    riskNotes.push('缺少同类项目业绩');
  }

  // ─────────────────────────────────────────────
  // 计算推荐等级
  // ─────────────────────────────────────────────
  let recommendLevel;
  if (totalScore >= 80) {
    recommendLevel = 'strong';
  } else if (totalScore >= 60) {
    recommendLevel = 'yes';
  } else if (totalScore >= 40) {
    recommendLevel = 'risky';
  } else {
    recommendLevel = 'no';
  }

  // total_deduction 字段保留用于兼容，表示"距离满分差多少分"
  const totalDeduction = 100 - totalScore;

  const matchResult = {
    notice_id: noticeId,
    total_deduction: totalDeduction,
    recommend_level: recommendLevel,
    match_details: matchDetails,
    unmatched_items: null,
    risk_notes: riskNotes.length > 0 ? riskNotes : null,
  };

  const { data: saved, error: saveError } = await supabaseAdmin
    .from('match_result')
    .upsert(matchResult, { onConflict: 'notice_id' })
    .select()
    .single();

  if (saveError) {
    console.error('[match-engine] Save error:', saveError.message);
    throw saveError;
  }

  console.log(`[match-engine] Notice ${noticeId}: ${recommendLevel} (score: ${totalScore}/100)`);
  return saved;
}

/**
 * 查找同类合同
 */
function findSimilarContracts(extracted, contracts) {
  if (!contracts || contracts.length === 0) return [];

  const projectType = (extracted.project_type || '').toLowerCase();
  const industry = (extracted.industry_type || '').toLowerCase();
  const techKeywords = (extracted.tech_keywords || []).map(kw => kw.toLowerCase());

  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  return contracts.filter(contract => {
    if (contract.end_date) {
      const endDate = new Date(contract.end_date);
      if (endDate < threeYearsAgo) return false;
    }

    let score = 0;

    if (projectType && projectType !== 'other' && contract.service_type &&
        contract.service_type.toLowerCase().includes(projectType)) {
      score += 3;
    }

    if (industry && industry !== 'other' && contract.industry &&
        contract.industry.toLowerCase().includes(industry)) {
      score += 2;
    }

    if (techKeywords.length > 0 && contract.tech_keywords) {
      const contractKws = contract.tech_keywords.map(kw => kw.toLowerCase());
      const matchCount = techKeywords.filter(kw => contractKws.some(ckw => ckw.includes(kw) || kw.includes(ckw))).length;
      score += matchCount;
    }

    return score >= 2;
  });
}

/**
 * 批量计算匹配结果
 */
async function calculatePendingMatches(limit = 250) {
  // 获取已有匹配结果的 notice_id
  const { data: existingMatches } = await supabaseAdmin
    .from('match_result')
    .select('notice_id');

  const existingIds = new Set((existingMatches || []).map(m => m.notice_id));

  // 获取 AI 处理完成的标讯
  const { data: notices, error } = await supabaseAdmin
    .from('bidding_notice')
    .select('id')
    .eq('ai_status', 4)
    .order('publish_date', { ascending: false })
    .limit(limit);

  if (error) throw error;

  const pending = (notices || []).filter(n => !existingIds.has(n.id));

  if (pending.length === 0) {
    console.log('[match-engine] No pending matches');
    return { calculated: 0, failed: 0 };
  }

  let calculated = 0;
  let failed = 0;
  const matchedIds = [];

  for (const notice of pending) {
    try {
      await calculateMatch(notice.id);
      matchedIds.push(notice.id);
      calculated++;
    } catch (err) {
      console.error(`[match-engine] Failed for notice ${notice.id}:`, err.message);
      failed++;
    }
  }

  console.log(`[match-engine] Batch complete: ${calculated} calculated, ${failed} failed`);
  return { calculated, failed, matchedIds };
}

module.exports = { calculateMatch, calculatePendingMatches };
