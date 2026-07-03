-- ============================================================
-- 010_seed_qualification_data.sql
-- 插入资质参考库种子数据（含 AI 友好字段）
-- ============================================================

-- 1.1 通用IT服务管理
INSERT INTO qualification_reference (category, subcategory, qual_name, issuer, applicable_role, description, match_keywords, common_aliases) VALUES
('personnel', '通用IT服务管理', 'ITSS项目经理', '中国电子工业标准化技术协会ITSS分会', '项目经理', 'IT服务项目管理，国内IT服务商必备', ARRAY['ITSS项目经理','ITSS 项目经理','IT服务项目经理'], ARRAY['ITSS PM']),
('personnel', '通用IT服务管理', 'ITSS运维工程师', 'ITSS分会', '运维工程师', 'IT运维服务交付能力认证', ARRAY['ITSS运维工程师','ITSS 运维工程师','IT运维工程师'], ARRAY['ITSS OE']),
('personnel', '通用IT服务管理', 'ITSS咨询工程师', 'ITSS分会', '咨询顾问', 'IT服务咨询与规划能力认证', ARRAY['ITSS咨询工程师','ITSS 咨询工程师','IT咨询'], ARRAY['ITSS CE']),
('personnel', '通用IT服务管理', 'PMP', 'PMI (美国项目管理协会)', '项目经理', '国际通用项目管理认证', ARRAY['PMP','PMP证书','PMP认证','项目管理专业人士'], ARRAY['项目管理专业人士认证']),
('personnel', '通用IT服务管理', 'PRINCE2', 'AXELOS', '项目经理', '英国项目管理方法论认证', ARRAY['PRINCE2','PRINCE2认证','PRINCE2证书'], ARRAY[]::text[]),
('personnel', '通用IT服务管理', 'ITIL 4 Foundation', 'AXELOS', '服务经理', 'IT服务管理最佳实践', ARRAY['ITIL','ITIL 4','ITIL认证','IT服务管理'], ARRAY['ITIL Foundation']),
('personnel', '通用IT服务管理', 'ITIL 4 Managing Professional', 'AXELOS', '服务经理', 'IT服务管理高级认证', ARRAY['ITIL','ITIL 4','ITIL MP'], ARRAY['ITIL Managing Professional']);

-- 1.2 信息安全认证
INSERT INTO qualification_reference (category, subcategory, qual_name, issuer, applicable_role, description, match_keywords, common_aliases) VALUES
('personnel', '信息安全', 'CISP', '中国信息安全测评中心', '安全工程师', '注册信息安全专业人员，国内安全从业必备', ARRAY['CISP','CISP证书','注册信息安全专业人员','信息安全专业人员'], ARRAY['注册信息安全专业人员']),
('personnel', '信息安全', 'CISP-PTE', '中国信息安全测评中心', '渗透测试工程师', '注册信息安全专业人员-渗透测试', ARRAY['CISP-PTE','渗透测试','CISP PTE'], ARRAY['渗透测试工程师认证']),
('personnel', '信息安全', 'CISP-IRE', '中国信息安全测评中心', '应急响应工程师', '信息安全应急响应', ARRAY['CISP-IRE','应急响应','CISP IRE'], ARRAY['应急响应工程师认证']),
('personnel', '信息安全', 'CISSP', '(ISC)²', '安全管理者', '国际信息安全最高认证', ARRAY['CISSP','CISSP证书','信息系统安全专业人员'], ARRAY['Certified Information Systems Security Professional']),
('personnel', '信息安全', 'CISA', 'ISACA', '审计师', '信息系统审计认证', ARRAY['CISA','CISA证书','信息系统审计师'], ARRAY['Certified Information Systems Auditor']),
('personnel', '信息安全', 'CISM', 'ISACA', '安全经理', '信息安全经理认证', ARRAY['CISM','CISM证书','信息安全经理'], ARRAY['Certified Information Security Manager']),
('personnel', '信息安全', 'Security+', 'CompTIA', '安全工程师', '基础安全认证', ARRAY['Security+','CompTIA Security+','安全+'], ARRAY['CompTIA Security Plus']),
('personnel', '信息安全', '等保测评师', '公安部', '测评人员', '等级保护测评资质', ARRAY['等保测评师','等保测评','等级保护测评'], ARRAY['等级保护测评人员']);

