require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const pino = require('pino');
const pinoHttp = require('pino-http');
const { startScheduler } = require('./services/scheduler');
const config = require('./config');

// 路由
const noticesRouter = require('./routes/notices');
const qualificationsRouter = require('./routes/qualifications');
const qualImagesRouter = require('./routes/qual-images');
const contractsRouter = require('./routes/contracts');
const platformsRouter = require('./routes/platforms');
const matchRouter = require('./routes/match');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const configRouter = require('./routes/config');
const crawlRouter = require('./routes/crawl');
const dashboardRouter = require('./routes/dashboard');
const notificationsRouter = require('./routes/notifications');
const dashboardTrendRouter = require('./routes/dashboard-trend');

// ── Logger ──────────────────────────────────────────────────
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino/file', options: { destination: 1 } }
    : undefined,
});

const app = express();
const PORT = process.env.PORT || 3200;

// ── 中间件 ──────────────────────────────────────────────────

// 请求 ID
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});

// 结构化日志
app.use(pinoHttp({
  logger,
  genReqId: (req) => req.id,
  autoLogging: {
    ignore: (req) => req.path === '/api/health',
  },
}));

// CORS（从配置读取白名单）
const corsOrigins = config.security.corsOrigins;
app.use(cors({
  origin: corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));

// 全局限流
const globalLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' },
});
app.use('/api/', globalLimiter);

// 认证接口严格限流
const authLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication attempts' },
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

// 认证（严格限流）
app.use('/api/auth', authLimiter, authRouter);

// 业务 API
app.use('/api/notices', noticesRouter);
app.use('/api/qualifications', qualificationsRouter);
app.use('/api/qual-images', qualImagesRouter);
app.use('/api/contracts', contractsRouter);
app.use('/api/platforms', platformsRouter);
app.use('/api/match', matchRouter);
app.use('/api/config', configRouter);

// 管理员 API
app.use('/api/admin', adminRouter);
app.use('/api/crawl', crawlRouter);

// 仪表盘 & 通知
app.use('/api/dashboard', dashboardRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/dashboard', dashboardTrendRouter);

// ── 全局错误处理 ────────────────────────────────────────────
app.use((err, req, res, _next) => {
  req.log.error({ err }, `${req.method} ${req.path}`);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ── 启动 ────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`客户雷达后端已启动: http://localhost:${PORT}`);
});

// 定时任务
startScheduler();

// Graceful shutdown
function shutdown(signal) {
  logger.info(`收到 ${signal}，正在关闭...`);
  server.close(() => {
    logger.info('HTTP 服务已关闭');
    process.exit(0);
  });
  setTimeout(() => {
    logger.fatal('强制退出');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
});
process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled rejection');
});
