import { useEffect, useState } from 'react';
import { radarApi } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

export default function Settings() {
  const { isAdmin } = useAuth();
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    radarApi.get('/config')
      .then(res => setConfig(res.data || {}))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (!isAdmin) {
    return <div className="text-center text-gray-500 py-8">需要管理员权限</div>;
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">系统设置</h2>

      {loading ? (
        <div className="text-center text-gray-500 py-8">加载中...</div>
      ) : (
        <div className="space-y-4">
          {/* 企微推送 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">企微推送</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">推送开关</span>
                <span className={config['push.enabled']?.value === true || config['push.enabled']?.value === 'true' ? 'text-green-600' : 'text-red-600'}>
                  {config['push.enabled']?.value === true || config['push.enabled']?.value === 'true' ? '已开启' : '已关闭'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">推送时间</span>
                <span className="font-mono">{config['push.schedule']?.value || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Webhook</span>
                <span className="text-xs truncate max-w-[300px]">{config['push.webhook_url']?.value || '未配置'}</span>
              </div>
            </div>
          </div>

          {/* 数据采集 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">数据采集</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">采集时间</span>
                <span className="font-mono">{config['fetch.schedule']?.value || '-'}</span>
              </div>
            </div>
          </div>

          {/* 系统信息 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">系统信息</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">版本</span>
                <span>1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">数据源</span>
                <span>知了标讯 API</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">AI 模型</span>
                <span>mimo-v2.5-pro</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