-- 1.3 服务器与操作系统认证
INSERT INTO qualification_reference (category, subcategory, qual_name, issuer, applicable_role, description, match_keywords, common_aliases) VALUES
('personnel', '服务器与操作系统', 'HCIA-Intelligent Collaboration', '华为', '服务器工程师', '华为服务器技术认证-初级', ARRAY['HCIA','HCIA-Server','华为服务器','华为HCIA'], ARRAY['华为认证ICT初级-服务器']),
('personnel', '服务器与操作系统', 'HCIP-Intelligent Collaboration', '华为', '服务器工程师', '华为服务器技术认证-高级', ARRAY['HCIP','HCIP-Server','华为服务器','华为HCIP'], ARRAY['华为认证ICT高级-服务器']),
('personnel', '服务器与操作系统', 'HCIE-Intelligent Collaboration', '华为', '服务器工程师', '华为服务器技术认证-专家', ARRAY['HCIE','HCIE-Server','华为服务器','华为HCIE'], ARRAY['华为认证ICT专家-服务器']),
('personnel', '服务器与操作系统', 'RHCSA', 'Red Hat', 'Linux工程师', 'RHEL系统管理认证-管理员', ARRAY['RHCSA','红帽RHCSA','Red Hat RHCSA','红帽系统管理员'], ARRAY['Red Hat Certified System Administrator']),
('personnel', '服务器与操作系统', 'RHCE', 'Red Hat', 'Linux工程师', 'RHEL系统管理认证-工程师', ARRAY['RHCE','红帽RHCE','Red Hat RHCE','红帽工程师','红帽认证工程师'], ARRAY['Red Hat Certified Engineer']),
('personnel', '服务器与操作系统', 'RHCA', 'Red Hat', 'Linux工程师', 'RHEL系统管理认证-架构师', ARRAY['RHCA','红帽RHCA','Red Hat RHCA','红帽架构师'], ARRAY['Red Hat Certified Architect']),
('personnel', '服务器与操作系统', 'Azure Administrator', 'Microsoft', 'Windows Server工程师', 'Windows Server/Azure认证', ARRAY['Azure Administrator','Azure管理员认证','微软Azure'], ARRAY['AZ-104']),
('personnel', '服务器与操作系统', 'SUSE Certified Administrator', 'SUSE', 'Linux工程师', 'SLES系统管理认证', ARRAY['SUSE认证','SUSE管理员','SLES'], ARRAY['SUSE Certified Linux Administrator']),
('personnel', '服务器与操作系统', 'KYCA', '麒麟软件', '国产OS工程师', '银河麒麟系统管理-初级', ARRAY['KYCA','麒麟KYCA','银河麒麟初级','麒麟认证'], ARRAY['银河麒麟系统管理员']),
('personnel', '服务器与操作系统', 'KYCP', '麒麟软件', '国产OS工程师', '银河麒麟系统管理-高级', ARRAY['KYCP','麒麟KYCP','银河麒麟高级'], ARRAY['银河麒麟高级管理员']),
('personnel', '服务器与操作系统', 'UCA', '统信软件', '国产OS工程师', '统信UOS系统管理-初级', ARRAY['UCA','统信UCA','统信UOS初级','统信认证'], ARRAY['统信UOS系统管理员']),
('personnel', '服务器与操作系统', 'UCP', '统信软件', '国产OS工程师', '统信UOS系统管理-高级', ARRAY['UCP','统信UCP','统信UOS高级'], ARRAY['统信UOS高级管理员']),
('personnel', '服务器与操作系统', 'openEuler认证工程师', '开放原子基金会', '欧拉OS工程师', 'openEuler系统管理', ARRAY['openEuler','欧拉认证','openEuler工程师'], ARRAY['openEuler系统管理员']);

-- 1.4 存储认证
INSERT INTO qualification_reference (category, subcategory, qual_name, issuer, applicable_role, description, match_keywords, common_aliases) VALUES
('personnel', '存储', 'Dell EMC EISA', 'Dell Technologies', '存储工程师', '存储基础+产品认证', ARRAY['Dell EMC EISA','EISA','Dell存储认证','戴尔存储'], ARRAY['Dell EMC Information Storage Associate']),
('personnel', '存储', 'Dell EMC DEA', 'Dell Technologies', '存储高级工程师', '存储解决方案设计', ARRAY['Dell EMC DEA','DEA','Dell存储高级'], ARRAY['Dell EMC Associate']),
('personnel', '存储', 'Dell EMC DEP', 'Dell Technologies', '存储高级工程师', '存储实施认证', ARRAY['Dell EMC DEP','DEP','Dell存储专家'], ARRAY['Dell EMC Professional']),
('personnel', '存储', 'NCDA', 'NetApp', '存储工程师', 'ONTAP管理认证', ARRAY['NCDA','NetApp NCDA','NetApp认证'], ARRAY['NetApp Certified Data Administrator']),
('personnel', '存储', 'NCIS', 'NetApp', '存储实施工程师', 'NetApp实施认证', ARRAY['NCIS','NetApp NCIS','NetApp实施'], ARRAY['NetApp Certified Implementation Specialist']),
('personnel', '存储', 'HCIA-Storage', '华为', '存储工程师', '华为存储技术认证-初级', ARRAY['HCIA-Storage','华为存储初级','华为HCIA存储'], ARRAY['华为存储认证初级']),
('personnel', '存储', 'HCIP-Storage', '华为', '存储工程师', '华为存储技术认证-高级', ARRAY['HCIP-Storage','华为存储高级','华为HCIP存储'], ARRAY['华为存储认证高级']),
('personnel', '存储', 'H3CNE-Storage', '新华三', '存储工程师', 'H3C存储认证-初级', ARRAY['H3CNE-Storage','H3C存储初级','新华三存储'], ARRAY['H3C存储认证初级']),
('personnel', '存储', 'H3CSE-Storage', '新华三', '存储工程师', 'H3C存储认证-高级', ARRAY['H3CSE-Storage','H3C存储高级'], ARRAY['H3C存储认证高级']),
('personnel', '存储', 'Pure Storage Certified Engineer', 'Pure Storage', '存储工程师', 'FlashArray/FlashBlade认证', ARRAY['Pure Storage认证','Pure Storage工程师','FlashArray'], ARRAY['Pure Storage Certified Professional']);

