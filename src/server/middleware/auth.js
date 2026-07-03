/**
 * 认证中间件
 * 基于 Supabase Auth 的 JWT 验证 + 角色控制
 */
const { supabaseAdmin } = require('../db');

/**
 * 必须登录 — 验证 JWT 并注入 req.user
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    // 获取角色：优先从 user_metadata，其次 app_metadata，默认 viewer
    const role = user.user_metadata?.role 
      || user.app_metadata?.role 
      || 'viewer';

    req.user = {
      id: user.id,
      email: user.email,
      role: role,
    };

    next();
  } catch (err) {
    console.error('[auth] Token verification failed:', err.message);
    return res.status(401).json({ success: false, error: 'Authentication failed' });
  }
}

/**
 * 必须 admin 角色
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
}

/**
 * 可选登录 — 未登录时 req.user = null
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      req.user = null;
      return next();
    }

    const role = user.user_metadata?.role 
      || user.app_metadata?.role 
      || 'viewer';

    req.user = {
      id: user.id,
      email: user.email,
      role: role,
    };
  } catch (err) {
    req.user = null;
  }

  next();
}

module.exports = { requireAuth, requireAdmin, optionalAuth };
