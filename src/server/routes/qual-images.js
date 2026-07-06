/**
 * 资质图片管理 API
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { supabaseAdmin } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// 配置 multer（内存存储）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 PNG、JPEG、PDF 格式'), false);
    }
  },
});

// GET /api/qual-images/:qualType/:qualId - 获取资质图片列表
router.get('/:qualType/:qualId', requireAuth, async (req, res) => {
  try {
    const { qualType, qualId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('qualification_images')
      .select('*')
      .eq('qual_type', qualType)
      .eq('qual_id', qualId)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/qual-images/:qualType/:qualId - 上传图片
router.post('/:qualType/:qualId', requireAuth, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { qualType, qualId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: '请选择图片文件' });
    }

    // 生成存储路径
    const ext = file.originalname.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const storagePath = `${qualType}/${qualId}/${fileName}`;

    // 上传到 Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('qualifications')
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // 获取公开 URL
    const { data: urlData } = supabaseAdmin.storage
      .from('qualifications')
      .getPublicUrl(storagePath);

    // 保存到数据库
    const { data: imageData, error: dbError } = await supabaseAdmin
      .from('qualification_images')
      .insert({
        qual_type: qualType,
        qual_id: Number(qualId),
        image_name: file.originalname,
        image_url: urlData.publicUrl,
        storage_path: storagePath,
        file_size: file.size,
        mime_type: file.mimetype,
        is_primary: req.body.is_primary === 'true',
        sort_order: req.body.sort_order ? Number(req.body.sort_order) : 0,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    res.status(201).json({ success: true, data: imageData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/qual-images/:id - 更新图片信息（设为主图、排序等）
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_primary, sort_order } = req.body;

    const updates = {};
    if (is_primary !== undefined) updates.is_primary = is_primary;
    if (sort_order !== undefined) updates.sort_order = sort_order;

    // 如果设为主图，先取消其他主图
    if (is_primary) {
      const { data: current } = await supabaseAdmin
        .from('qualification_images')
        .select('qual_type, qual_id')
        .eq('id', id)
        .single();

      if (current) {
        await supabaseAdmin
          .from('qualification_images')
          .update({ is_primary: false })
          .eq('qual_type', current.qual_type)
          .eq('qual_id', current.qual_id)
          .eq('is_primary', true);
      }
    }

    const { data, error } = await supabaseAdmin
      .from('qualification_images')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/qual-images/:id - 删除图片
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 获取图片信息
    const { data: image, error: fetchError } = await supabaseAdmin
      .from('qualification_images')
      .select('storage_path')
      .eq('id', id)
      .single();

    if (fetchError || !image) {
      return res.status(404).json({ success: false, error: '图片不存在' });
    }

    // 从 Storage 删除
    const { error: storageError } = await supabaseAdmin.storage
      .from('qualifications')
      .remove([image.storage_path]);

    if (storageError) console.error('[qual-images] Storage delete error:', storageError.message);

    // 从数据库删除
    const { error: dbError } = await supabaseAdmin
      .from('qualification_images')
      .delete()
      .eq('id', id);

    if (dbError) throw dbError;

    res.json({ success: true, message: '图片已删除' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/qual-images/download/:qualType/:qualId - 打包下载所有图片
router.get('/download/:qualType/:qualId', requireAuth, async (req, res) => {
  try {
    const { qualType, qualId } = req.params;

    // 获取所有图片
    const { data: images, error } = await supabaseAdmin
      .from('qualification_images')
      .select('image_name, storage_path')
      .eq('qual_type', qualType)
      .eq('qual_id', qualId)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    if (!images || images.length === 0) {
      return res.status(404).json({ success: false, error: '没有可下载的图片' });
    }

    // TODO: 使用 archiver 打包 ZIP 下载
    // 暂时返回图片列表
    res.json({
      success: true,
      data: images.map(img => ({
        name: img.image_name,
        url: supabaseAdmin.storage.from('qualifications').getPublicUrl(img.storage_path).data.publicUrl,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

// POST /api/qual-images/ocr - OCR 识别证书图片
router.post('/ocr', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { image_url, qual_type = 'company' } = req.body;

    if (!image_url) {
      return res.status(400).json({ success: false, error: '请提供图片 URL' });
    }

    const { extractQualFields } = require('../services/qual-ocr');
    const result = await extractQualFields(image_url, qual_type);

    if (result.success) {
      res.json({ success: true, data: result.fields });
    } else {
      res.json({ success: false, error: result.error, raw: result.raw });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