-- 1.5 网络认证
INSERT INTO qualification_reference (category, subcategory, qual_name, issuer, applicable_role, description, match_keywords, common_aliases) VALUES
('personnel', '网络', 'CCNA', 'Cisco', '网络工程师', 'Cisco网络认证-初级', ARRAY['CCNA','思科CCNA','Cisco CCNA'], ARRAY['Cisco Certified Network Associate']),
('personnel', '网络', 'CCNP', 'Cisco', '网络工程师', 'Cisco网络认证-高级', ARRAY['CCNP','思科CCNP','Cisco CCNP'], ARRAY['Cisco Certified Network Professional']),
('personnel', '网络', 'CCIE', 'Cisco', '网络工程师', 'Cisco网络认证-专家', ARRAY['CCIE','思科CCIE','Cisco CCIE'], ARRAY['Cisco Certified Internetwork Expert']),
('personnel', '网络', 'CCNA Security', 'Cisco', '安全工程师', 'Cisco安全认证-初级', ARRAY['CCNA Security','思科安全初级'], ARRAY['Cisco Certified Network Associate Security']),
('personnel', '网络', 'CCNP Security', 'Cisco', '安全工程师', 'Cisco安全认证-高级', ARRAY['CCNP Security','思科安全高级'], ARRAY['Cisco Certified Network Professional Security']),
('personnel', '网络', 'JNCIA', 'Juniper', '网络工程师', 'Junos认证-初级', ARRAY['JNCIA','Juniper JNCIA','瞻博网络初级'], ARRAY['Juniper Networks Certified Internet Associate']),
('personnel', '网络', 'JNCIS', 'Juniper', '网络工程师', 'Junos认证-中级', ARRAY['JNCIS','Juniper JNCIS','瞻博网络中级'], ARRAY['Juniper Networks Certified Internet Specialist']),
('personnel', '网络', 'JNCIE', 'Juniper', '网络工程师', 'Junos认证-专家', ARRAY['JNCIE','Juniper JNCIE','瞻博网络专家'], ARRAY['Juniper Networks Certified Internet Expert']),
('personnel', '网络', 'PCNSA', 'Palo Alto', '安全工程师', 'Palo Alto防火墙认证-初级', ARRAY['PCNSA','Palo Alto PCNSA','派拓网络初级'], ARRAY['Palo Alto Networks Certified Network Security Administrator']),
('personnel', '网络', 'PCNSE', 'Palo Alto', '安全工程师', 'Palo Alto防火墙认证-高级', ARRAY['PCNSE','Palo Alto PCNSE','派拓网络高级'], ARRAY['Palo Alto Networks Certified Network Security Engineer']),
('personnel', '网络', 'FCP', 'Fortinet', '安全工程师', 'Fortinet安全认证-初级', ARRAY['FCP','Fortinet FCP','飞塔初级'], ARRAY['Fortinet Certified Professional']),
('personnel', '网络', 'FCSS', 'Fortinet', '安全工程师', 'Fortinet安全认证-高级', ARRAY['FCSS','Fortinet FCSS','飞塔高级'], ARRAY['Fortinet Certified Solution Specialist']),
('personnel', '网络', 'HCIA-Datacom', '华为', '网络工程师', '华为数通认证-初级', ARRAY['HCIA-Datacom','华为数通初级','华为路由交换初级'], ARRAY['华为数通认证初级']),
('personnel', '网络', 'HCIP-Datacom', '华为', '网络工程师', '华为数通认证-高级', ARRAY['HCIP-Datacom','华为数通高级','华为路由交换高级'], ARRAY['华为数通认证高级']),
('personnel', '网络', 'HCIE-Datacom', '华为', '网络工程师', '华为数通认证-专家', ARRAY['HCIE-Datacom','华为数通专家','华为路由交换专家'], ARRAY['华为数通认证专家']),
('personnel', '网络', 'HCIP-Security', '华为', '安全工程师', '华为安全认证', ARRAY['HCIP-Security','华为安全','华为安全认证'], ARRAY['华为安全认证高级']),
('personnel', '网络', 'H3CNE', '新华三', '网络工程师', 'H3C网络认证-初级', ARRAY['H3CNE','H3C初级','新华三初级'], ARRAY['H3C Certified Network Engineer']),
('personnel', '网络', 'H3CSE', '新华三', '网络工程师', 'H3C网络认证-高级', ARRAY['H3CSE','H3C高级','新华三高级'], ARRAY['H3C Certified Senior Engineer']),
('personnel', '网络', 'H3CIE', '新华三', '网络工程师', 'H3C网络认证-专家', ARRAY['H3CIE','H3C专家','新华三专家'], ARRAY['H3C Certified Internetwork Expert']),
('personnel', '网络', 'H3CNE-Security', '新华三', '安全工程师', 'H3C安全认证-初级', ARRAY['H3CNE-Security','H3C安全初级'], ARRAY['H3C安全认证初级']),
('personnel', '网络', 'H3CSE-Security', '新华三', '安全工程师', 'H3C安全认证-高级', ARRAY['H3CSE-Security','H3C安全高级'], ARRAY['H3C安全认证高级']),
('personnel', '网络', 'RCNA', '锐捷', '网络工程师', '锐捷网络认证-初级', ARRAY['RCNA','锐捷RCNA','锐捷初级'], ARRAY['锐捷网络认证初级']),
('personnel', '网络', 'RCNP', '锐捷', '网络工程师', '锐捷网络认证-高级', ARRAY['RCNP','锐捷RCNP','锐捷高级'], ARRAY['锐捷网络认证高级']),
('personnel', '网络', 'RCIE', '锐捷', '网络工程师', '锐捷网络认证-专家', ARRAY['RCIE','锐捷RCIE','锐捷专家'], ARRAY['锐捷网络认证专家']),
('personnel', '网络', 'F5-CA', 'F5', '应用交付工程师', 'BIG-IP管理认证', ARRAY['F5-CA','F5认证','F5管理员认证','BIG-IP'], ARRAY['F5 Certified Administrator']),
('personnel', '网络', 'F5-CTS', 'F5', '应用交付高级工程师', 'BIG-IP高级认证', ARRAY['F5-CTS','F5高级认证','F5专家'], ARRAY['F5 Certified Technology Specialist']);

