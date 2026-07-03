/**
 * 认证 API
 * 登录、登出、获取当前用户信息
 */
const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db');
const { requireAuth } = require('../middleware/auth');

// POST /api/auth/login - 登录
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ success: false, error: error.message });
    }

    const role = data.user.user_metadata?.role 
      || data.user.app_metadata?.role 
      || 'viewer';

    res.json({
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          role: role,
        },
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/logout - 登出
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader.replace('Bearer ', '');

    const { error } = await supabaseAdmin.auth.admin.signOut(token);

    if (error) {
      // 即使登出失败也返回成功（token 可能已过期）
      console.warn('[auth] Logout warning:', error.message);
    }

    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    res.json({ success: true, message: 'Logged out' });
  }
});

// GET /api/auth/me - 获取当前用户信息
router.get('/me', requireAuth, async (req, res) => {
  res.json({
    success: true,
    data: req.user,
  });
});

// POST /api/auth/reset-password - 发送重置密码邮件
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.APP_URL || 'http://localhost:5173'}/reset-password`,
    });

    if (error) {
      // 不暴露用户是否存在
      console.warn('[auth] Reset password warning:', error.message);
    }

    res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
  } catch (err) {
    res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
  }
});

// POST /api/auth/update-password - 更新密码（重置后）
router.post('/update-password', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader.replace('Bearer ', '');

    // 使用用户的 token 来更新密码
    const { error } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, {
      password: password,
    });

    if (error) throw error;

    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
