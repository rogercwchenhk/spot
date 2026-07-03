# 客户雷达 — 广东省目标平台清单

> 维护说明：每新增一个平台，在此处登记并同时写入 `supabase/migrations/` 种子数据。
> 最后更新：2026-07-03 | 总计：62 个平台

---

## 一、政府公共资源交易/政采平台 (14个)

| # | 平台名称 | URL | 地域 | 供应商 | 爬虫策略 |
|---|---|---|---|---|---|
| 1 | 广东省政府采购网 | gdgpo.czt.gd.gov.cn | 全省 | custom | api_json |
| 2 | 广州公共资源交易中心 | www.gzggzy.cn | 广州 | custom | requests_plain |
| 3 | 深圳市公共资源交易中心 | ggzy.sz.gov.cn | 深圳 | custom | requests_plain |
| 4 | 粤采易阳光采购平台 | www.gdyce.com | 全省 | custom | api_json |
| 5 | 广州国企阳光采购服务平台 | www.gzggzy.com | 广州 | custom | requests_plain |
| 6 | 深圳阳光采购平台 | ggzy.sz.gov.cn | 深圳 | custom | requests_plain |
| 7 | 广东省政府采购中心 | www.gdgpo.com | 全省 | custom | api_json |
| 8 | 新点系-佛山市公共资源交易中心 | ggzy.foshan.gov.cn | 佛山 | epoint | requests_post_xml |
| 9 | 新点系-珠海市公共资源交易中心 | ggzy.zhuhai.gov.cn | 珠海 | epoint | requests_post_xml |
| 10 | 新点系-惠州市公共资源交易中心 | ggzy.huizhou.gov.cn | 惠州 | epoint | requests_post_xml |
| 11 | 新点系-东莞市公共资源交易中心 | ggzy.dg.gov.cn | 东莞 | epoint | requests_post_xml |
| 12 | 新点系-中山市公共资源交易中心 | ggzy.zs.gov.cn | 中山 | epoint | requests_post_xml |
| 13 | 新点系-江门市公共资源交易中心 | ggzy.jiangmen.gov.cn | 江门 | epoint | requests_post_xml |
| 14 | 新点系-湛江市/汕头市/茂名市/肇庆市/揭阳市 | ggzy.*.gov.cn | 各地市 | epoint | requests_post_xml |

> **扩展提示**：广东省内其他地市（清远、韶关、梅州、汕尾、河源、阳江、潮州、云浮等）的公共资源交易中心大概率也是新点软件系，复制模板 URL 即可接入。

---

## 二、招标代理机构 (15个)

| # | 平台名称 | URL | 地域 | WAF | 爬虫策略 |
|---|---|---|---|---|---|
| 1 | 国e平台（省机电招标中心） | e.gdebidding.com | 全省 | aliyun_dun | requests_with_ja3 |
| 2 | 广东广咨国际 | www.gzicc.com.cn | 全省 | - | requests_with_ja3 |
| 3 | 诚E招 | www.cnezz.com | 全省 | aliyun_dun | requests_with_ja3 |
| 4 | 南方招标与采购交易平台 | www.nfbidding.com | 全省 | - | api_json |
| 5 | 恒德易电子交易平台 | www.hdebid.com | 全省 | - | requests_plain |
| 6 | 国信招标集团 | www.gtc.com | 全国 | - | requests_plain |
| 7 | 中化商务有限公司 | www.sinochembidding.com | 全国 | cloudflare | requests_with_ja3 |
| 8 | 广东华伦招标有限公司 | www.gdhualun.com | 全省 | - | requests_plain |
| 9 | 广东远东招标代理有限公司 | www.gdydzl.com | 全省 | - | requests_plain |
| 10 | 广东省国际工程咨询有限公司 | www.gdiec.com | 全省 | - | requests_plain |
| 11 | 广东建设工程招标有限公司 | www.gdjsgczb.com | 全省 | - | requests_plain |
| 12 | 广东志正招标有限公司 | www.gdzzzb.com | 全省 | - | requests_plain |
| 13 | 广州建筑工程监理有限公司 | www.gzjgjl.com | 广州 | - | requests_plain |
| 14 | 深圳市国际招标有限公司 | www.sztc.com | 深圳 | - | requests_with_ja3 |

---

## 三、企业自主招标/采购平台 (21个)

### 省属/市属国企 (12个)