-- 1.6 数据库认证
INSERT INTO qualification_reference (category, subcategory, qual_name, issuer, applicable_role, description, match_keywords, common_aliases) VALUES
('personnel', '数据库', 'Oracle OCP', 'Oracle', 'DBA', 'Oracle数据库管理员认证', ARRAY['OCP','Oracle OCP','OCP证书','数据库管理员','Oracle认证'], ARRAY['Oracle Certified Professional']),
('personnel', '数据库', 'Oracle OCM', 'Oracle', '高级DBA', 'Oracle认证大师（最高级）', ARRAY['OCM','Oracle OCM','OCM证书','Oracle大师'], ARRAY['Oracle Certified Master']),
('personnel', '数据库', 'DP-300', 'Microsoft', 'DBA', 'Azure/SQL Server数据库管理员', ARRAY['DP-300','Azure DBA','SQL Server认证'], ARRAY['Azure Database Administrator Associate']),
('personnel', '数据库', 'MySQL Certification', 'Oracle', 'DBA', 'MySQL认证', ARRAY['MySQL认证','MySQL证书','MySQL DBA'], ARRAY['MySQL Certified DBA']),
('personnel', '数据库', 'PostgreSQL Certification', 'EDB/PostgreSQL社区', 'DBA', 'PostgreSQL认证', ARRAY['PostgreSQL认证','PG认证','PostgreSQL DBA'], ARRAY['PostgreSQL Certified Professional']),
('personnel', '数据库', 'MongoDB Certified DBA', 'MongoDB', 'DBA', 'MongoDB数据库管理员', ARRAY['MongoDB认证','MongoDB DBA','MongoDB证书'], ARRAY['MongoDB Certified DBA']),
('personnel', '数据库', '达梦DCA', '达梦', 'DBA', '达梦数据库认证工程师-初级', ARRAY['达梦DCA','达梦初级','达梦认证初级'], ARRAY['达梦数据库认证工程师初级']),
('personnel', '数据库', '达梦DCP', '达梦', 'DBA', '达梦数据库认证工程师-高级', ARRAY['达梦DCP','达梦高级','达梦认证高级'], ARRAY['达梦数据库认证工程师高级']),
('personnel', '数据库', '达梦DCE', '达梦', 'DBA', '达梦数据库认证工程师-专家', ARRAY['达梦DCE','达梦专家','达梦认证专家'], ARRAY['达梦数据库认证工程师专家']),
('personnel', '数据库', '人大金仓KCA', '人大金仓', 'DBA', 'KingbaseES认证工程师-初级', ARRAY['金仓KCA','人大金仓KCA','金仓初级','KingbaseES'], ARRAY['金仓数据库认证初级']),
('personnel', '数据库', '人大金仓KCP', '人大金仓', 'DBA', 'KingbaseES认证工程师-高级', ARRAY['金仓KCP','人大金仓KCP','金仓高级'], ARRAY['金仓数据库认证高级']),
('personnel', '数据库', 'OceanBase OBCA', '蚂蚁集团', 'DBA', 'OceanBase认证-初级', ARRAY['OBCA','OceanBase OBCA','OceanBase初级'], ARRAY['OceanBase认证初级']),
('personnel', '数据库', 'OceanBase OBCP', '蚂蚁集团', 'DBA', 'OceanBase认证-高级', ARRAY['OBCP','OceanBase OBCP','OceanBase高级'], ARRAY['OceanBase认证高级']),
('personnel', '数据库', 'TiDB PCTA', 'PingCAP', 'DBA', 'TiDB认证-初级', ARRAY['PCTA','TiDB PCTA','TiDB初级'], ARRAY['TiDB认证初级']),
('personnel', '数据库', 'TiDB PCTP', 'PingCAP', 'DBA', 'TiDB认证-高级', ARRAY['PCTP','TiDB PCTP','TiDB高级'], ARRAY['TiDB认证高级']),
('personnel', '数据库', 'HCIA-GaussDB', '华为', 'DBA', 'GaussDB认证-初级', ARRAY['HCIA-GaussDB','华为GaussDB初级','华为数据库初级'], ARRAY['华为GaussDB认证初级']),
('personnel', '数据库', 'HCIP-GaussDB', '华为', 'DBA', 'GaussDB认证-高级', ARRAY['HCIP-GaussDB','华为GaussDB高级','华为数据库高级'], ARRAY['华为GaussDB认证高级']),
('personnel', '数据库', 'GBase认证', '南大通用', 'DBA', 'GBase数据库认证', ARRAY['GBase认证','南大通用GBase','GBase DBA'], ARRAY['GBase数据库认证工程师']);

