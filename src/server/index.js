require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { startScheduler } = require('./services/scheduler');

// 路由
const noticesRouter = require('./routes/notices');
const qualificationsRouter = require('./routes/qualifications');
const contractsRouter = require('./routes/contracts');
const platformsRouter = require('./routes/platforms');
const matchRouter = require('./routes/match');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const configRouter = require('./routes/config');
const crawlRouter = require('./routes/crawl');

const app = express();
const PORT = process.env.PORT || 3200;

// ── 中间件 ──────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));

// 请求日志
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    if (req.path !== '/api/health') {
      console.log(`${req.method} ${req.path} ${res.statusCode} ${ms}ms`);
    }
  });
  next();
});

// ── 路由 ────────────────────────────────────────────────────

// 健康检查（含依赖检测）
app.get('/api/health', async (req, res) => {
  const checks = { server: 'ok' };
  try {
    const { supabaseAdmin } = require('./db');
    const { error } = await supabaseAdmin.from('bidding_notice').select('id', { head: true, count: 'exact' });
    checks.database = error ? `error: ${error.message}` : 'ok';
  } catch (err) {
    checks.database = `error: ${err.message}`;
  }
  const healthy = checks.database === 'ok';
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    checks,
    time: new Date().toISOString(),
  });
});

// 认证
app.use('/api/auth', authRouter);

// 业务 API
app.use('/api/notices', noticesRouter);
app.use('/api/qualifications', qualificationsRouter);
app.use('/api/contracts', contractsRouter);
app.use('/api/platforms', platformsRouter);
app.use('/api/match', matchRouter);
app.use('/api/config', configRouter);

// 管理员 API
app.use('/api/admin', adminRouter);
app.use('/api/crawl', crawlRouter);

// ── 全局错误处理 ────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(`[error] ${req.method} ${req.path}:`, err.message);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ── 启动 ────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`客户雷达后端已启动: http://localhost:${PORT}`);
});

// 定时任务
startScheduler();

// Graceful shutdown
function shutdown(signal) {
  console.log(`\n[shutdown] 收到 ${signal}，正在关闭...`);
  server.close(() => {
    console.log('[shutdown] HTTP 服务已关闭');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('[shutdown] 强制退出');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  console.error('[fatal] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[fatal] Unhandled rejection:', reason);
});
