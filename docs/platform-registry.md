# 客户雷达 — 广东省目标平台清单

> 维护说明：每新增一个平台，在此处登记并同时写入 `supabase/migrations/` 种子数据。
> 最后更新：2026-07-03 | 总计：56 个平台

---

## 优先级说明

| 阶段 | 数据源 | 说明 |
|---|---|---|
| **Phase 1（MVP）** | 知了标讯 API | 主数据源，通过 API 获取广东省公开招标公告 |
| **Phase 3（扩展）** | 企业自建平台（选 3 个左右） | 逐步对接，需逐个分析技术方案 |
| **长期规划** | 其余平台 | 本清单为长期目标，非短期开发计划 |

> **核心策略**：知了 API 管公开招标（政府+企业），自建平台管聚合平台覆盖不到的企业内部采购。

---

## 一、政府公共资源交易/政采平台 (14个)

| # | 平台名称 | URL | 地域 | 供应商 | 爬虫策略 | 阶段 |
|---|---|---|---|---|---|---|
| 1 | 广东省政府采购网 | gdgpo.czt.gd.gov.cn | 全省 | custom | api_json | 知了覆盖 |
| 2 | 广州公共资源交易中心 | www.gzggzy.cn | 广州 | custom | requests_plain | 知了覆盖 |
| 3 | 深圳市公共资源交易中心 | ggzy.sz.gov.cn | 深圳 | custom | requests_plain | 知了覆盖 |
| 4 | 粤采易阳光采购平台 | www.gdyce.com | 全省 | custom | api_json | 知了覆盖 |
| 5 | 广州国企阳光采购服务平台 | www.gzggzy.com | 广州 | custom | requests_plain | 知了覆盖 |
| 6 | 深圳阳光采购平台 | ggzy.sz.gov.cn | 深圳 | custom | requests_plain | 知了覆盖 |
| 7 | 广东省政府采购中心 | www.gdgpo.com | 全省 | custom | api_json | 知了覆盖 |
| 8 | 新点系-佛山市公共资源交易中心 | ggzy.foshan.gov.cn | 佛山 | epoint | requests_post_xml | 知了覆盖 |
| 9 | 新点系-珠海市公共资源交易中心 | ggzy.zhuhai.gov.cn | 珠海 | epoint | requests_post_xml | 知了覆盖 |
| 10 | 新点系-惠州市公共资源交易中心 | ggzy.huizhou.gov.cn | 惠州 | epoint | requests_post_xml | 知了覆盖 |
| 11 | 新点系-东莞市公共资源交易中心 | ggzy.dg.gov.cn | 东莞 | epoint | requests_post_xml | 知了覆盖 |
| 12 | 新点系-中山市公共资源交易中心 | ggzy.zs.gov.cn | 中山 | epoint | requests_post_xml | 知了覆盖 |
| 13 | 新点系-江门市公共资源交易中心 | ggzy.jiangmen.gov.cn | 江门 | epoint | requests_post_xml | 知了覆盖 |
| 14 | 新点系-湛江市/汕头市/茂名市/肇庆市/揭阳市 | ggzy.*.gov.cn | 各地市 | epoint | requests_post_xml | 知了覆盖 |

> 政府平台数据优先通过知了 API 获取，无需单独开发爬虫。

---

## 二、招标代理机构 (14个)

| # | 平台名称 | URL | 地域 | WAF | 爬虫策略 | 阶段 |
|---|---|---|---|---|---|---|
| 1 | 国e平台（省机电招标中心） | e.gdebidding.com | 全省 | aliyun_dun | requests_with_ja3 | 长期 |
| 2 | 广东广咨国际 | www.gzicc.com.cn | 全省 | - | requests_with_ja3 | 长期 |
| 3 | 诚E招 | www.cnezz.com | 全省 | aliyun_dun | requests_with_ja3 | 长期 |
| 4 | 南方招标与采购交易平台 | www.nfbidding.com | 全省 | - | api_json | 长期 |
| 5 | 恒德易电子交易平台 | www.hdebid.com | 全省 | - | requests_plain | 长期 |
| 6 | 国信招标集团 | www.gtc.com | 全国 | - | requests_plain | 长期 |
| 7 | 中化商务有限公司 | www.sinochembidding.com | 全国 | cloudflare | requests_with_ja3 | 长期 |
| 8 | 广东华伦招标有限公司 | www.gdhualun.com | 全省 | - | requests_plain | 长期 |
| 9 | 广东远东招标代理有限公司 | www.gdydzl.com | 全省 | - | requests_plain | 长期 |
| 10 | 广东省国际工程咨询有限公司 | www.gdiec.com | 全省 | - | requests_plain | 长期 |
| 11 | 广东建设工程招标有限公司 | www.gdjsgczb.com | 全省 | - | requests_plain | 长期 |
| 12 | 广东志正招标有限公司 | www.gdzzzb.com | 全省 | - | requests_plain | 长期 |
| 13 | 广州建筑工程监理有限公司 | www.gzjgjl.com | 广州 | - | requests_plain | 长期 |
| 14 | 深圳市国际招标有限公司 | www.sztc.com | 深圳 | - | requests_with_ja3 | 长期 |

---