-- 1.7 中间件认证
INSERT INTO qualification_reference (category, subcategory, qual_name, issuer, applicable_role, description, match_keywords, common_aliases) VALUES
('personnel', '中间件', 'Oracle WebLogic认证', 'Oracle', '中间件工程师', 'WebLogic管理认证', ARRAY['WebLogic认证','WebLogic证书','Oracle WebLogic'], ARRAY['WebLogic管理员认证']),
('personnel', '中间件', 'IBM WebSphere认证', 'IBM', '中间件工程师', 'WebSphere管理认证', ARRAY['WebSphere认证','WebSphere证书','IBM WebSphere'], ARRAY['WebSphere管理员认证']),
('personnel', '中间件', 'IBM MQ认证', 'IBM', '中间件工程师', 'IBM MQ认证', ARRAY['IBM MQ认证','MQ证书','消息队列认证'], ARRAY['IBM MQ管理员认证']),
('personnel', '中间件', 'JBoss认证', 'Red Hat', '中间件工程师', 'JBoss EAP认证', ARRAY['JBoss认证','JBoss EAP','Red Hat JBoss'], ARRAY['JBoss EAP管理员认证']),
('personnel', '中间件', '东方通认证工程师', '东方通', '中间件工程师', 'TongWeb/TongLINK等认证', ARRAY['东方通认证','TongWeb认证','TongLINK认证'], ARRAY['东方通中间件认证工程师']),
('personnel', '中间件', '宝兰德认证工程师', '宝兰德', '中间件工程师', 'BES认证', ARRAY['宝兰德认证','BES认证'], ARRAY['宝兰德中间件认证']),
('personnel', '中间件', '金蝶天燕认证工程师', '金蝶天燕', '中间件工程师', 'Apusic认证', ARRAY['金蝶天燕认证','Apusic认证'], ARRAY['金蝶天燕中间件认证']);