| # | 平台名称 | URL | 地域 | 反爬等级 | 爬虫策略 | 认证 |
|---|---|---|---|---|---|---|
| 1 | 中国南方电网 | ec.csg.cn | 广东 | high | playwright_undetected | 登录入库 |
| 2 | 广东能源集团采购平台 | www.gdeg.com.cn | 广东 | medium | api_with_token | 登录入库 |
| 3 | 广州地铁采购网 | proc.gzmtr.com | 广州 | medium | api_with_token | 注册供应商 |
| 4 | 深圳地铁采购系统 | proc.szmc.net | 深圳 | medium | api_with_token | 注册供应商 |
| 5 | 广东省交通集团采购平台 | proc.gdcp.cn | 广东 | medium | api_with_token | 注册供应商 |
| 6 | 广东省建工集团采购平台 | proc.gdcg.com | 广东 | medium | api_with_token | 注册供应商 |
| 7 | 广东省广新控股集团采购平台 | proc.gdxhkg.com | 广东 | low | api_with_token | 注册供应商 |
| 8 | 广东省粤海控股集团采购平台 | proc.gdyhkg.com | 广东 | low | api_with_token | 注册供应商 |
| 9 | 广东省恒健投资控股采购平台 | proc.gdhjtz.com | 广东 | low | api_with_token | 注册供应商 |
| 10 | 广汽集团采购平台 | proc.gac.com.cn | 广州 | medium | api_with_token | 注册供应商 |
| 11 | 深圳市投资控股采购平台 | proc.sztkg.com | 深圳 | low | api_with_token | 注册供应商 |
| 12 | 国家电网电子商务平台 | ecp.sgcc.com.cn | 全国 | high | playwright_undetected | 登录入库 |

### 民营大厂 (9个)

| # | 平台名称 | URL | 地域 | 爬虫策略 | 认证方式 |
|---|---|---|---|---|---|
| 1 | 华为采购门户 | supplier.huawei.com | 深圳 | playwright_undetected | 供应商审核入库 |
| 2 | 比亚迪采购平台 | ep.byd.com | 深圳 | api_with_token | 注册供应商 |
| 3 | 腾讯采购网 | procurement.tencent.com | 深圳 | api_with_token | 入库后 Token |
| 4 | 美的集团供应链平台 | supplier.midea.com | 佛山 | api_with_token | 入库后 Token |
| 5 | 格力电器供应链平台 | supplier.gree.com | 珠海 | api_with_token | 入库后 Token |
| 6 | 大疆创新采购门户 | supplier.dji.com | 深圳 | api_with_token | 供应商入库 |
| 7 | 中兴通讯采购平台 | proc.zte.com.cn | 深圳 | api_with_token | 注册供应商 |
| 8 | TCL采购平台 | proc.tcl.com | 惠州 | api_with_token | 供应商入库 |
| 9 | 万科采筑平台 | www.caiwoo.com | 深圳 | api_with_token | 注册供应商 |

---

## 四、第三方聚合平台 (7个)

| # | 平台名称 | URL | 反爬等级 | 爬虫策略 |
|---|---|---|---|---|
| 1 | 千里马招标网 | www.qianlima.com | medium | requests_with_ja3 |
| 2 | 剑鱼招标网 | www.jianyu360.com | low | api_json |
| 3 | 中国采购与招标网 | www.chinabidding.com | medium | requests_with_ja3 |
| 4 | 中国招标网 | www.zbcg.cn | low | api_json |
| 5 | 标讯快车 | www.biaoxunkuaiche.com | low | requests_plain |
| 6 | 招标信息网 | www.bidnews.cn | low | requests_plain |
| 7 | 比地招标网 | www.bidizhaobiao.com | low | requests_plain |

---

## 五、统计汇总

| 类型 | 数量 | 主要爬虫策略 |
|---|---|---|
| 政府/政采平台 | 14 | requests_post_xml (新点系), requests_plain, api_json |
| 招标代理机构 | 14 | requests_plain, requests_with_ja3 |
| 企业 SRM | 21 | api_with_token, playwright_undetected |
| 聚合平台 | 7 | requests_plain, api_json, requests_with_ja3 |
| **总计** | **56** | |

### 爬虫策略分布

| 策略 | 平台数 | 说明 |
|---|---|---|
| requests_post_xml | ~10 | 新点软件系，共用模板 |
| requests_plain | ~20 | 最轻量，直接抓HTML |
| requests_with_ja3 | ~8 | 有云盾/加速乐防护 |
| api_json | ~7 | 有公开或半公开API |
| api_with_token | ~12 | 需登录/入库后Token访问 |
| playwright_undetected | ~4 | 高反爬企业SRM |
