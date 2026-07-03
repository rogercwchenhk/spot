# 客户雷达 — 广东省目标平台清单

> 维护说明：每新增一个平台，在此处登记并同时写入 `supabase/migrations/002_*.sql` 或 `003_*.sql` 种子数据。

---

## 一、政府公共资源交易/政采平台

| 平台名称 | URL | 地域 | 渲染 | 爬虫策略 |
|---|---|---|---|---|
| 广东省政府采购网 | gdgpo.czt.gd.gov.cn | 全省 | dynamic_api | api_json |
| 广州公共资源交易中心 | www.gzggzy.cn | 广州 | static | requests_plain |
| 深圳市公共资源交易中心 | ggzy.sz.gov.cn | 深圳 | static | requests_plain |
| 粤采易阳光采购平台 | www.gdyce.com | 全省 | dynamic_api | api_json |
| 广州国企阳光采购服务平台 | www.gzggzy.com | 广州 | dynamic_api | requests_plain |
| 深圳阳光采购平台 | ggzy.sz.gov.cn | 深圳 | static | requests_plain |

## 二、招标代理机构

| 平台名称 | URL | 地域 | WAF | 爬虫策略 |
|---|---|---|---|---|
| 国e平台（省机电招标中心） | e.gdebidding.com | 全省 | aliyun_dun | requests_with_ja3 |
| 广东广咨国际 | www.gzicc.com.cn | 全省 | - | requests_with_ja3 |
| 诚E招 | www.cnezz.com | 全省 | aliyun_dun | requests_with_ja3 |
| 南方招标与采购交易平台 | www.nfbidding.com | 全省 | - | api_json |
| 恒德易电子交易平台 | www.hdebid.com | 全省 | - | requests_plain |
| 国信招标集团 | www.gtc.com | 全国 | - | requests_plain |
| 中化商务有限公司 | www.sinochembidding.com | 全国 | cloudflare | requests_with_ja3 |

## 三、企业自主招标/采购平台

### 国企/央企

| 平台名称 | URL | 地域 | 反爬等级 | 爬虫策略 | 认证 |
|---|---|---|---|---|---|
| 国家电网电子商务平台 | ecp.sgcc.com.cn | 全国 | high | playwright_undetected | 登录入库 |
| 中国石油电子招标平台 | www.cnpcbidding.com | 全国 | high | playwright_undetected | 登录入库 |
| 中煤招标网 | www.zmzb.com | 全国 | medium | api_with_token | 登录入库 |
| 中国南方电网 | ec.csg.cn | 广东 | high | playwright_undetected | 登录入库 |
| 广东能源集团采购平台 | www.gdeg.com.cn | 广东 | medium | api_with_token | 登录入库 |
| 广州地铁采购网 | proc.gzmtr.com | 广州 | medium | api_with_token | 注册供应商 |
| 深圳地铁采购系统 | proc.szmc.net | 深圳 | medium | api_with_token | 注册供应商 |

### 民营大厂

| 平台名称 | URL | 地域 | 爬虫策略 | 认证方式 |
|---|---|---|---|---|
| 华为采购门户 | supplier.huawei.com | 深圳 | playwright_undetected | 供应商审核入库 |
| 比亚迪采购平台 | ep.byd.com | 深圳 | api_with_token | 注册供应商 |
| 腾讯采购网 | procurement.tencent.com | 深圳 | api_with_token | 入库后 Token |
| 美的集团供应链平台 | supplier.midea.com | 佛山 | api_with_token | 入库后 Token |
| 格力电器供应链平台 | supplier.gree.com | 珠海 | api_with_token | 入库后 Token |

## 四、第三方聚合平台

| 平台名称 | URL | 反爬等级 | 爬虫策略 |
|---|---|---|---|
| 千里马招标网 | www.qianlima.com | medium | requests_with_ja3 |
| 剑鱼招标网 | www.jianyu360.com | low | api_json |

## 五、新点软件系（共享爬虫模板）

以下平台均由新点软件开发，接口结构一致，共用 `requests_post_xml` 策略：

| 平台名称 | URL |
|---|---|
| 佛山市公共资源交易中心 | ggzy.foshan.gov.cn |
| 珠海市公共资源交易中心 | ggzy.zhuhai.gov.cn |
| 惠州市公共资源交易中心 | ggzy.huizhou.gov.cn |

> **扩展提示**：广东省内其他地市（东莞、中山、江门、湛江等）的公共资源交易中心大概率也是新点软件系，只需复制模板 URL 即可接入。
