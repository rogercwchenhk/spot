-- ============================================================
-- 008_qualification_ai_fields.sql
-- 为 qualification_reference 补充 AI 友好字段
-- ============================================================

-- 添加 AI 匹配字段
ALTER TABLE qualification_reference
  ADD COLUMN IF NOT EXISTS match_keywords TEXT[],
  ADD COLUMN IF NOT EXISTS common_aliases TEXT[],
  ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

-- 创建 GIN 索引
CREATE INDEX IF NOT EXISTS idx_qual_ref_search
  ON qualification_reference USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_qual_ref_keywords
  ON qualification_reference USING gin(match_keywords);

-- 更新触发器：自动维护 search_vector
CREATE OR REPLACE FUNCTION qualification_reference_update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.qual_name, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.issuer, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'C') ||
    setweight(to_tsvector('simple', COALESCE(array_to_string(NEW.match_keywords, ' '), '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(array_to_string(NEW.common_aliases, ' '), '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_qualification_reference_search
  BEFORE INSERT OR UPDATE ON qualification_reference
  FOR EACH ROW EXECUTE FUNCTION qualification_reference_update_search_vector();

COMMENT ON COLUMN qualification_reference.match_keywords IS 'AI 匹配关键词数组，用于从公告文本中匹配资质';
COMMENT ON COLUMN qualification_reference.common_aliases IS '常见别名/简称，AI 提取时的备选匹配';
COMMENT ON COLUMN qualification_reference.search_vector IS '全文搜索向量，自动维护';

-- ============================================================
-- 更新所有记录的 AI 字段
-- ============================================================

-- 1.1 通用IT服务管理
UPDATE qualification_reference SET
  match_keywords = ARRAY['ITSS项目经理', 'ITSS 项目经理', 'IT服务项目经理'],
  common_aliases = ARRAY['ITSS PM']
WHERE qual_name = 'ITSS项目经理';

UPDATE qualification_reference SET
  match_keywords = ARRAY['ITSS运维工程师', 'ITSS 运维工程师', 'IT运维工程师'],
  common_aliases = ARRAY['ITSS OE']
WHERE qual_name = 'ITSS运维工程师';

UPDATE qualification_reference SET
  match_keywords = ARRAY['ITSS咨询工程师', 'ITSS 咨询工程师', 'IT咨询'],
  common_aliases = ARRAY['ITSS CE']
WHERE qual_name = 'ITSS咨询工程师';

UPDATE qualification_reference SET
  match_keywords = ARRAY['PMP', 'PMP证书', 'PMP认证', '项目管理专业人士'],
  common_aliases = ARRAY['项目管理专业人士认证']
WHERE qual_name = 'PMP';

UPDATE qualification_reference SET
  match_keywords = ARRAY['PRINCE2', 'PRINCE2认证', 'PRINCE2证书'],
  common_aliases = ARRAY[]::text[]
WHERE qual_name = 'PRINCE2';

UPDATE qualification_reference SET
  match_keywords = ARRAY['ITIL', 'ITIL 4', 'ITIL认证', 'IT服务管理'],
  common_aliases = ARRAY['ITIL Foundation']
WHERE qual_name IN ('ITIL 4 Foundation', 'ITIL 4 Managing Professional');

-- 1.2 信息安全认证
UPDATE qualification_reference SET
  match_keywords = ARRAY['CISP', 'CISP证书', '注册信息安全专业人员', '信息安全专业人员'],
  common_aliases = ARRAY['注册信息安全专业人员']
WHERE qual_name = 'CISP';

UPDATE qualification_reference SET
  match_keywords = ARRAY['CISP-PTE', '渗透测试', 'CISP PTE'],
  common_aliases = ARRAY['渗透测试工程师认证']
WHERE qual_name = 'CISP-PTE';

UPDATE qualification_reference SET
  match_keywords = ARRAY['CISP-IRE', '应急响应', 'CISP IRE'],
  common_aliases = ARRAY['应急响应工程师认证']
WHERE qual_name = 'CISP-IRE';

UPDATE qualification_reference SET
  match_keywords = ARRAY['CISSP', 'CISSP证书', '信息系统安全专业人员'],
  common_aliases = ARRAY['Certified Information Systems Security Professional']
WHERE qual_name = 'CISSP';

UPDATE qualification_reference SET
  match_keywords = ARRAY['CISA', 'CISA证书', '信息系统审计师'],
  common_aliases = ARRAY['Certified Information Systems Auditor']
WHERE qual_name = 'CISA';

UPDATE qualification_reference SET
  match_keywords = ARRAY['CISM', 'CISM证书', '信息安全经理'],
  common_aliases = ARRAY['Certified Information Security Manager']
WHERE qual_name = 'CISM';

UPDATE qualification_reference SET
  match_keywords = ARRAY['Security+', 'CompTIA Security+', '安全+'],
  common_aliases = ARRAY['CompTIA Security Plus']
WHERE qual_name = 'Security+';

UPDATE qualification_reference SET
  match_keywords = ARRAY['等保测评师', '等保测评', '等级保护测评'],
  common_aliases = ARRAY['等级保护测评人员']
WHERE qual_name = '等保测评师';

-- 1.3 服务器与操作系统
UPDATE qualification_reference SET
  match_keywords = ARRAY['HCIA', 'HCIA-Server', '华为服务器', '华为HCIA'],
  common_aliases = ARRAY['华为认证ICT初级-服务器']
WHERE qual_name LIKE 'HCIA-Intelligent%';

UPDATE qualification_reference SET
  match_keywords = ARRAY['HCIP', 'HCIP-Server', '华为服务器', '华为HCIP'],
  common_aliases = ARRAY['华为认证ICT高级-服务器']
WHERE qual_name LIKE 'HCIP-Intelligent%';

UPDATE qualification_reference SET
  match_keywords = ARRAY['HCIE', 'HCIE-Server', '华为服务器', '华为HCIE'],
  common_aliases = ARRAY['华为认证ICT专家-服务器']
WHERE qual_name LIKE 'HCIE-Intelligent%';

UPDATE qualification_reference SET
  match_keywords = ARRAY['RHCSA', '红帽RHCSA', 'Red Hat RHCSA', '红帽系统管理员'],
  common_aliases = ARRAY['Red Hat Certified System Administrator']
WHERE qual_name = 'RHCSA';

UPDATE qualification_reference SET
  match_keywords = ARRAY['RHCE', '红帽RHCE', 'Red Hat RHCE', '红帽工程师', '红帽认证工程师'],
  common_aliases = ARRAY['Red Hat Certified Engineer']
WHERE qual_name = 'RHCE';

UPDATE qualification_reference SET
  match_keywords = ARRAY['RHCA', '红帽RHCA', 'Red Hat RHCA', '红帽架构师'],
  common_aliases = ARRAY['Red Hat Certified Architect']
WHERE qual_name = 'RHCA';

UPDATE qualification_reference SET
  match_keywords = ARRAY['Azure Administrator', 'Azure管理员认证', '微软Azure'],
  common_aliases = ARRAY['AZ-104']
WHERE qual_name = 'Azure Administrator';

UPDATE qualification_reference SET
  match_keywords = ARRAY['SUSE认证', 'SUSE管理员', 'SLES'],
  common_aliases = ARRAY['SUSE Certified Linux Administrator']
WHERE qual_name = 'SUSE Certified Administrator';

UPDATE qualification_reference SET
  match_keywords = ARRAY['KYCA', '麒麟KYCA', '银河麒麟初级', '麒麟认证'],
  common_aliases = ARRAY['银河麒麟系统管理员']
WHERE qual_name = 'KYCA';

UPDATE qualification_reference SET
  match_keywords = ARRAY['KYCP', '麒麟KYCP', '银河麒麟高级'],
  common_aliases = ARRAY['银河麒麟高级管理员']
WHERE qual_name = 'KYCP';

UPDATE qualification_reference SET
  match_keywords = ARRAY['UCA', '统信UCA', '统信UOS初级', '统信认证'],
  common_aliases = ARRAY['统信UOS系统管理员']
WHERE qual_name = 'UCA';

UPDATE qualification_reference SET
  match_keywords = ARRAY['UCP', '统信UCP', '统信UOS高级'],
  common_aliases = ARRAY['统信UOS高级管理员']
WHERE qual_name = 'UCP';

UPDATE qualification_reference SET
  match_keywords = ARRAY['openEuler', '欧拉认证', 'openEuler工程师'],
  common_aliases = ARRAY['openEuler系统管理员']
WHERE qual_name = 'openEuler认证工程师';

-- 1.4 存储认证
UPDATE qualification_reference SET
  match_keywords = ARRAY['Dell EMC EISA', 'EISA', 'Dell存储认证', '戴尔存储'],
  common_aliases = ARRAY['Dell EMC Information Storage Associate']
WHERE qual_name = 'Dell EMC EISA';

UPDATE qualification_reference SET
  match_keywords = ARRAY['Dell EMC DEA', 'DEA', 'Dell存储高级'],
  common_aliases = ARRAY['Dell EMC Associate']
WHERE qual_name = 'Dell EMC DEA';

UPDATE qualification_reference SET
  match_keywords = ARRAY['Dell EMC DEP', 'DEP', 'Dell存储专家'],
  common_aliases = ARRAY['Dell EMC Professional']
WHERE qual_name = 'Dell EMC DEP';

UPDATE qualification_reference SET
  match_keywords = ARRAY['NCDA', 'NetApp NCDA', 'NetApp认证'],
  common_aliases = ARRAY['NetApp Certified Data Administrator']
WHERE qual_name = 'NCDA';

UPDATE qualification_reference SET
  match_keywords = ARRAY['NCIS', 'NetApp NCIS', 'NetApp实施'],
  common_aliases = ARRAY['NetApp Certified Implementation Specialist']
WHERE qual_name = 'NCIS';

UPDATE qualification_reference SET
  match_keywords = ARRAY['HCIA-Storage', '华为存储初级', '华为HCIA存储'],
  common_aliases = ARRAY['华为存储认证初级']
WHERE qual_name = 'HCIA-Storage';

UPDATE qualification_reference SET
  match_keywords = ARRAY['HCIP-Storage', '华为存储高级', '华为HCIP存储'],
  common_aliases = ARRAY['华为存储认证高级']
WHERE qual_name = 'HCIP-Storage';

UPDATE qualification_reference SET
  match_keywords = ARRAY['H3CNE-Storage', 'H3C存储初级', '新华三存储'],
  common_aliases = ARRAY['H3C存储认证初级']
WHERE qual_name = 'H3CNE-Storage';

UPDATE qualification_reference SET
  match_keywords = ARRAY['H3CSE-Storage', 'H3C存储高级'],
  common_aliases = ARRAY['H3C存储认证高级']
WHERE qual_name = 'H3CSE-Storage';

UPDATE qualification_reference SET
  match_keywords = ARRAY['Pure Storage认证', 'Pure Storage工程师', 'FlashArray'],
  common_aliases = ARRAY['Pure Storage Certified Professional']
WHERE qual_name = 'Pure Storage Certified Engineer';

-- 1.5 网络认证
UPDATE qualification_reference SET
  match_keywords = ARRAY['CCNA', '思科CCNA', 'Cisco CCNA'],
  common_aliases = ARRAY['Cisco Certified Network Associate']
WHERE qual_name = 'CCNA';

UPDATE qualification_reference SET
  match_keywords = ARRAY['CCNP', '思科CCNP', 'Cisco CCNP'],
  common_aliases = ARRAY['Cisco Certified Network Professional']
WHERE qual_name = 'CCNP';

UPDATE qualification_reference SET
  match_keywords = ARRAY['CCIE', '思科CCIE', 'Cisco CCIE'],
  common_aliases = ARRAY['Cisco Certified Internetwork Expert']
WHERE qual_name = 'CCIE';

UPDATE qualification_reference SET
  match_keywords = ARRAY['CCNA Security', '思科安全初级'],
  common_aliases = ARRAY['Cisco Certified Network Associate Security']
WHERE qual_name = 'CCNA Security';

UPDATE qualification_reference SET
  match_keywords = ARRAY['CCNP Security', '思科安全高级'],
  common_aliases = ARRAY['Cisco Certified Network Professional Security']
WHERE qual_name = 'CCNP Security';

UPDATE qualification_reference SET
  match_keywords = ARRAY['JNCIA', 'Juniper JNCIA', '瞻博网络初级'],
  common_aliases = ARRAY['Juniper Networks Certified Internet Associate']
WHERE qual_name = 'JNCIA';

UPDATE qualification_reference SET
  match_keywords = ARRAY['JNCIS', 'Juniper JNCIS', '瞻博网络中级'],
  common_aliases = ARRAY['Juniper Networks Certified Internet Specialist']
WHERE qual_name = 'JNCIS';

UPDATE qualification_reference SET
  match_keywords = ARRAY['JNCIE', 'Juniper JNCIE', '瞻博网络专家'],
  common_aliases = ARRAY['Juniper Networks Certified Internet Expert']
WHERE qual_name = 'JNCIE';

UPDATE qualification_reference SET
  match_keywords = ARRAY['PCNSA', 'Palo Alto PCNSA', '派拓网络初级'],
  common_aliases = ARRAY['Palo Alto Networks Certified Network Security Administrator']
WHERE qual_name = 'PCNSA';

UPDATE qualification_reference SET
  match_keywords = ARRAY['PCNSE', 'Palo Alto PCNSE', '派拓网络高级'],
  common_aliases = ARRAY['Palo Alto Networks Certified Network Security Engineer']
WHERE qual_name = 'PCNSE';

UPDATE qualification_reference SET
  match_keywords = ARRAY['FCP', 'Fortinet FCP', '飞塔初级'],
  common_aliases = ARRAY['Fortinet Certified Professional']
WHERE qual_name = 'FCP';

UPDATE qualification_reference SET
  match_keywords = ARRAY['FCSS', 'Fortinet FCSS', '飞塔高级'],
  common_aliases = ARRAY['Fortinet Certified Solution Specialist']
WHERE qual_name = 'FCSS';

UPDATE qualification_reference SET
  match_keywords = ARRAY['HCIA-Datacom', '华为数通初级', '华为路由交换初级'],
  common_aliases = ARRAY['华为数通认证初级']
WHERE qual_name = 'HCIA-Datacom';

UPDATE qualification_reference SET
  match_keywords = ARRAY['HCIP-Datacom', '华为数通高级', '华为路由交换高级'],
  common_aliases = ARRAY['华为数通认证高级']
WHERE qual_name = 'HCIP-Datacom';

UPDATE qualification_reference SET
  match_keywords = ARRAY['HCIE-Datacom', '华为数通专家', '华为路由交换专家'],
  common_aliases = ARRAY['华为数通认证专家']
WHERE qual_name = 'HCIE-Datacom';

UPDATE qualification_reference SET
  match_keywords = ARRAY['HCIP-Security', '华为安全', '华为安全认证'],
  common_aliases = ARRAY['华为安全认证高级']
WHERE qual_name = 'HCIP-Security';

UPDATE qualification_reference SET
  match_keywords = ARRAY['H3CNE', 'H3C初级', '新华三初级'],
  common_aliases = ARRAY['H3C Certified Network Engineer']
WHERE qual_name = 'H3CNE';

UPDATE qualification_reference SET
  match_keywords = ARRAY['H3CSE', 'H3C高级', '新华三高级'],
  common_aliases = ARRAY['H3C Certified Senior Engineer']
WHERE qual_name = 'H3CSE';

UPDATE qualification_reference SET
  match_keywords = ARRAY['H3CIE', 'H3C专家', '新华三专家'],
  common_aliases = ARRAY['H3C Certified Internetwork Expert']
WHERE qual_name = 'H3CIE';

UPDATE qualification_reference SET
  match_keywords = ARRAY['H3CNE-Security', 'H3C安全初级'],
  common_aliases = ARRAY['H3C安全认证初级']
WHERE qual_name = 'H3CNE-Security';

UPDATE qualification_reference SET
  match_keywords = ARRAY['H3CSE-Security', 'H3C安全高级'],
  common_aliases = ARRAY['H3C安全认证高级']
WHERE qual_name = 'H3CSE-Security';

UPDATE qualification_reference SET
  match_keywords = ARRAY['RCNA', '锐捷RCNA', '锐捷初级'],
  common_aliases = ARRAY['锐捷网络认证初级']
WHERE qual_name = 'RCNA';

UPDATE qualification_reference SET
  match_keywords = ARRAY['RCNP', '锐捷RCNP', '锐捷高级'],
  common_aliases = ARRAY['锐捷网络认证高级']
WHERE qual_name = 'RCNP';

UPDATE qualification_reference SET
  match_keywords = ARRAY['RCIE', '锐捷RCIE', '锐捷专家'],
  common_aliases = ARRAY['锐捷网络认证专家']
WHERE qual_name = 'RCIE';

UPDATE qualification_reference SET
  match_keywords = ARRAY['F5-CA', 'F5认证', 'F5管理员认证', 'BIG-IP'],
  common_aliases = ARRAY['F5 Certified Administrator']
WHERE qual_name = 'F5-CA';

UPDATE qualification_reference SET
  match_keywords = ARRAY['F5-CTS', 'F5高级认证', 'F5专家'],
  common_aliases = ARRAY['F5 Certified Technology Specialist']
WHERE qual_name = 'F5-CTS';

-- 1.6 数据库认证
UPDATE qualification_reference SET
  match_keywords = ARRAY['OCP', 'Oracle OCP', 'OCP证书', '数据库管理员', 'Oracle认证'],
  common_aliases = ARRAY['Oracle Certified Professional']
WHERE qual_name = 'Oracle OCP';

UPDATE qualification_reference SET
  match_keywords = ARRAY['OCM', 'Oracle OCM', 'OCM证书', 'Oracle大师'],
  common_aliases = ARRAY['Oracle Certified Master']
WHERE qual_name = 'Oracle OCM';

UPDATE qualification_reference SET
  match_keywords = ARRAY['DP-300', 'Azure DBA', 'SQL Server认证'],
  common_aliases = ARRAY['Azure Database Administrator Associate']
WHERE qual_name = 'DP-300';

UPDATE qualification_reference SET
  match_keywords = ARRAY['MySQL认证', 'MySQL证书', 'MySQL DBA'],
  common_aliases = ARRAY['MySQL Certified DBA']
WHERE qual_name = 'MySQL Certification';

UPDATE qualification_reference SET
  match_keywords = ARRAY['PostgreSQL认证', 'PG认证', 'PostgreSQL DBA'],
  common_aliases = ARRAY['PostgreSQL Certified Professional']
WHERE qual_name = 'PostgreSQL Certification';

UPDATE qualification_reference SET
  match_keywords = ARRAY['MongoDB认证', 'MongoDB DBA', 'MongoDB证书'],
  common_aliases = ARRAY['MongoDB Certified DBA']
WHERE qual_name = 'MongoDB Certified DBA';

UPDATE qualification_reference SET
  match_keywords = ARRAY['达梦DCA', '达梦初级', '达梦认证初级'],
  common_aliases = ARRAY['达梦数据库认证工程师初级']
WHERE qual_name = '达梦DCA';

UPDATE qualification_reference SET
  match_keywords = ARRAY['达梦DCP', '达梦高级', '达梦认证高级'],
  common_aliases = ARRAY['达梦数据库认证工程师高级']
WHERE qual_name = '达梦DCP';

UPDATE qualification_reference SET
  match_keywords = ARRAY['达梦DCE', '达梦专家', '达梦认证专家'],
  common_aliases = ARRAY['达梦数据库认证工程师专家']
WHERE qual_name = '达梦DCE';

UPDATE qualification_reference SET
  match_keywords = ARRAY['金仓KCA', '人大金仓KCA', '金仓初级', 'KingbaseES'],
  common_aliases = ARRAY['金仓数据库认证初级']
WHERE qual_name = '人大金仓KCA';

UPDATE qualification_reference SET
  match_keywords = ARRAY['金仓KCP', '人大金仓KCP', '金仓高级'],
  common_aliases = ARRAY['金仓数据库认证高级']
WHERE qual_name = '人大金仓KCP';

UPDATE qualification_reference SET
  match_keywords = ARRAY['OBCA', 'OceanBase OBCA', 'OceanBase初级'],
  common_aliases = ARRAY['OceanBase认证初级']
WHERE qual_name = 'OceanBase OBCA';

UPDATE qualification_reference SET
  match_keywords = ARRAY['OBCP', 'OceanBase OBCP', 'OceanBase高级'],
  common_aliases = ARRAY['OceanBase认证高级']
WHERE qual_name = 'OceanBase OBCP';

UPDATE qualification_reference SET
  match_keywords = ARRAY['PCTA', 'TiDB PCTA', 'TiDB初级'],
  common_aliases = ARRAY['TiDB认证初级']
WHERE qual_name = 'TiDB PCTA';

UPDATE qualification_reference SET
  match_keywords = ARRAY['PCTP', 'TiDB PCTP', 'TiDB高级'],
  common_aliases = ARRAY['TiDB认证高级']
WHERE qual_name = 'TiDB PCTP';

UPDATE qualification_reference SET
  match_keywords = ARRAY['HCIA-GaussDB', '华为GaussDB初级', '华为数据库初级'],
  common_aliases = ARRAY['华为GaussDB认证初级']
WHERE qual_name = 'HCIA-GaussDB';

UPDATE qualification_reference SET
  match_keywords = ARRAY['HCIP-GaussDB', '华为GaussDB高级', '华为数据库高级'],
  common_aliases = ARRAY['华为GaussDB认证高级']
WHERE qual_name = 'HCIP-GaussDB';

UPDATE qualification_reference SET
  match_keywords = ARRAY['GBase认证', '南大通用GBase', 'GBase DBA'],
  common_aliases = ARRAY['GBase数据库认证工程师']
WHERE qual_name = 'GBase认证';

-- 1.7 中间件认证
UPDATE qualification_reference SET
  match_keywords = ARRAY['WebLogic认证', 'WebLogic证书', 'Oracle WebLogic'],
  common_aliases = ARRAY['WebLogic管理员认证']
WHERE qual_name = 'Oracle WebLogic认证';

UPDATE qualification_reference SET
  match_keywords = ARRAY['WebSphere认证', 'WebSphere证书', 'IBM WebSphere'],
  common_aliases = ARRAY['WebSphere管理员认证']
WHERE qual_name = 'IBM WebSphere认证';

UPDATE qualification_reference SET
  match_keywords = ARRAY['IBM MQ认证', 'MQ证书', '消息队列认证'],
  common_aliases = ARRAY['IBM MQ管理员认证']
WHERE qual_name = 'IBM MQ认证';

UPDATE qualification_reference SET
  match_keywords = ARRAY['JBoss认证', 'JBoss EAP', 'Red Hat JBoss'],
  common_aliases = ARRAY['JBoss EAP管理员认证']
WHERE qual_name = 'JBoss认证';

UPDATE qualification_reference SET
  match_keywords = ARRAY['东方通认证', 'TongWeb认证', 'TongLINK认证'],
  common_aliases = ARRAY['东方通中间件认证工程师']
WHERE qual_name = '东方通认证工程师';

UPDATE qualification_reference SET
  match_keywords = ARRAY['宝兰德认证', 'BES认证'],
  common_aliases = ARRAY['宝兰德中间件认证']
WHERE qual_name = '宝兰德认证工程师';

UPDATE qualification_reference SET
  match_keywords = ARRAY['金蝶天燕认证', 'Apusic认证'],
  common_aliases = ARRAY['金蝶天燕中间件认证']
WHERE qual_name = '金蝶天燕认证工程师';

-- 1.8 虚拟化与云计算
UPDATE qualification_reference SET
  match_keywords = ARRAY['VCP', 'VMware VCP', 'vSphere认证', 'VMware专业认证'],
  common_aliases = ARRAY['VMware Certified Professional']
WHERE qual_name = 'VCP';

UPDATE qualification_reference SET
  match_keywords = ARRAY['VCAP', 'VMware VCAP', 'VMware高级认证'],
  common_aliases = ARRAY['VMware Certified Advanced Professional']
WHERE qual_name = 'VCAP';

UPDATE qualification_reference SET
  match_keywords = ARRAY['VCDX', 'VMware VCDX', 'VMware专家认证'],
  common_aliases = ARRAY['VMware Certified Design Expert']
WHERE qual_name = 'VCDX';

UPDATE qualification_reference SET
  match_keywords = ARRAY['HCIA-Cloud Computing', '华为云计算初级', '华为云初级'],
  common_aliases = ARRAY['华为云计算认证初级']
WHERE qual_name = 'HCIA-Cloud Computing';

UPDATE qualification_reference SET
  match_keywords = ARRAY['HCIP-Cloud Computing', '华为云计算高级', '华为云高级'],
  common_aliases = ARRAY['华为云计算认证高级']
WHERE qual_name = 'HCIP-Cloud Computing';

UPDATE qualification_reference SET
  match_keywords = ARRAY['HCIA-Cloud Service', '华为云服务初级'],
  common_aliases = ARRAY['华为云服务认证初级']
WHERE qual_name = 'HCIA-Cloud Service';

UPDATE qualification_reference SET
  match_keywords = ARRAY['HCIP-Cloud Service', '华为云服务高级'],
  common_aliases = ARRAY['华为云服务认证高级']
WHERE qual_name = 'HCIP-Cloud Service';

UPDATE qualification_reference SET
  match_keywords = ARRAY['H3CNE-Cloud', 'H3C云计算初级', '新华三云初级'],
  common_aliases = ARRAY['H3C云计算认证初级']
WHERE qual_name = 'H3CNE-Cloud';

UPDATE qualification_reference SET
  match_keywords = ARRAY['H3CSE-Cloud', 'H3C云计算高级'],
  common_aliases = ARRAY['H3C云计算认证高级']
WHERE qual_name = 'H3CSE-Cloud';

UPDATE qualification_reference SET
  match_keywords = ARRAY['OpenShift认证', 'OpenShift', '红帽OpenShift'],
  common_aliases = ARRAY['Red Hat Certified Specialist in OpenShift']
WHERE qual_name = 'OpenShift认证';

UPDATE qualification_reference SET
  match_keywords = ARRAY['CKA', 'Kubernetes管理员认证', 'K8s管理员认证'],
  common_aliases = ARRAY['Certified Kubernetes Administrator']
WHERE qual_name = 'CKA';

UPDATE qualification_reference SET
  match_keywords = ARRAY['CKAD', 'Kubernetes开发认证', 'K8s开发认证'],
  common_aliases = ARRAY['Certified Kubernetes Application Developer']
WHERE qual_name = 'CKAD';

UPDATE qualification_reference SET
  match_keywords = ARRAY['CKS', 'Kubernetes安全认证', 'K8s安全认证'],
  common_aliases = ARRAY['Certified Kubernetes Security Specialist']
WHERE qual_name = 'CKS';

UPDATE qualification_reference SET
  match_keywords = ARRAY['DCA', 'Docker认证', '容器认证'],
  common_aliases = ARRAY['Docker Certified Associate']
WHERE qual_name = 'DCA';

-- 1.9 备份与容灾
UPDATE qualification_reference SET
  match_keywords = ARRAY['VMCE', 'Veeam认证', 'Veeam工程师'],
  common_aliases = ARRAY['Veeam Certified Engineer']
WHERE qual_name = 'VMCE';

UPDATE qualification_reference SET
  match_keywords = ARRAY['VMCA', 'Veeam架构师', 'Veeam高级认证'],
  common_aliases = ARRAY['Veeam Certified Architect']
WHERE qual_name = 'VMCA';

UPDATE qualification_reference SET
  match_keywords = ARRAY['Commvault认证', 'Commvault Professional'],
  common_aliases = ARRAY['Commvault Certified Professional']
WHERE qual_name = 'Commvault Certified Professional';

UPDATE qualification_reference SET
  match_keywords = ARRAY['NetBackup认证', 'Veritas NetBackup', 'NetBackup管理员'],
  common_aliases = ARRAY['Veritas NetBackup Certified Administrator']
WHERE qual_name = 'NetBackup Certified Administrator';

UPDATE qualification_reference SET
  match_keywords = ARRAY['HCIA-Data Protection', '华为数据保护', '华为备份认证'],
  common_aliases = ARRAY['华为数据保护认证']
WHERE qual_name = 'HCIA-Data Protection';

UPDATE qualification_reference SET
  match_keywords = ARRAY['鼎甲认证', 'DBackup认证', '鼎甲备份'],
  common_aliases = ARRAY['鼎甲数据备份认证']
WHERE qual_name = '鼎甲认证工程师';

UPDATE qualification_reference SET
  match_keywords = ARRAY['爱数认证', 'AnyBackup认证', '爱数备份'],
  common_aliases = ARRAY['爱数数据备份认证']
WHERE qual_name = '爱数认证工程师';

-- 1.10 项目管理与IT治理
UPDATE qualification_reference SET
  match_keywords = ARRAY['COBIT', 'COBIT 5', 'COBIT认证', 'IT治理'],
  common_aliases = ARRAY['COBIT 5 Foundation认证']
WHERE qual_name = 'COBIT 5 Foundation';

UPDATE qualification_reference SET
  match_keywords = ARRAY['ISO 20000主任审核员', 'ISO20000 LA', 'IT服务审核'],
  common_aliases = ARRAY['ISO 20000 Lead Auditor认证']
WHERE qual_name = 'ISO 20000 Lead Auditor';

UPDATE qualification_reference SET
  match_keywords = ARRAY['ISO 27001主任审核员', 'ISO27001 LA', '信息安全审核'],
  common_aliases = ARRAY['ISO 27001 Lead Auditor认证']
WHERE qual_name = 'ISO 27001 Lead Auditor';

-- ============================================================
-- 企业资质 AI 字段
-- ============================================================

-- 2.1 IT服务类资质
UPDATE qualification_reference SET
  match_keywords = ARRAY['ITSS', 'ITSS运维', '运行维护服务能力', 'IT服务能力成熟度'],
  common_aliases = ARRAY['ITSS运行维护服务能力成熟度']
WHERE qual_name = 'ITSS运行维护服务能力';

UPDATE qualification_reference SET
  match_keywords = ARRAY['ITSS咨询', 'ITSS设计', '咨询设计能力'],
  common_aliases = ARRAY['ITSS咨询设计服务能力']
WHERE qual_name = 'ITSS咨询设计能力';

UPDATE qualification_reference SET
  match_keywords = ARRAY['信息系统集成', '集成资质', '系统集成资质'],
  common_aliases = ARRAY['信息系统集成及服务资质']
WHERE qual_name = '信息系统集成及服务资质';

UPDATE qualification_reference SET
  match_keywords = ARRAY['CS', 'CS资质', '信息系统建设和服务能力', 'CS1', 'CS2', 'CS3', 'CS4', 'CS5'],
  common_aliases = ARRAY['CS信息系统建设和服务能力评估']
WHERE qual_name = 'CS信息系统建设和服务能力评估';

UPDATE qualification_reference SET
  match_keywords = ARRAY['CCRC安全集成', '安全集成资质', '信息安全服务-安全集成'],
  common_aliases = ARRAY['CCRC信息安全服务资质-安全集成']
WHERE qual_name = 'CCRC信息安全服务-安全集成';

UPDATE qualification_reference SET
  match_keywords = ARRAY['CCRC安全运维', '安全运维资质', '信息安全服务-安全运维'],
  common_aliases = ARRAY['CCRC信息安全服务资质-安全运维']
WHERE qual_name = 'CCRC信息安全服务-安全运维';

UPDATE qualification_reference SET
  match_keywords = ARRAY['CCRC灾备', '灾备资质', '灾难备份与恢复', '信息安全服务-灾备'],
  common_aliases = ARRAY['CCRC信息安全服务资质-灾难备份与恢复']
WHERE qual_name = 'CCRC信息安全服务-灾难备份与恢复';

UPDATE qualification_reference SET
  match_keywords = ARRAY['CCRC风险评估', '风险评估资质', '信息安全服务-风险评估'],
  common_aliases = ARRAY['CCRC信息安全服务资质-风险评估']
WHERE qual_name = 'CCRC信息安全服务-风险评估';

UPDATE qualification_reference SET
  match_keywords = ARRAY['CCRC应急响应', '应急响应资质', '信息安全服务-应急响应'],
  common_aliases = ARRAY['CCRC信息安全服务资质-应急响应']
WHERE qual_name = 'CCRC信息安全服务-应急响应';

UPDATE qualification_reference SET
  match_keywords = ARRAY['CMMI', 'CMMI认证', 'CMMI3', 'CMMI4', 'CMMI5', '能力成熟度'],
  common_aliases = ARRAY['能力成熟度模型集成']
WHERE qual_name = 'CMMI';

-- 2.2 信息安全类资质
UPDATE qualification_reference SET
  match_keywords = ARRAY['等保测评', '等保测评机构', '等级保护'],
  common_aliases = ARRAY['等级保护测评资质']
WHERE qual_name = '等保测评机构资质';

UPDATE qualification_reference SET
  match_keywords = ARRAY['涉密资质', '涉密集成', '涉密信息系统集成', '涉密甲级', '涉密乙级'],
  common_aliases = ARRAY['涉密信息系统集成资质']
WHERE qual_name = '涉密信息系统集成资质';

-- 2.3 云服务与数据中心资质
UPDATE qualification_reference SET
  match_keywords = ARRAY['IDC', 'IDC许可证', '数据中心许可'],
  common_aliases = ARRAY['互联网数据中心业务经营许可']
WHERE qual_name = 'IDC许可证';

UPDATE qualification_reference SET
  match_keywords = ARRAY['ISP', 'ISP许可证', '互联网接入许可'],
  common_aliases = ARRAY['互联网接入服务业务经营许可']
WHERE qual_name = 'ISP许可证';

UPDATE qualification_reference SET
  match_keywords = ARRAY['云计算安全评估', '政务云安全', '云安全评估'],
  common_aliases = ARRAY['云计算服务安全评估']
WHERE qual_name = '云计算服务安全评估';

UPDATE qualification_reference SET
  match_keywords = ARRAY['Uptime Tier', 'Tier认证', '数据中心等级', 'Tier1', 'Tier2', 'Tier3', 'Tier4'],
  common_aliases = ARRAY['Uptime Institute Tier Certification']
WHERE qual_name = 'Uptime Institute Tier认证';

UPDATE qualification_reference SET
  match_keywords = ARRAY['GB50174', '数据中心设计标准', '数据中心运维'],
  common_aliases = ARRAY['GB50174数据中心设计规范']
WHERE qual_name = 'GB50174数据中心资质';

-- 2.4 管理体系认证
UPDATE qualification_reference SET
  match_keywords = ARRAY['ISO 9001', 'ISO9001', '质量管理体系', '质量认证'],
  common_aliases = ARRAY['ISO 9001质量管理体系认证']
WHERE qual_name = 'ISO 9001';

UPDATE qualification_reference SET
  match_keywords = ARRAY['ISO 20000', 'ISO20000', 'IT服务管理体系', 'IT服务认证'],
  common_aliases = ARRAY['ISO 20000 IT服务管理体系认证']
WHERE qual_name = 'ISO 20000';

UPDATE qualification_reference SET
  match_keywords = ARRAY['ISO 27001', 'ISO27001', '信息安全管理体系', '信息安全管理认证'],
  common_aliases = ARRAY['ISO 27001信息安全管理体系认证']
WHERE qual_name = 'ISO 27001';

UPDATE qualification_reference SET
  match_keywords = ARRAY['ISO 22301', 'ISO22301', '业务连续性管理体系', '业务连续性认证'],
  common_aliases = ARRAY['ISO 22301业务连续性管理体系认证']
WHERE qual_name = 'ISO 22301';

UPDATE qualification_reference SET
  match_keywords = ARRAY['ISO 14001', 'ISO14001', '环境管理体系', '环境认证'],
  common_aliases = ARRAY['ISO 14001环境管理体系认证']
WHERE qual_name = 'ISO 14001';

UPDATE qualification_reference SET
  match_keywords = ARRAY['ISO 45001', 'ISO45001', '职业健康安全', '安全管理体系'],
  common_aliases = ARRAY['ISO 45001职业健康安全管理体系认证']
WHERE qual_name = 'ISO 45001';

-- 2.5 品牌授权与服务资质
UPDATE qualification_reference SET
  match_keywords = ARRAY['华为ASP', '华为授权服务', '华为合作伙伴'],
  common_aliases = ARRAY['华为授权服务合作伙伴']
WHERE qual_name = '华为ASP授权服务合作伙伴';

UPDATE qualification_reference SET
  match_keywords = ARRAY['华为钻石', '华为金牌', '华为银牌', '华为合作伙伴'],
  common_aliases = ARRAY['华为分级合作伙伴']
WHERE qual_name = '华为钻石/金牌/银牌合作伙伴';

UPDATE qualification_reference SET
  match_keywords = ARRAY['H3C五星', 'H3C四星', 'H3C三星', 'H3C服务商', '新华三服务商'],
  common_aliases = ARRAY['H3C分级服务商']
WHERE qual_name = '新华三五星/四星/三星服务商';

UPDATE qualification_reference SET
  match_keywords = ARRAY['Dell授权', 'Dell合作伙伴', '戴尔授权'],
  common_aliases = ARRAY['Dell Technologies授权服务合作伙伴']
WHERE qual_name = 'Dell授权服务合作伙伴';

UPDATE qualification_reference SET
  match_keywords = ARRAY['VMware授权', 'VMware合作伙伴'],
  common_aliases = ARRAY['VMware授权合作伙伴']
WHERE qual_name = 'VMware授权合作伙伴';

UPDATE qualification_reference SET
  match_keywords = ARRAY['Cisco合作伙伴', '思科合作伙伴', 'Cisco Select', 'Cisco Gold'],
  common_aliases = ARRAY['Cisco分级合作伙伴']
WHERE qual_name = 'Cisco Select/Premier/Gold合作伙伴';

UPDATE qualification_reference SET
  match_keywords = ARRAY['Red Hat合作伙伴', '红帽合作伙伴', '红帽认证'],
  common_aliases = ARRAY['Red Hat认证服务合作伙伴']
WHERE qual_name = 'Red Hat认证服务合作伙伴';

UPDATE qualification_reference SET
  match_keywords = ARRAY['NetApp授权', 'NetApp合作伙伴'],
  common_aliases = ARRAY['NetApp授权服务合作伙伴']
WHERE qual_name = 'NetApp授权服务合作伙伴';

UPDATE qualification_reference SET
  match_keywords = ARRAY['达梦授权', '达梦服务商', '达梦合作伙伴'],
  common_aliases = ARRAY['达梦数据库授权服务商']
WHERE qual_name = '达梦授权服务商';

UPDATE qualification_reference SET
  match_keywords = ARRAY['金仓授权', '人大金仓服务商', '金仓合作伙伴'],
  common_aliases = ARRAY['人大金仓授权服务商']
WHERE qual_name = '人大金仓授权服务商';

UPDATE qualification_reference SET
  match_keywords = ARRAY['东方通授权', '东方通服务商', '东方通合作伙伴'],
  common_aliases = ARRAY['东方通授权服务商']
WHERE qual_name = '东方通授权服务商';

-- ============================================================
-- 更新所有记录的 search_vector
-- ============================================================
UPDATE qualification_reference SET id = id;

