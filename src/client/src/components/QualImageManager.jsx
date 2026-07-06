/**
 * 资质图片管理组件
 */
import { useState, useEffect, useRef } from 'react';
import { radarApi } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { Upload, Image as ImageIcon, Star, Trash2, Download, X, ZoomIn } from 'lucide-react';
import { cn } from '../lib/utils';

const FORMAT_GUIDE = `
**图片格式要求：**

• **推荐格式：** PNG（扫描件）、JPEG（照片，质量≥90%）、PDF（多页文件）
• **最大文件：** 20MB/张
• **推荐分辨率：** 300 DPI（打印质量）
• **色彩模式：** RGB（屏幕显示）

**上传建议：**
• 扫描件请选择 PNG 格式，保证文字清晰
• 手机拍摄请确保光线充足、文字可读
• 多页证书可上传 PDF 或分多张图片
• 设为主图的图片将作为标书默认使用
`;

function getFieldLabel(key) {
  const labels = {
    qual_type: '类型',
    qual_name: '名称',
    qual_level: '等级',
    cert_number: '编号',
    issue_date: '发证日期',
    expiry_date: '有效期',
    issuing_body: '发证机关',
    scope: '范围',
    person_name: '姓名',
  };
  return labels[key] || key;
}

export default function QualImageManager({ qualType, qualId, qualName, onOcrResult }) {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);

  const handleOcr = async (imageUrl) => {
    setOcrLoading(true);
    setOcrResult(null);
    try {
      const res = await radarApi.post('/qual-images/ocr', {
        body: { image_url: imageUrl, qual_type: qualType }
      });
      if (res.success) {
        setOcrResult(res.data);
        toast.success('识别完成，请确认信息');
        // 回调通知父组件
        if (onOcrResult) onOcrResult(res.data);
      } else {
        toast.error('识别失败: ' + res.error);
      }
    } catch (err) {
      toast.error('OCR 识别失败: ' + err.message);
    } finally {
      setOcrLoading(false);
    }
  };

  const fetchImages = async () => {
    setLoading(true);
    try {
      const res = await radarApi.get(`/qual-images/${qualType}/${qualId}`);
      setImages(res.data || []);
    } catch (err) {
      toast.error('加载图片失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (qualId) fetchImages();
  }, [qualId]);

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    let success = 0;
    let fail = 0;

    for (const file of files) {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('is_primary', images.length === 0 ? 'true' : 'false');

      try {
        await radarApi.post(`/qual-images/${qualType}/${qualId}`, {
          body: formData,
          headers: { 'Content-Type': undefined }, // 让浏览器自动设置
        });
        success++;
      } catch (err) {
        fail++;
        toast.error(`上传失败 (${file.name}): ${err.message}`);
      }
    }

    if (success > 0) {
      toast.success(`成功上传 ${success} 张图片`);
      fetchImages();
    }
    if (fail > 0) {
      toast.error(`${fail} 张图片上传失败`);
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSetPrimary = async (imageId) => {
    try {
      await radarApi.put(`/qual-images/${imageId}`, { body: { is_primary: true } });
      toast.success('已设为主图');
      fetchImages();
    } catch (err) {
      toast.error('设置失败: ' + err.message);
    }
  };

  const handleDelete = async (imageId) => {
    if (!confirm('确定要删除这张图片吗？')) return;

    try {
      await radarApi.delete(`/qual-images/${imageId}`);
      toast.success('图片已删除');
      fetchImages();
    } catch (err) {
      toast.error('删除失败: ' + err.message);
    }
  };

  const handleDownloadAll = async () => {
    try {
      const res = await radarApi.get(`/qual-images/download/${qualType}/${qualId}`);
      if (res.data && res.data.length > 0) {
        // 逐个下载
        res.data.forEach(img => {
          const link = document.createElement('a');
          link.href = img.url;
          link.download = img.name;
          link.click();
        });
        toast.success(`开始下载 ${res.data.length} 张图片`);
      } else {
        toast.info('没有可下载的图片');
      }
    } catch (err) {
      toast.error('下载失败: ' + err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* 标题和操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon size={18} className="text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-800">
            证书图片 {images.length > 0 && `(${images.length})`}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="text-xs text-slate-500 hover:text-indigo-600 px-2 py-1 rounded hover:bg-indigo-50"
          >
            {showGuide ? '隐藏说明' : '格式说明'}
          </button>
          {images.length > 0 && (
            <button
              onClick={handleDownloadAll}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 px-2 py-1 rounded hover:bg-indigo-50"
            >
              <Download size={12} /> 批量下载
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <Upload size={12} /> {uploading ? '上传中...' : '上传图片'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,application/pdf"
            onChange={handleUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* 格式说明 */}
      {showGuide && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 whitespace-pre-line">
          {FORMAT_GUIDE}
        </div>
      )}

      {/* 图片列表 */}
      {loading ? (
        <div className="text-center py-8 text-slate-400">加载中...</div>
      ) : images.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-300">
          <ImageIcon size={32} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">暂无证书图片</p>
          <p className="text-xs text-slate-400 mt-1">支持 PNG、JPEG、PDF 格式，最大 20MB</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            点击上传第一张图片
          </button>
          <div className="mt-4 text-xs text-slate-500 space-y-1">
            <p>📌 <strong>推荐格式：</strong>PNG（扫描件）、JPEG（照片）</p>
            <p>📌 <strong>分辨率：</strong>300 DPI（打印质量）</p>
            <p>📌 <strong>操作步骤：</strong>上传 → 点击 🔍 识别 → 确认信息 → 保存</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((img) => (
            <div key={img.id} className="group relative bg-white border border-slate-200 rounded-lg overflow-hidden">
              {/* 图片预览 */}
              <div
                className="aspect-[4/3] bg-slate-100 cursor-pointer"
                onClick={() => setPreviewImage(img)}
              >
                {img.mime_type === 'application/pdf' ? (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-4xl">📄</span>
                  </div>
                ) : (
                  <img
                    src={img.image_url}
                    alt={img.image_name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
              </div>

              {/* 主图标记 */}
              {img.is_primary && (
                <div className="absolute top-2 left-2 bg-yellow-500 text-white p-1 rounded">
                  <Star size={12} fill="currentColor" />
                </div>
              )}

              {/* 操作按钮 */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => setPreviewImage(img)}
                  className="p-2 bg-white rounded-full hover:bg-slate-100"
                  title="预览"
                >
                  <ZoomIn size={16} className="text-slate-700" />
                </button>
                {!img.is_primary && (
                  <button
                    onClick={() => handleSetPrimary(img.id)}
                    className="p-2 bg-white rounded-full hover:bg-slate-100"
                    title="设为主图"
                  >
                    <Star size={16} className="text-slate-700" />
                  </button>
                )}
                <button
                  onClick={() => handleOcr(img.image_url)}
                  disabled={ocrLoading}
                  className="p-2 bg-white rounded-full hover:bg-slate-100 disabled:opacity-50"
                  title="AI 识别"
                >
                  <span className="text-xs">🔍</span>
                </button>
                <button
                  onClick={() => handleDelete(img.id)}
                  className="p-2 bg-white rounded-full hover:bg-slate-100"
                  title="删除"
                >
                  <Trash2 size={16} className="text-red-600" />
                </button>
              </div>

              {/* 文件名 */}
              <div className="p-2">
                <p className="text-xs text-slate-600 truncate" title={img.image_name}>
                  {img.image_name}
                </p>
                <p className="text-xs text-slate-400">
                  {img.file_size ? (img.file_size / 1024 / 1024).toFixed(1) + ' MB' : '-'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* OCR 识别结果 */}
      {ocrLoading && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-indigo-700">AI 正在识别证书内容...</span>
          </div>
        </div>
      )}

      {ocrResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-green-800">识别结果</h4>
            <button onClick={() => setOcrResult(null)} className="text-green-600 hover:text-green-700">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(ocrResult).map(([key, value]) => (
              value && (
                <div key={key} className="flex gap-2">
                  <span className="text-green-600 font-medium min-w-[80px]">{getFieldLabel(key)}:</span>
                  <span className="text-green-800">{value}</span>
                </div>
              )
            ))}
          </div>
          <p className="text-xs text-green-600 mt-3">
            识别结果已自动填入表单，请确认或修改后保存。
          </p>
        </div>
      )}

      {/* 图片预览模态框 */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300"
            >
              <X size={24} />
            </button>
            {previewImage.mime_type === 'application/pdf' ? (
              <iframe
                src={previewImage.image_url}
                className="w-full h-[80vh] bg-white rounded-lg"
                title={previewImage.image_name}
              />
            ) : (
              <img
                src={previewImage.image_url}
                alt={previewImage.image_name}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            )}
            <div className="mt-2 text-center text-white text-sm">
              {previewImage.image_name}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
