require('dotenv').config();
const express = require('express');
const { startScheduler } = require('./services/scheduler');

// 路由
const noticesRouter = require('./routes/notices');
const qualificationsRouter = require('./routes/qualifications');
const contractsRouter = require('./routes/contracts');
const platformsRouter = require('./routes/platforms');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3200;

app.use(express.json());

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 认证 API
app.use('/api/auth', authRouter);

// 业务 API
app.use('/api/notices', noticesRouter);
app.use('/api/qualifications', qualificationsRouter);
app.use('/api/contracts', contractsRouter);
app.use('/api/platforms', platformsRouter);

// 管理员 API
app.use('/api/admin', adminRouter);

// 启动定时任务
startScheduler();

app.listen(PORT, () => {
  console.log(`客户雷达后端已启动: http://localhost:${PORT}`);
});
const configRouter = require('./routes/config');
app.use('/api/admin', adminRouter);
app.use('/api/config', configRouter);