-- 1.8 虚拟化与云计算认证
INSERT INTO qualification_reference (category, subcategory, qual_name, issuer, applicable_role, description, match_keywords, common_aliases) VALUES
('personnel', '虚拟化与云计算', 'VCP', 'VMware (Broadcom)', '虚拟化工程师', 'vSphere专业认证', ARRAY['VCP','VMware VCP','vSphere认证','VMware专业认证'], ARRAY['VMware Certified Professional']),
('personnel', '虚拟化与云计算', 'VCAP', 'VMware', '高级虚拟化工程师', 'VMware高级认证', ARRAY['VCAP','VMware VCAP','VMware高级认证'], ARRAY['VMware Certified Advanced Professional']),
('personnel', '虚拟化与云计算', 'VCDX', 'VMware', '虚拟化架构师', 'VMware最高认证', ARRAY['VCDX','VMware VCDX','VMware专家认证'], ARRAY['VMware Certified Design Expert']),
('personnel', '虚拟化与云计算', 'HCIA-Cloud Computing', '华为', '云计算工程师', '华为云计算认证-初级', ARRAY['HCIA-Cloud Computing','华为云计算初级','华为云初级'], ARRAY['华为云计算认证初级']),
('personnel', '虚拟化与云计算', 'HCIP-Cloud Computing', '华为', '云计算工程师', '华为云计算认证-高级', ARRAY['HCIP-Cloud Computing','华为云计算高级','华为云高级'], ARRAY['华为云计算认证高级']),
('personnel', '虚拟化与云计算', 'HCIA-Cloud Service', '华为', '云服务工程师', '华为云服务认证-初级', ARRAY['HCIA-Cloud Service','华为云服务初级'], ARRAY['华为云服务认证初级']),
('personnel', '虚拟化与云计算', 'HCIP-Cloud Service', '华为', '云服务工程师', '华为云服务认证-高级', ARRAY['HCIP-Cloud Service','华为云服务高级'], ARRAY['华为云服务认证高级']),
('personnel', '虚拟化与云计算', 'H3CNE-Cloud', '新华三', '云计算工程师', 'H3C云计算认证-初级', ARRAY['H3CNE-Cloud','H3C云计算初级','新华三云初级'], ARRAY['H3C云计算认证初级']),
('personnel', '虚拟化与云计算', 'H3CSE-Cloud', '新华三', '云计算工程师', 'H3C云计算认证-高级', ARRAY['H3CSE-Cloud','H3C云计算高级'], ARRAY['H3C云计算认证高级']),
('personnel', '虚拟化与云计算', 'OpenShift认证', 'Red Hat', '容器工程师', 'OpenShift认证', ARRAY['OpenShift认证','OpenShift','红帽OpenShift'], ARRAY['Red Hat Certified Specialist in OpenShift']),
('personnel', '虚拟化与云计算', 'CKA', 'CNCF', 'K8s管理员', 'Kubernetes管理认证', ARRAY['CKA','Kubernetes管理员认证','K8s管理员认证'], ARRAY['Certified Kubernetes Administrator']),
('personnel', '虚拟化与云计算', 'CKAD', 'CNCF', 'K8s开发', 'Kubernetes应用开发认证', ARRAY['CKAD','Kubernetes开发认证','K8s开发认证'], ARRAY['Certified Kubernetes Application Developer']),
('personnel', '虚拟化与云计算', 'CKS', 'CNCF', 'K8s安全', 'Kubernetes安全认证', ARRAY['CKS','Kubernetes安全认证','K8s安全认证'], ARRAY['Certified Kubernetes Security Specialist']),
('personnel', '虚拟化与云计算', 'DCA', 'Docker/Mirantis', '容器工程师', 'Docker认证', ARRAY['DCA','Docker认证','容器认证'], ARRAY['Docker Certified Associate']);

-- 1.9 备份与容灾认证
INSERT INTO qualification_reference (category, subcategory, qual_name, issuer, applicable_role, description, match_keywords, common_aliases) VALUES
('personnel', '备份与容灾', 'VMCE', 'Veeam', '备份工程师', 'Veeam认证工程师', ARRAY['VMCE','Veeam认证','Veeam工程师'], ARRAY['Veeam Certified Engineer']),
('personnel', '备份与容灾', 'VMCA', 'Veeam', '备份架构师', 'Veeam认证架构师', ARRAY['VMCA','Veeam架构师','Veeam高级认证'], ARRAY['Veeam Certified Architect']),
('personnel', '备份与容灾', 'Commvault Certified Professional', 'Commvault', '备份工程师', 'Commvault认证', ARRAY['Commvault认证','Commvault Professional'], ARRAY['Commvault Certified Professional']),
('personnel', '备份与容灾', 'NetBackup Certified Administrator', 'Veritas', '备份工程师', 'NetBackup管理认证', ARRAY['NetBackup认证','Veritas NetBackup','NetBackup管理员'], ARRAY['Veritas NetBackup Certified Administrator']),
('personnel', '备份与容灾', 'HCIA-Data Protection', '华为', '备份工程师', '华为数据保护认证', ARRAY['HCIA-Data Protection','华为数据保护','华为备份认证'], ARRAY['华为数据保护认证']),
('personnel', '备份与容灾', '鼎甲认证工程师', '鼎甲', '备份工程师', 'DBackup认证', ARRAY['鼎甲认证','DBackup认证','鼎甲备份'], ARRAY['鼎甲数据备份认证']),
('personnel', '备份与容灾', '爱数认证工程师', '爱数', '备份工程师', 'AnyBackup认证', ARRAY['爱数认证','AnyBackup认证','爱数备份'], ARRAY['爱数数据备份认证']);

-- 1.10 项目管理与IT治理
INSERT INTO qualification_reference (category, subcategory, qual_name, issuer, applicable_role, description, match_keywords, common_aliases) VALUES
('personnel', '项目管理与IT治理', 'COBIT 5 Foundation', 'ISACA', 'IT治理', 'IT治理框架', ARRAY['COBIT','COBIT 5','COBIT认证','IT治理'], ARRAY['COBIT 5 Foundation认证']),
('personnel', '项目管理与IT治理', 'ISO 20000 Lead Auditor', 'BSI/IRCA', '审计师', 'IT服务管理体系审计', ARRAY['ISO 20000主任审核员','ISO20000 LA','IT服务审核'], ARRAY['ISO 20000 Lead Auditor认证']),
('personnel', '项目管理与IT治理', 'ISO 27001 Lead Auditor', 'BSI/IRCA', '审计师', '信息安全管理体系审计', ARRAY['ISO 27001主任审核员','ISO27001 LA','信息安全审核'], ARRAY['ISO 27001 Lead Auditor认证']);

