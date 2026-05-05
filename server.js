// server.js
require('dotenv').config();
const express = require('express');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// MANUAL CORS - NO PACKAGE - CANNOT FAIL
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

app.use(compression());
app.use(express.json({ limit: '10mb' }));
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
            console.log('✓ ' + routePath);
        } else {
            console.error('✗ Invalid route: ' + routePath);
        }
    } catch (error) {
        console.error('✗ Failed: ' + routePath + ' - ' + error.message);
    }
}

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.get('*', (req, res) => res.sendFile(path.join(publicPath, 'index.html')));
app.use(errorHandler);

app.listen(PORT, () => console.log('Server running on port ' + PORT));