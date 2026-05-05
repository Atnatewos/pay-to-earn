// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const errorHandler = require('./middleware/errorHandler');
const Scheduler = require('./jobs/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS headers
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    next();
});

app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

const routes = {
    '/api/auth': './modules/auth/auth.routes',
    '/api/packages': './modules/packages/packages.routes',
    '/api/deposits': './modules/deposits/deposits.routes',
    '/api/tasks': './modules/tasks/tasks.routes',
    '/api/team': './modules/team/team.routes',
    '/api/withdrawals': './modules/withdrawals/withdrawals.routes',
    '/api/bank': './modules/bank/bank.routes',
    '/api/admin': './modules/admin/admin.routes',
    '/api/transactions': './modules/transactions/transactions.routes',
    '/api/notifications': './modules/notifications/notifications.routes',
    '/api/commissions': './modules/commissions/commissions.routes',
    '/api/captcha': './modules/captcha/captcha.routes',
    '/api/giftcodes': './modules/giftcodes/giftcodes.routes',
    '/api/salary': './modules/salary/salary.routes',
    '/api/leaderboard': './modules/leaderboard/leaderboard.routes',
};

for (const [routePath, routeFile] of Object.entries(routes)) {
    try {
        const routeModule = require(routeFile);
        if (typeof routeModule === 'function' || (routeModule && routeModule.stack)) {
            app.use(routePath, routeModule);
            console.log(`✓ ${routePath}`);
        }
    } catch (error) { console.error(`✗ ${routePath}:`, error.message); }
}

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.get('*', (req, res) => res.sendFile(path.join(publicPath, 'index.html')));
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`✓ Server on port ${PORT}`);
    try { Scheduler.start(); } catch (e) { console.log('Scheduler not started (cron may not be installed)'); }
});