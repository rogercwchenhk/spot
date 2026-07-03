-- ============================================================
-- 007_qualification_reference.sql
-- 常用资质参考库 — IT基础设施服务资质 & 认证标准术语库
-- ============================================================

CREATE TABLE qualification_reference (
  id              SERIAL PRIMARY KEY,
  category        VARCHAR(50) NOT NULL,    -- 大类：personnel / company
  subcategory     VARCHAR(100) NOT NULL,   -- 子类：如"服务器与操作系统认证"、"IT服务类资质"
  qual_name       VARCHAR(200) NOT NULL,   -- 资质/认证名称
  issuer          VARCHAR(200),            -- 发证机构
  level           VARCHAR(100),            -- 等级说明
  description     TEXT,                    -- 说明
  applicable_role VARCHAR(100),            -- 适用角色（人员认证用）
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE qualification_reference IS 'IT基础设施服务常用资质参考库，用于匹配引擎和前端下拉菜单';

CREATE INDEX idx_qual_ref_category ON qualification_reference (category, subcategory);
CREATE INDEX idx_qual_ref_name ON qualification_reference (qual_name);

-- RLS
ALTER TABLE qualification_reference ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON qualification_reference
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "authenticated_read" ON qualification_reference
  FOR SELECT USING (auth.role() = 'authenticated');


-- ============================================================
-- 种子数据：人员认证
-- ============================================================

-- 1.1 通用IT服务管理认证
INSERT INTO qualification_reference (category, subcategory, qual_name, issuer, applicable_role, description) VALUES
('personnel', '通用IT服务管理', 'ITSS项目经理', '中国电子工业标准化技术协会ITSS分会', '项目经理', 'IT服务项目管理，国内IT服务商必备'),
('personnel', '通用IT服务管理', 'ITSS运维工程师', 'ITSS分会', '运维工程师', 'IT运维服务交付能力认证'),
('personnel', '通用IT服务管理', 'ITSS咨询工程师', 'ITSS分会', '咨询顾问', 'IT服务咨询与规划能力认证'),
('personnel', '通用IT服务管理', 'PMP', 'PMI (美国项目管理协会)', '项目经理', '国际通用项目管理认证'),
('personnel', '通用IT服务管理', 'PRINCE2', 'AXELOS', '项目经理', '英国项目管理方法论认证'),
('personnel', '通用IT服务管理', 'ITIL 4 Foundation', 'AXELOS', '服务经理', 'IT服务管理最佳实践'),
('personnel', '通用IT服务管理', 'ITIL 4 Managing Professional', 'AXELOS', '服务经理', 'IT服务管理高级认证');

-- 1.2 信息安全认证
INSERT INTO qualification_reference (category, subcategory, qual_name, issuer, applicable_role, description) VALUES
('personnel', '信息安全', 'CISP', '中国信息安全测评中心', '安全工程师', '注册信息安全专业人员，国内安全从业必备'),
('personnel', '信息安全', 'CISP-PTE', '中国信息安全测评中心', '渗透测试工程师', '注册信息安全专业人员-渗透测试'),
('personnel', '信息安全', 'CISP-IRE', '中国信息安全测评中心', '应急响应工程师', '信息安全应急响应'),
('personnel', '信息安全', 'CISSP', '(ISC)²', '安全管理者', '国际信息安全最高认证'),
('personnel', '信息安全', 'CISA', 'ISACA', '审计师', '信息系统审计认证'),
('personnel', '信息安全', 'CISM', 'ISACA', '安全经理', '信息安全经理认证'),
('personnel', '信息安全', 'Security+', 'CompTIA', '安全工程师', '基础安全认证'),
('personnel', '信息安全', '等保测评师', '公安部', '测评人员', '等级保护测评资质');

-- 1.3 服务器与操作系统认证
INSERT INTO qualification_reference (category, subcategory, qual_name, issuer, applicable_role, description) VALUES
('personnel', '服务器与操作系统', 'HCIA-Intelligent Collaboration', '华为', '服务器工程师', '华为服务器技术认证-初级'),
('personnel', '服务器与操作系统', 'HCIP-Intelligent Collaboration', '华为', '服务器工程师', '华为服务器技术认证-高级'),
('personnel', '服务器与操作系统', 'HCIE-Intelligent Collaboration', '华为', '服务器工程师', '华为服务器技术认证-专家'),
('personnel', '服务器与操作系统', 'RHCSA', 'Red Hat', 'Linux工程师', 'RHEL系统管理认证-管理员'),
('personnel', '服务器与操作系统', 'RHCE', 'Red Hat', 'Linux工程师', 'RHEL系统管理认证-工程师'),
('personnel', '服务器与操作系统', 'RHCA', 'Red Hat', 'Linux工程师', 'RHEL系统管理认证-架构师'),
('personnel', '服务器与操作系统', 'Azure Administrator', 'Microsoft', 'Windows Server工程师', 'Windows Server/Azure认证'),
('personnel', '服务器与操作系统', 'SUSE Certified Administrator', 'SUSE', 'Linux工程师', 'SLES系统管理认证'),
('personnel', '服务器与操作系统', 'KYCA', '麒麟软件', '国产OS工程师', '银河麒麟系统管理-初级'),
('personnel', '服务器与操作系统', 'KYCP', '麒麟软件', '国产OS工程师', '银河麒麟系统管理-高级'),
('personnel', '服务器与操作系统', 'UCA', '统信软件', '国产OS工程师', '统信UOS系统管理-初级'),
('personnel', '服务器与操作系统', 'UCP', '统信软件', '国产OS工程师', '统信UOS系统管理-高级'),
('personnel', '服务器与操作系统', 'openEuler认证工程师', '开放原子基金会', '欧拉OS工程师', 'openEuler系统管理');

-- 1.4 存储认证
INSERT INTO qualification_reference (category, subcategory, qual_name, issuer, applicable_role, description) VALUES
('personnel', '存储', 'Dell EMC EISA', 'Dell Technologies', '存储工程师', '存储基础+产品认证'),
('personnel', '存储', 'Dell EMC DEA', 'Dell Technologies', '存储高级工程师', '存储解决方案设计'),
('personnel', '存储', 'Dell EMC DEP', 'Dell Technologies', '存储高级工程师', '存储实施认证'),
('personnel', '存储', 'NCDA', 'NetApp', '存储工程师', 'ONTAP管理认证'),
('personnel', '存储', 'NCIS', 'NetApp', '存储实施工程师', 'NetApp实施认证'),
('personnel', '存储', 'HCIA-Storage', '华为', '存储工程师', '华为存储技术认证-初级'),
('personnel', '存储', 'HCIP-Storage', '华为', '存储工程师', '华为存储技术认证-高级'),
('personnel', '存储', 'H3CNE-Storage', '新华三', '存储工程师', 'H3C存储认证-初级'),
('personnel', '存储', 'H3CSE-Storage', '新华三', '存储工程师', 'H3C存储认证-高级'),
('personnel', '存储', 'Pure Storage Certified Engineer', 'Pure Storage', '存储工程师', 'FlashArray/FlashBlade认证');

-- 1.5 网络认证
INSERT INTO qualification_reference (category, subcategory, qual_name, issuer, applicable_role, description) VALUES
('personnel', '网络', 'CCNA', 'Cisco', '网络工程师', 'Cisco网络认证-初级'),
('personnel', '网络', 'CCNP', 'Cisco', '网络工程师', 'Cisco网络认证-高级'),
('personnel', '网络', 'CCIE', 'Cisco', '网络工程师', 'Cisco网络认证-专家'),
('personnel', '网络', 'CCNA Security', 'Cisco', '安全工程师', 'Cisco安全认证-初级'),
('personnel', '网络', 'CCNP Security', 'Cisco', '安全工程师', 'Cisco安全认证-高级'),
('personnel', '网络', 'JNCIA', 'Juniper', '网络工程师', 'Junos认证-初级'),
('personnel', '网络', 'JNCIS', 'Juniper', '网络工程师', 'Junos认证-中级'),
('personnel', '网络', 'JNCIE', 'Juniper', '网络工程师', 'Junos认证-专家'),
('personnel', '网络', 'PCNSA', 'Palo Alto', '安全工程师', 'Palo Alto防火墙认证-初级'),
('personnel', '网络', 'PCNSE', 'Palo Alto', '安全工程师', 'Palo Alto防火墙认证-高级'),
('personnel', '网络', 'FCP', 'Fortinet', '安全工程师', 'Fortinet安全认证-初级'),
('personnel', '网络', 'FCSS', 'Fortinet', '安全工程师', 'Fortinet安全认证-高级'),
('personnel', '网络', 'HCIA-Datacom', '华为', '网络工程师', '华为数通认证-初级'),
('personnel', '网络', 'HCIP-Datacom', '华为', '网络工程师', '华为数通认证-高级'),
('personnel', '网络', 'HCIE-Datacom', '华为', '网络工程师', '华为数通认证-专家'),
('personnel', '网络', 'HCIP-Security', '华为', '安全工程师', '华为安全认证'),
('personnel', '网络', 'H3CNE', '新华三', '网络工程师', 'H3C网络认证-初级'),
('personnel', '网络', 'H3CSE', '新华三', '网络工程师', 'H3C网络认证-高级'),
('personnel', '网络', 'H3CIE', '新华三', '网络工程师', 'H3C网络认证-专家'),
('personnel', '网络', 'H3CNE-Security', '新华三', '安全工程师', 'H3C安全认证-初级'),
('personnel', '网络', 'H3CSE-Security', '新华三', '安全工程师', 'H3C安全认证-高级'),
('personnel', '网络', 'RCNA', '锐捷', '网络工程师', '锐捷网络认证-初级'),
('personnel', '网络', 'RCNP', '锐捷', '网络工程师', '锐捷网络认证-高级'),
('personnel', '网络', 'RCIE', '锐捷', '网络工程师', '锐捷网络认证-专家'),
('personnel', '网络', 'F5-CA', 'F5', '应用交付工程师', 'BIG-IP管理认证'),
('personnel', '网络', 'F5-CTS', 'F5', '应用交付高级工程师', 'BIG-IP高级认证');

-- 1.6 数据库认证
INSERT INTO qualification_reference (category, subcategory, qual_name, issuer, applicable_role, description) VALUES
('personnel', '数据库', 'Oracle OCP', 'Oracle', 'DBA', 'Oracle数据库管理员认证'),
('personnel', '数据库', 'Oracle OCM', 'Oracle', '高级DBA', 'Oracle认证大师（最高级）'),
('personnel', '数据库', 'DP-300', 'Microsoft', 'DBA', 'Azure/SQL Server数据库管理员'),
('personnel', '数据库', 'MySQL Certification', 'Oracle', 'DBA', 'MySQL认证'),
('personnel', '数据库', 'PostgreSQL Certification', 'EDB/PostgreSQL社区', 'DBA', 'PostgreSQL认证'),
('personnel', '数据库', 'MongoDB Certified DBA', 'MongoDB', 'DBA', 'MongoDB数据库管理员'),
('personnel', '数据库', '达梦DCA', '达梦', 'DBA', '达梦数据库认证工程师-初级'),
('personnel', '数据库', '达梦DCP', '达梦', 'DBA', '达梦数据库认证工程师-高级'),
('personnel', '数据库', '达梦DCE', '达梦', 'DBA', '达梦数据库认证工程师-专家'),
('personnel', '数据库', '人大金仓KCA', '人大金仓', 'DBA', 'KingbaseES认证工程师-初级'),
('personnel', '数据库', '人大金仓KCP', '人大金仓', 'DBA', 'KingbaseES认证工程师-高级'),
('personnel', '数据库', 'OceanBase OBCA', '蚂蚁集团', 'DBA', 'OceanBase认证-初级'),
('personnel', '数据库', 'OceanBase OBCP', '蚂蚁集团', 'DBA', 'OceanBase认证-高级'),
('personnel', '数据库', 'TiDB PCTA', 'PingCAP', 'DBA', 'TiDB认证-初级'),
('personnel', '数据库', 'TiDB PCTP', 'PingCAP', 'DBA', 'TiDB认证-高级'),
('personnel', '数据库', 'HCIA-GaussDB', '华为', 'DBA', 'GaussDB认证-初级'),
('personnel', '数据库', 'HCIP-GaussDB', '华为', 'DBA', 'GaussDB认证-高级'),
('personnel', '数据库', 'GBase认证', '南大通用', 'DBA', 'GBase数据库认证');

-- 1.7 中间件认证
INSERT INTO qualification_reference (category, subcategory, qual_name, issuer, applicable_role, description) VALUES
('personnel', '中间件', 'Oracle WebLogic认证', 'Oracle', '中间件工程师', 'WebLogic管理认证'),
('personnel', '中间件', 'IBM WebSphere认证', 'IBM', '中间件工程师', 'WebSphere管理认证'),
('personnel', '中间件', 'IBM MQ认证', 'IBM', '中间件工程师', 'IBM MQ认证'),
('personnel', '中间件', 'JBoss认证', 'Red Hat', '中间件工程师', 'JBoss EAP认证'),
('personnel', '中间件', '东方通认证工程师', '东方通', '中间件工程师', 'TongWeb/TongLINK等认证'),
('personnel', '中间件', '宝兰德认证工程师', '宝兰德', '中间件工程师', 'BES认证'),
('personnel', '中间件', '金蝶天燕认证工程师', '金蝶天燕', '中间件工程师', 'Apusic认证');

-- 1.8 虚拟化与云计算认证
INSERT INTO qualification_reference (category, subcategory, qual_name, issuer, applicable_role, description) VALUES
('personnel', '虚拟化与云计算', 'VCP', 'VMware (Broadcom)', '虚拟化工程师', 'vSphere专业认证'),
('personnel', '虚拟化与云计算', 'VCAP', 'VMware', '高级虚拟化工程师', 'VMware高级认证'),
('personnel', '虚拟化与云计算', 'VCDX', 'VMware', '虚拟化架构师', 'VMware最高认证'),
('personnel', '虚拟化与云计算', 'HCIA-Cloud Computing', '华为', '云计算工程师', '华为云计算认证-初级'),
('personnel', '虚拟化与云计算', 'HCIP-Cloud Computing', '华为', '云计算工程师', '华为云计算认证-高级'),
('personnel', '虚拟化与云计算', 'HCIA-Cloud Service', '华为', '云服务工程师', '华为云服务认证-初级'),
('personnel', '虚拟化与云计算', 'HCIP-Cloud Service', '华为', '云服务工程师', '华为云服务认证-高级'),
('personnel', '虚拟化与云计算', 'H3CNE-Cloud', '新华三', '云计算工程师', 'H3C云计算认证-初级'),
('personnel', '虚拟化与云计算', 'H3CSE-Cloud', '新华三', '云计算工程师', 'H3C云计算认证-高级'),
('personnel', '虚拟化与云计算', 'OpenShift认证', 'Red Hat', '容器工程师', 'OpenShift认证'),
('personnel', '虚拟化与云计算', 'CKA', 'CNCF', 'K8s管理员', 'Kubernetes管理认证'),
('personnel', '虚拟化与云计算', 'CKAD', 'CNCF', 'K8s开发', 'Kubernetes应用开发认证'),
('personnel', '虚拟化与云计算', 'CKS', 'CNCF', 'K8s安全', 'Kubernetes安全认证'),
('personnel', '虚拟化与云计算', 'DCA', 'Docker/Mirantis', '容器工程师', 'Docker认证');

-- 1.9 备份与容灾认证
INSERT INTO qualification_reference (category, subcategory, qual_name, issuer, applicable_role, description) VALUES
('personnel', '备份与容灾', 'VMCE', 'Veeam', '备份工程师', 'Veeam认证工程师'),
('personnel', '备份与容灾', 'VMCA', 'Veeam', '备份架构师', 'Veeam认证架构师'),
('personnel', '备份与容灾', 'Commvault Certified Professional', 'Commvault', '备份工程师', 'Commvault认证'),
('personnel', '备份与容灾', 'NetBackup Certified Administrator', 'Veritas', '备份工程师', 'NetBackup管理认证'),
('personnel', '备份与容灾', 'HCIA-Data Protection', '华为', '备份工程师', '华为数据保护认证'),
('personnel', '备份与容灾', '鼎甲认证工程师', '鼎甲', '备份工程师', 'DBackup认证'),
('personnel', '备份与容灾', '爱数认证工程师', '爱数', '备份工程师', 'AnyBackup认证');

-- 1.10 项目管理与IT治理
INSERT INTO qualification_reference (category, subcategory, qual_name, issuer, applicable_role, description) VALUES
('personnel', '项目管理与IT治理', 'COBIT 5 Foundation', 'ISACA', 'IT治理', 'IT治理框架'),
('personnel', '项目管理与IT治理', 'ISO 20000 Lead Auditor', 'BSI/IRCA', '审计师', 'IT服务管理体系审计'),
('personnel', '项目管理与IT治理', 'ISO 27001 Lead Auditor', 'BSI/IRCA', '审计师', '信息安全管理体系审计');


-- ============================================================
-- 种子数据：企业资质
-- ============================================================

-- 2.1 IT服务类资质
INSERT INTO qualification_reference (category, subcategory, qual_name, issuer, level, description) VALUES
('company', 'IT服务类', 'ITSS运行维护服务能力', 'ITSS分会', '一级/二级/三级/四级', 'IT运维服务能力成熟度，招投标必备'),
('company', 'IT服务类', 'ITSS咨询设计能力', 'ITSS分会', '一级/二级/三级', 'IT咨询设计服务'),
('company', 'IT服务类', '信息系统集成及服务资质', '中国电子信息行业联合会', '一级/二级/三级/四级', '信息系统集成能力'),
('company', 'IT服务类', 'CS信息系统建设和服务能力评估', '中国电子信息行业联合会', 'CS1-CS5', '替代原集成资质'),
('company', 'IT服务类', 'CCRC信息安全服务-安全集成', '中国网络安全审查技术与认证中心', '一级/二级/三级', '安全系统集成服务'),
('company', 'IT服务类', 'CCRC信息安全服务-安全运维', '中国网络安全审查技术与认证中心', '一级/二级/三级', '安全运维服务'),
('company', 'IT服务类', 'CCRC信息安全服务-灾难备份与恢复', '中国网络安全审查技术与认证中心', '一级/二级/三级', '灾备服务资质'),
('company', 'IT服务类', 'CCRC信息安全服务-风险评估', '中国网络安全审查技术与认证中心', '一级/二级/三级', '风险评估服务'),
('company', 'IT服务类', 'CCRC信息安全服务-应急响应', '中国网络安全审查技术与认证中心', '一级/二级/三级', '应急响应服务'),
('company', 'IT服务类', 'CMMI', 'CMMI Institute', '3级/4级/5级', '软件研发能力成熟度');

-- 2.2 信息安全类资质
INSERT INTO qualification_reference (category, subcategory, qual_name, issuer, description) VALUES
('company', '信息安全类', '等保测评机构资质', '公安部', '等级保护测评服务资质'),
('company', '信息安全类', '涉密信息系统集成资质', '国家保密局', '甲/乙级，涉密项目必备');

-- 2.3 云服务与数据中心资质
INSERT INTO qualification_reference (category, subcategory, qual_name, issuer, description) VALUES
('company', '云服务与数据中心', 'IDC许可证', '工信部', '数据中心经营许可'),
('company', '云服务与数据中心', 'ISP许可证', '工信部', '互联网接入服务经营许可'),
('company', '云服务与数据中心', '云计算服务安全评估', '中央网信办/工信部', '政务云安全评估'),
('company', '云服务与数据中心', 'Uptime Institute Tier认证', 'Uptime Institute', '数据中心等级认证 (Tier I-IV)'),
('company', '云服务与数据中心', 'GB50174数据中心资质', '住建部', '数据中心设计与运维');

-- 2.4 管理体系认证
INSERT INTO qualification_reference (category, subcategory, qual_name, issuer, description) VALUES
('company', '管理体系认证', 'ISO 9001', '国际标准化组织', '质量管理体系'),
('company', '管理体系认证', 'ISO 20000', '国际标准化组织', 'IT服务管理体系'),
('company', '管理体系认证', 'ISO 27001', '国际标准化组织', '信息安全管理体系'),
('company', '管理体系认证', 'ISO 22301', '国际标准化组织', '业务连续性管理体系'),
('company', '管理体系认证', 'ISO 14001', '国际标准化组织', '环境管理体系'),
('company', '管理体系认证', 'ISO 45001', '国际标准化组织', '职业健康安全管理体系');

-- 2.5 品牌授权与服务资质
INSERT INTO qualification_reference (category, subcategory, qual_name, issuer, description) VALUES
('company', '品牌授权', '华为ASP授权服务合作伙伴', '华为', '华为产品服务授权'),
('company', '品牌授权', '华为钻石/金牌/银牌合作伙伴', '华为', '华为分级合作体系'),
('company', '品牌授权', '新华三五星/四星/三星服务商', '新华三', 'H3C服务合作分级'),
('company', '品牌授权', 'Dell授权服务合作伙伴', 'Dell Technologies', 'Dell服务授权'),
('company', '品牌授权', 'VMware授权合作伙伴', 'VMware (Broadcom)', 'VMware授权'),
('company', '品牌授权', 'Cisco Select/Premier/Gold合作伙伴', 'Cisco', 'Cisco合作分级'),
('company', '品牌授权', 'Red Hat认证服务合作伙伴', 'Red Hat', 'Red Hat服务授权'),
('company', '品牌授权', 'NetApp授权服务合作伙伴', 'NetApp', 'NetApp服务授权'),
('company', '品牌授权', '达梦授权服务商', '达梦', '达梦数据库服务授权'),
('company', '品牌授权', '人大金仓授权服务商', '人大金仓', '金仓数据库服务授权'),
('company', '品牌授权', '东方通授权服务商', '东方通', '东方通中间件服务授权');