-- ============================================================
-- 企业资质
-- ============================================================

-- 2.1 IT服务类资质
INSERT INTO qualification_reference (category, subcategory, qual_name, issuer, level, description, match_keywords, common_aliases) VALUES
('company', 'IT服务类', 'ITSS运行维护服务能力', 'ITSS分会', '一级/二级/三级/四级', 'IT运维服务能力成熟度，招投标必备', ARRAY['ITSS','ITSS运维','运行维护服务能力','IT服务能力成熟度'], ARRAY['ITSS运行维护服务能力成熟度']),
('company', 'IT服务类', 'ITSS咨询设计能力', 'ITSS分会', '一级/二级/三级', 'IT咨询设计服务', ARRAY['ITSS咨询','ITSS设计','咨询设计能力'], ARRAY['ITSS咨询设计服务能力']),
('company', 'IT服务类', '信息系统集成及服务资质', '中国电子信息行业联合会', '一级/二级/三级/四级', '信息系统集成能力', ARRAY['信息系统集成','集成资质','系统集成资质'], ARRAY['信息系统集成及服务资质']),
('company', 'IT服务类', 'CS信息系统建设和服务能力评估', '中国电子信息行业联合会', 'CS1-CS5', '替代原集成资质', ARRAY['CS','CS资质','信息系统建设和服务能力','CS1','CS2','CS3','CS4','CS5'], ARRAY['CS信息系统建设和服务能力评估']),
('company', 'IT服务类', 'CCRC信息安全服务-安全集成', '中国网络安全审查技术与认证中心', '一级/二级/三级', '安全系统集成服务', ARRAY['CCRC安全集成','安全集成资质','信息安全服务-安全集成'], ARRAY['CCRC信息安全服务资质-安全集成']),
('company', 'IT服务类', 'CCRC信息安全服务-安全运维', '中国网络安全审查技术与认证中心', '一级/二级/三级', '安全运维服务', ARRAY['CCRC安全运维','安全运维资质','信息安全服务-安全运维'], ARRAY['CCRC信息安全服务资质-安全运维']),
('company', 'IT服务类', 'CCRC信息安全服务-灾难备份与恢复', '中国网络安全审查技术与认证中心', '一级/二级/三级', '灾备服务资质', ARRAY['CCRC灾备','灾备资质','灾难备份与恢复','信息安全服务-灾备'], ARRAY['CCRC信息安全服务资质-灾难备份与恢复']),
('company', 'IT服务类', 'CCRC信息安全服务-风险评估', '中国网络安全审查技术与认证中心', '一级/二级/三级', '风险评估服务', ARRAY['CCRC风险评估','风险评估资质','信息安全服务-风险评估'], ARRAY['CCRC信息安全服务资质-风险评估']),
('company', 'IT服务类', 'CCRC信息安全服务-应急响应', '中国网络安全审查技术与认证中心', '一级/二级/三级', '应急响应服务', ARRAY['CCRC应急响应','应急响应资质','信息安全服务-应急响应'], ARRAY['CCRC信息安全服务资质-应急响应']),
('company', 'IT服务类', 'CMMI', 'CMMI Institute', '3级/4级/5级', '软件研发能力成熟度', ARRAY['CMMI','CMMI认证','CMMI3','CMMI4','CMMI5','能力成熟度'], ARRAY['能力成熟度模型集成']);

-- 2.2 信息安全类资质
INSERT INTO qualification_reference (category, subcategory, qual_name, issuer, description, match_keywords, common_aliases) VALUES
('company', '信息安全类', '等保测评机构资质', '公安部', '等级保护测评服务资质', ARRAY['等保测评','等保测评机构','等级保护'], ARRAY['等级保护测评资质']),
('company', '信息安全类', '涉密信息系统集成资质', '国家保密局', '甲/乙级，涉密项目必备', ARRAY['涉密资质','涉密集成','涉密信息系统集成','涉密甲级','涉密乙级'], ARRAY['涉密信息系统集成资质']);

-- 2.3 云服务与数据中心资质
INSERT INTO qualification_reference (category, subcategory, qual_name, issuer, description, match_keywords, common_aliases) VALUES
('company', '云服务与数据中心', 'IDC许可证', '工信部', '数据中心经营许可', ARRAY['IDC','IDC许可证','数据中心许可'], ARRAY['互联网数据中心业务经营许可']),
('company', '云服务与数据中心', 'ISP许可证', '工信部', '互联网接入服务经营许可', ARRAY['ISP','ISP许可证','互联网接入许可'], ARRAY['互联网接入服务业务经营许可']),
('company', '云服务与数据中心', '云计算服务安全评估', '中央网信办/工信部', '政务云安全评估', ARRAY['云计算安全评估','政务云安全','云安全评估'], ARRAY['云计算服务安全评估']),
('company', '云服务与数据中心', 'Uptime Institute Tier认证', 'Uptime Institute', '数据中心等级认证 (Tier I-IV)', ARRAY['Uptime Tier','Tier认证','数据中心等级','Tier1','Tier2','Tier3','Tier4'], ARRAY['Uptime Institute Tier Certification']),
('company', '云服务与数据中心', 'GB50174数据中心资质', '住建部', '数据中心设计与运维', ARRAY['GB50174','数据中心设计标准','数据中心运维'], ARRAY['GB50174数据中心设计规范']);

