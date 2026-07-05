/**
 * API 客户端 — 封装所有后端 API 调用
 */
const http = require('http');
const https = require('https');
const { URL } = require('url');

class CrAPI {
  constructor(server, token) {
    this.server = server || process.env.CR_SERVER || 'http://localhost:3000';
    this.token = token || process.env.CR_TOKEN || '';
  }

  async request(method, path, body = null) {
    const url = new URL(path, this.server);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const bodyStr = body ? JSON.stringify(body) : null;
    if (bodyStr) {
      headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    return new Promise((resolve, reject) => {
      const req = lib.request(url, { method, headers }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (res.statusCode >= 400) {
              reject(new Error(json.error || json.message || `HTTP ${res.statusCode}`));
            } else {
              resolve(json);
            }
          } catch (e) {
            if (res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
            } else {
              resolve({ raw: data });
            }
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(60000, () => {
        req.destroy();
        reject(new Error('Request timeout (60s)'));
      });

      if (bodyStr) req.write(bodyStr);
      req.end();
    });
  }

  get(path) { return this.request('GET', path); }
  post(path, body) { return this.request('POST', path, body); }
  put(path, body) { return this.request('PUT', path, body); }
  del(path) { return this.request('DELETE', path); }
}

module.exports = CrAPI;
