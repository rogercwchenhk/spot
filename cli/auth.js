/**
 * Token 管理 — 存储在 ~/.cr/token
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const TOKEN_DIR = path.join(os.homedir(), '.cr');
const TOKEN_FILE = path.join(TOKEN_DIR, 'token');

function getToken() {
  // 优先级: --token > CR_TOKEN > ~/.cr/token
  if (process.env.CR_TOKEN) return process.env.CR_TOKEN;
  try {
    return fs.readFileSync(TOKEN_FILE, 'utf-8').trim();
  } catch {
    return '';
  }
}

function saveToken(token) {
  if (!fs.existsSync(TOKEN_DIR)) {
    fs.mkdirSync(TOKEN_DIR, { recursive: true });
  }
  fs.writeFileSync(TOKEN_FILE, token, 'utf-8');
}

function removeToken() {
  try {
    fs.unlinkSync(TOKEN_FILE);
  } catch {}
}

function isLoggedIn() {
  return !!getToken();
}

module.exports = { getToken, saveToken, removeToken, isLoggedIn, TOKEN_FILE };