-- 2.4 管理体系认证
INSERT INTO qualification_reference (category, subcategory, qual_name, issuer, description, match_keywords, common_aliases) VALUES
('company', '管理体系认证', 'ISO 9001', '国际标准化组织', '质量管理体系', ARRAY['ISO 9001','ISO9001','质量管理体系','质量认证'], ARRAY['ISO 9001质量管理体系认证']),
('company', '管理体系认证', 'ISO 20000', '国际标准化组织', 'IT服务管理体系', ARRAY['ISO 20000','ISO20000','IT服务管理体系','IT服务认证'], ARRAY['ISO 20000 IT服务管理体系认证']),
('company', '管理体系认证', 'ISO 27001', '国际标准化组织', '信息安全管理体系', ARRAY['ISO 27001','ISO27001','信息安全管理体系','信息安全管理认证'], ARRAY['ISO 27001信息安全管理体系认证']),
('company', '管理体系认证', 'ISO 22301', '国际标准化组织', '业务连续性管理体系', ARRAY['ISO 22301','ISO22301','业务连续性管理体系','业务连续性认证'], ARRAY['ISO 22301业务连续性管理体系认证']),
('company', '管理体系认证', 'ISO 14001', '国际标准化组织', '环境管理体系', ARRAY['ISO 14001','ISO14001','环境管理体系','环境认证'], ARRAY['ISO 14001环境管理体系认证']),
('company', '管理体系认证', 'ISO 45001', '国际标准化组织', '职业健康安全管理体系', ARRAY['ISO 45001','ISO45001','职业健康安全','安全管理体系'], ARRAY['ISO 45001职业健康安全管理体系认证']);

-- 2.5 品牌授权与服务资质
INSERT INTO qualification_reference (category, subcategory, qual_name, issuer, description, match_keywords, common_aliases) VALUES
('company', '品牌授权', '华为ASP授权服务合作伙伴', '华为', '华为产品服务授权', ARRAY['华为ASP','华为授权服务','华为合作伙伴'], ARRAY['华为授权服务合作伙伴']),
('company', '品牌授权', '华为钻石/金牌/银牌合作伙伴', '华为', '华为分级合作体系', ARRAY['华为钻石','华为金牌','华为银牌','华为合作伙伴'], ARRAY['华为分级合作伙伴']),
('company', '品牌授权', '新华三五星/四星/三星服务商', '新华三', 'H3C服务合作分级', ARRAY['H3C五星','H3C四星','H3C三星','H3C服务商','新华三服务商'], ARRAY['H3C分级服务商']),
('company', '品牌授权', 'Dell授权服务合作伙伴', 'Dell Technologies', 'Dell服务授权', ARRAY['Dell授权','Dell合作伙伴','戴尔授权'], ARRAY['Dell Technologies授权服务合作伙伴']),
('company', '品牌授权', 'VMware授权合作伙伴', 'VMware (Broadcom)', 'VMware授权', ARRAY['VMware授权','VMware合作伙伴'], ARRAY['VMware授权合作伙伴']),
('company', '品牌授权', 'Cisco Select/Premier/Gold合作伙伴', 'Cisco', 'Cisco合作分级', ARRAY['Cisco合作伙伴','思科合作伙伴','Cisco Select','Cisco Gold'], ARRAY['Cisco分级合作伙伴']),
('company', '品牌授权', 'Red Hat认证服务合作伙伴', 'Red Hat', 'Red Hat服务授权', ARRAY['Red Hat合作伙伴','红帽合作伙伴','红帽认证'], ARRAY['Red Hat认证服务合作伙伴']),
('company', '品牌授权', 'NetApp授权服务合作伙伴', 'NetApp', 'NetApp服务授权', ARRAY['NetApp授权','NetApp合作伙伴'], ARRAY['NetApp授权服务合作伙伴']),
('company', '品牌授权', '达梦授权服务商', '达梦', '达梦数据库服务授权', ARRAY['达梦授权','达梦服务商','达梦合作伙伴'], ARRAY['达梦数据库授权服务商']),
('company', '品牌授权', '人大金仓授权服务商', '人大金仓', '金仓数据库服务授权', ARRAY['金仓授权','人大金仓服务商','金仓合作伙伴'], ARRAY['人大金仓授权服务商']),
('company', '品牌授权', '东方通授权服务商', '东方通', '东方通中间件服务授权', ARRAY['东方通授权','东方通服务商','东方通合作伙伴'], ARRAY['东方通授权服务商']);