## 三、企业自主招标/采购平台 (21个)

> 这些平台不在聚合平台覆盖范围内，是系统的核心差异化价值。Phase 3 从反爬等级 low 的平台开始试点。

### 省属/市属国企 (12个)

| # | 平台名称 | URL | 地域 | 反爬等级 | 爬虫策略 | 认证 | 阶段 |
|---|---|---|---|---|---|---|---|
| 1 | 中国南方电网 | ec.csg.cn | 广东 | high | playwright_undetected | 登录入库 | 长期 |
| 2 | 广东能源集团采购平台 | www.gdeg.com.cn | 广东 | medium | api_with_token | 登录入库 | Phase 3 候选 |
| 3 | 广州地铁采购网 | proc.gzmtr.com | 广州 | medium | api_with_token | 注册供应商 | Phase 3 候选 |
| 4 | 深圳地铁采购系统 | proc.szmc.net | 深圳 | medium | api_with_token | 注册供应商 | Phase 3 候选 |
| 5 | 广东省交通集团采购平台 | proc.gdcp.cn | 广东 | medium | api_with_token | 注册供应商 | 长期 |
| 6 | 广东省建工集团采购平台 | proc.gdcg.com | 广东 | medium | api_with_token | 注册供应商 | 长期 |
| 7 | 广东省广新控股集团采购平台 | proc.gdxhkg.com | 广东 | low | api_with_token | 注册供应商 | Phase 3 优先 |
| 8 | 广东省粤海控股集团采购平台 | proc.gdyhkg.com | 广东 | low | api_with_token | 注册供应商 | Phase 3 优先 |
| 9 | 广东省恒健投资控股采购平台 | proc.gdhjtz.com | 广东 | low | api_with_token | 注册供应商 | Phase 3 优先 |
| 10 | 广汽集团采购平台 | proc.gac.com.cn | 广州 | medium | api_with_token | 注册供应商 | 长期 |
| 11 | 深圳市投资控股采购平台 | proc.sztkg.com | 深圳 | low | api_with_token | 注册供应商 | Phase 3 优先 |
| 12 | 国家电网电子商务平台 | ecp.sgcc.com.cn | 全国 | high | playwright_undetected | 登录入库 | 长期 |

### 民营大厂 (9个)

| # | 平台名称 | URL | 地域 | 爬虫策略 | 认证方式 | 阶段 |
|---|---|---|---|---|---|---|
| 1 | 华为采购门户 | supplier.huawei.com | 深圳 | playwright_undetected | 供应商审核入库 | 长期 |
| 2 | 比亚迪采购平台 | ep.byd.com | 深圳 | api_with_token | 注册供应商 | 长期 |
| 3 | 腾讯采购网 | procurement.tencent.com | 深圳 | api_with_token | 入库后 Token | 长期 |
| 4 | 美的集团供应链平台 | supplier.midea.com | 佛山 | api_with_token | 入库后 Token | 长期 |
| 5 | 格力电器供应链平台 | supplier.gree.com | 珠海 | api_with_token | 入库后 Token | 长期 |
| 6 | 大疆创新采购门户 | supplier.dji.com | 深圳 | api_with_token | 供应商入库 | 长期 |
| 7 | 中兴通讯采购平台 | proc.zte.com.cn | 深圳 | api_with_token | 注册供应商 | 长期 |
| 8 | TCL采购平台 | proc.tcl.com | 惠州 | api_with_token | 供应商入库 | 长期 |
| 9 | 万科采筑平台 | www.caiwoo.com | 深圳 | api_with_token | 注册供应商 | 长期 |

---

## 四、第三方聚合平台 (7个)

| # | 平台名称 | URL | 反爬等级 | 爬虫策略 | 阶段 |
|---|---|---|---|---|---|
| 1 | 知了标讯 | ai.zhiliaobiaoxun.com | - | api_json | **Phase 1 主源** |
| 2 | 千里马招标网 | www.qianlima.com | medium | requests_with_ja3 | 长期 |
| 3 | 剑鱼招标网 | www.jianyu360.com | low | api_json | **已放弃**（无API） |
| 4 | 中国采购与招标网 | www.chinabidding.com | medium | requests_with_ja3 | 长期 |
| 5 | 中国招标网 | www.zbcg.cn | low | api_json | 长期 |
| 6 | 标讯快车 | www.biaoxunkuaiche.com | low | requests_plain | 长期 |
| 7 | 招标信息网 | www.bidnews.cn | low | requests_plain | 长期 |

---

## 五、统计汇总

| 类型 | 数量 | MVP 阶段 | Phase 3 | 长期 |
|---|---|---|---|---|
| 政府/政采平台 | 14 | 知了 API 覆盖 | - | - |
| 招标代理机构 | 14 | - | - | 14 |
| 企业 SRM | 21 | - | 3-4 个试点 | 21 |
| 聚合平台 | 7 | 1（知了） | - | 6 |
| **总计** | **56** | **1** | **3-4** | **56** |

### Phase 3 企业平台优先级建议

从反爬等级 low 的省属国企开始：
1. 广东省广新控股集团采购平台
2. 广东省粤海控股集团采购平台
3. 广东省恒健投资控股采购平台
4. 深圳市投资控股采购平台
