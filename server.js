// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false
}));

app.use(compression());
// server.js - Update the CORS section
app.use(cors({
    origin: ['https://pay-to-earn.vercel.app', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const publicPath = path.join(__dirname, 'public');
if (!fs.existsSync(publicPath)) {
    console.error('✗ public/ directory not found!');
}

app.use(express.static(publicPath, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
        if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
    }
}));

// ============ API ROUTES ============
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
    // FUTURE: Add more API routes here
    // '/api/announcements': './modules/announcements/announcements.routes',
    // '/api/reports': './modules/reports/reports.routes',
    // '/api/support': './modules/support/support.routes',
    // '/api/kyc': './modules/kyc/kyc.routes',
};

for (const [routePath, routeFile] of Object.entries(routes)) {
    try {
        const routeModule = require(routeFile);
        if (typeof routeModule === 'function' || (routeModule && routeModule.stack)) {
            app.use(routePath, routeModule);
            console.log(`✓ Route loaded: ${routePath}`);
        } else {
            console.error(`✗ Invalid route: ${routePath}`);
        }
    } catch (error) {
        console.error(`✗ Failed to load ${routePath}:`, error.message);
    }
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, message: 'API endpoint not found' });
    }
    const ext = path.extname(req.path);
    if (ext) {
        const filePath = path.join(publicPath, req.path);
        if (!fs.existsSync(filePath)) return res.status(404).send('Not found');
    }
    res.sendFile(path.join(publicPath, 'index.html'));
});

// Start scheduler for automated tasks
const Scheduler = require('./jobs/scheduler');
Scheduler.start();

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`\n✓ Server running on http://localhost:${PORT}`);
});