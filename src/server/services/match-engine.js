/**
 * 匹配引擎服务
 * 规则引擎：资格比对 + 扣分计算 + 推荐等级
 */
const { supabaseAdmin } = require('../db');

/**
 * 计算单条标讯的匹配结果
 */
async function calculateMatch(noticeId) {
  console.log(`[match-engine] Calculating match for notice ${noticeId}`);

  // 1. 读取标讯的 AI 提取结果
  const { data: notice, error: noticeError } = await supabaseAdmin
    .from('bidding_notice')
    .select('id, ai_extracted_fields')
    .eq('id', noticeId)
    .single();

  if (noticeError || !notice || !notice.ai_extracted_fields) {
    throw new Error(`Notice ${noticeId} has no AI extracted fields`);
  }

  const extracted = notice.ai_extracted_fields;
  const qualificationRequirements = extracted.qualification_requirements || [];
  const commercialRules = extracted.commercial_scoring_rules || [];

  // 2. 加载公司资质
  const { data: companyQuals } = await supabaseAdmin
    .from('company_qualification')
    .select('*, qualification_ref_id, match_keywords')
    .eq('is_active', true);

  // 3. 加载人员资质
  const { data: personnelQuals } = await supabaseAdmin
    .from('personnel_qualification')
    .select('*, qualification_ref_id, match_keywords')
    .eq('is_active', true);

  // 4. 加载合同（同类业绩）
  const { data: contracts } = await supabaseAdmin
    .from('company_contract')
    .select('*')
    .eq('is_active', true);

  // 5. 匹配计算
  const matchDetails = [];
  const unmatchedItems = [];
  const riskNotes = [];
  let totalDeduction = 0;

  // 5.1 资质匹配
  for (const req of qualificationRequirements) {
    const reqText = req.item.toLowerCase();
    const isMandatory = req.mandatory !== false;

    // 在公司资质中查找匹配
    const companyMatch = findQualificationMatch(reqText, companyQuals, 'company');
    
    // 在人员资质中查找匹配
    const personnelMatch = findQualificationMatch(reqText, personnelQuals, 'personnel');

    if (companyMatch || personnelMatch) {
      matchDetails.push({
        requirement: req.item,
        matched: true,
        deduction: 0,
        source: companyMatch ? 'company' : 'personnel',
        matched_item: companyMatch?.qual_name || personnelMatch?.qual_name,
      });
    } else {
      const deduction = isMandatory ? 3 : 1;
      totalDeduction += deduction;
      
      matchDetails.push({
        requirement: req.item,
        matched: false,
        deduction: deduction,
        source: null,
        matched_item: null,
      });

      unmatchedItems.push({
        requirement: req.item,
        mandatory: isMandatory,
        deduction: deduction,
      });
    }
  }

  // 5.2 商务评分规则匹配
  for (const rule of commercialRules) {
    const ruleText = rule.item.toLowerCase();
    const maxScore = rule.max_score || 0;
    const deductionIfMissing = rule.deduction_if_missing || maxScore;

    // 检查是否有对应的资质或能力
    const hasCapability = checkCapability(ruleText, companyQuals, personnelQuals, contracts);

    if (hasCapability) {
      matchDetails.push({
        requirement: rule.item,
        matched: true,
        deduction: 0,
        max_score: maxScore,
        source: 'capability',
      });
    } else {
      totalDeduction += deductionIfMissing;
      
      matchDetails.push({
        requirement: rule.item,
        matched: false,
        deduction: deductionIfMissing,
        max_score: maxScore,
        source: null,
      });

      unmatchedItems.push({
        requirement: rule.item,
        deduction: deductionIfMissing,
      });
    }
  }

  // 5.3 同类业绩匹配（加分项）
  const similarContracts = findSimilarContracts(extracted, contracts);
  if (similarContracts.length > 0) {
    matchDetails.push({
      requirement: '同类项目经验',
      matched: true,
      deduction: 0,
      source: 'contract',
      matched_items: similarContracts.map(c => c.project_name),
    });
  } else {
    // 同类业绩缺失通常扣2分
    totalDeduction += 2;
    unmatchedItems.push({
      requirement: '同类项目经验',
      deduction: 2,
    });
    riskNotes.push('缺少同类项目经验');
  }

  // 6. 计算推荐等级
  let recommendLevel;
  if (totalDeduction <= 0) {
    recommendLevel = 'strong';
  } else if (totalDeduction <= 2) {
    recommendLevel = 'yes';
  } else if (totalDeduction <= 5) {
    recommendLevel = 'risky';
  } else {
    recommendLevel = 'no';
  }

  // 7. 写入 match_result
  const matchResult = {
    notice_id: noticeId,
    total_deduction: totalDeduction,
    recommend_level: recommendLevel,
    match_details: matchDetails,
    unmatched_items: unmatchedItems.length > 0 ? unmatchedItems : null,
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

  console.log(`[match-engine] Notice ${noticeId}: ${recommendLevel} (deduction: ${totalDeduction})`);
  return saved;
}

/**
 * 查找资质匹配
 */
function findQualificationMatch(requirement, qualifications, type) {
  if (!qualifications || qualifications.length === 0) return null;

  const reqLower = requirement.toLowerCase();

  for (const qual of qualifications) {
    // 1. 直接名称匹配
    if (qual.qual_name.toLowerCase().includes(reqLower) || reqLower.includes(qual.qual_name.toLowerCase())) {
      return qual;
    }

    // 2. match_keywords 匹配
    if (qual.match_keywords && qual.match_keywords.length > 0) {
      for (const keyword of qual.match_keywords) {
        if (reqLower.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(reqLower)) {
          return qual;
        }
      }
    }

    // 3. qual_type 匹配
    if (qual.qual_type && reqLower.includes(qual.qual_type.toLowerCase())) {
      return qual;
    }
  }

  return null;
}

/**
 * 检查能力（资质 + 合同）
 */
function checkCapability(ruleText, companyQuals, personnelQuals, contracts) {
  // 检查公司资质
  if (findQualificationMatch(ruleText, companyQuals, 'company')) return true;
  
  // 检查人员资质
  if (findQualificationMatch(ruleText, personnelQuals, 'personnel')) return true;
  
  // 检查合同经验
  if (contracts && contracts.length > 0) {
    for (const contract of contracts) {
      if (contract.project_name && contract.project_name.toLowerCase().includes(ruleText)) return true;
      if (contract.tech_keywords && contract.tech_keywords.some(kw => ruleText.includes(kw.toLowerCase()))) return true;
    }
  }

  return false;
}

/**
 * 查找同类合同
 */
function findSimilarContracts(extracted, contracts) {
  if (!contracts || contracts.length === 0) return [];

  const projectType = (extracted.project_type || '').toLowerCase();
  const industry = (extracted.industry_type || '').toLowerCase();
  const techKeywords = (extracted.tech_keywords || []).map(kw => kw.toLowerCase());

  // 近3年日期
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  return contracts.filter(contract => {
    // 检查时间窗口
    if (contract.end_date) {
      const endDate = new Date(contract.end_date);
      if (endDate < threeYearsAgo) return false;
    }

    let score = 0;

    // 服务类型匹配
    if (projectType && contract.service_type && 
        contract.service_type.toLowerCase().includes(projectType)) {
      score += 3;
    }

    // 行业匹配
    if (industry && contract.industry && 
        contract.industry.toLowerCase().includes(industry)) {
      score += 2;
    }

    // 技术关键词匹配
    if (techKeywords.length > 0 && contract.tech_keywords) {
      const contractKws = contract.tech_keywords.map(kw => kw.toLowerCase());
      const matchCount = techKeywords.filter(kw => contractKws.some(ckw => ckw.includes(kw) || kw.includes(ckw))).length;
      score += matchCount;
    }

    return score >= 2; // 至少匹配2分才算同类
  });
}

/**
 * 批量计算匹配结果
 */
async function calculatePendingMatches(limit = 50) {
  // 找出 AI 处理完成但没有匹配结果的标讯
  const { data: notices, error } = await supabaseAdmin
    .from('bidding_notice')
    .select('id')
    .eq('ai_status', 4)
    .not('id', 'in', 
      supabaseAdmin.from('match_result').select('notice_id')
    )
    .limit(limit);

  if (error) throw error;
  if (!notices || notices.length === 0) {
    console.log('[match-engine] No pending matches');
    return { calculated: 0, failed: 0 };
  }

  let calculated = 0;
  let failed = 0;

  for (const notice of notices) {
    try {
      await calculateMatch(notice.id);
      calculated++;
    } catch (err) {
      console.error(`[match-engine] Failed for notice ${notice.id}:`, err.message);
      failed++;
    }
  }

  console.log(`[match-engine] Batch complete: ${calculated} calculated, ${failed} failed`);
  return { calculated, failed };
}

module.exports = { calculateMatch, calculatePendingMatches };
