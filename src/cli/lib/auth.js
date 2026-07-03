/**
 * 认证工具
 * 管理 JWT token 存储和刷新
 */
const Conf = require('conf');
const fetch = require('node-fetch');

const config = new Conf({ projectName: 'customer-radar' });

const API_BASE = process.env.CR_API_URL || 'http://localhost:3200';

/**
 * 获取存储的 token
 */
function getToken() {
  return config.get('access_token');
}

/**
 * 获取用户信息
 */
function getUser() {
  return config.get('user');
}

/**
 * 保存认证信息
 */
function saveAuth(data) {
  config.set('access_token', data.access_token);
  config.set('refresh_token', data.refresh_token);
  config.set('user', data.user);
  config.set('expires_at', data.expires_at);
}

/**
 * 清除认证信息
 */
function clearAuth() {
  config.delete('access_token');
  config.delete('refresh_token');
  config.delete('user');
  config.delete('expires_at');
}

/**
 * 检查是否已登录
 */
function isLoggedIn() {
  const token = getToken();
  const expiresAt = config.get('expires_at');
  
  if (!token) return false;
  
  // 检查是否过期
  if (expiresAt && Date.now() / 1000 > expiresAt) {
    clearAuth();
    return false;
  }
  
  return true;
}

/**
 * 登录
 */
async function login(email, password) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Login failed');
  }

  saveAuth(result.data);
  return result.data.user;
}

/**
 * 登出
 */
async function logout() {
  const token = getToken();
  
  if (token) {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (err) {
      // 忽略登出错误
    }
  }
  
  clearAuth();
}

/**
 * 发送 API 请求
 */
async function apiRequest(path, options = {}) {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const result = await response.json();
  return result;
}

/**
 * 检查是否是 admin
 */
function isAdmin() {
  const user = getUser();
  return user && user.role === 'admin';
}

module.exports = {
  getToken,
  getUser,
  saveAuth,
  clearAuth,
  isLoggedIn,
  login,
  logout,
  apiRequest,
  isAdmin,
  API_BASE,
};
