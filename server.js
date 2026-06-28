// server.js

/**
 * Main Application Entry Point
 * Configures Express server with security, routing, and static files
 * All configuration from config files and environment variables
 * Zero hardcoded values
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

// Import configuration files
const securityConfig = require('./config/security.json');
const featuresConfig = require('./config/features.json');
const platformConfig = require('./config/platform.json');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimit');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// SECURITY HEADERS
// ============================================================

// Configure Content Security Policy from config file
const cspDirectives = {
    defaultSrc: ["'self'"],
    scriptSrc: securityConfig.csp.allowedScripts,
    styleSrc: securityConfig.csp.allowedStyles,
    fontSrc: securityConfig.csp.allowedFonts,
    imgSrc: securityConfig.csp.allowedImages,
    connectSrc: securityConfig.csp.allowedConnections
};

app.use(helmet({
    contentSecurityPolicy: securityConfig.csp.enabled ? { directives: cspDirectives } : false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: securityConfig.headers.hsts.enabled ? {
        maxAge: securityConfig.headers.hsts.maxAge,
        includeSubDomains: securityConfig.headers.hsts.includeSubDomains
    } : false,
    frameguard: { action: securityConfig.headers.xFrameOptions.toLowerCase() },
    referrerPolicy: { policy: securityConfig.headers.referrerPolicy }
}));

// ============================================================
// CORS CONFIGURATION (Dynamic via Environment Variables)
// ============================================================

// Build allowed origins dynamically from environment variables
// This ensures zero hardcoded domains in the codebase
const allowedOrigins = [
    process.env.FRONTEND_URL, 
    'http://localhost:3000'
].filter(Boolean); // Removes undefined/null values

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, curl, same-origin)
        if (!origin) return callback(null, true);
        
        // If the request's origin is in our allowed list, accept it
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        } 
        
        // Otherwise, block it
        console.warn(`CORS blocked origin: ${origin}`);
        return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ============================================================
// PERFORMANCE & PARSING
// ============================================================

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// RATE LIMITING
// ============================================================

app.use(rateLimiter.generalLimiter);

// ============================================================
// STATIC FILES
// ============================================================

const publicPath = path.join(__dirname, 'public');

if (!fs.existsSync(publicPath)) {
    console.error('ERROR: public/ directory not found at:', publicPath);
    console.error('The frontend files are missing. Please check the deployment.');
}

app.use(express.static(publicPath, {
    setHeaders: function (res, filePath) {
        if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (filePath.endsWith('.json')) {
            res.setHeader('Content-Type', 'application/json');
        }

        // Set caching headers for static assets
        if (filePath.match(/\.(css|js|png|jpg|svg|ico|woff2)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=86400');
        }
    }
}));

// ============================================================
// API ROUTES
// ============================================================

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
    '/api/alerts': './modules/alerts/alerts.routes',
    '/api/config': './modules/config/config.routes'
};

Object.keys(routes).forEach(function (routePath) {
    const routeFile = routes[routePath];

    try {
        const routeModule = require(routeFile);

        if (typeof routeModule === 'function' || (routeModule && routeModule.stack)) {
            app.use(routePath, routeModule);
            console.log('Route loaded: ' + routePath);
        } else {
            console.error('Invalid route module: ' + routePath + ' (type: ' + typeof routeModule + ')');
        }
    } catch (error) {
        console.error('Failed to load route ' + routePath + ':', error.message);
    }
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/api/health', function (req, res) {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        platform: platformConfig.name,
        version: '1.0.0'
    });
});

// ============================================================
// SPA FALLBACK
// ============================================================

app.get('*', function (req, res) {
    // Skip API routes that weren't matched
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            message: 'API endpoint not found'
        });
    }

    // Check if requested file exists
    const fileExtension = path.extname(req.path);
    if (fileExtension) {
        const filePath = path.join(publicPath, req.path);
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('File not found');
        }
    }

    // Serve index.html for all other routes (SPA routing)
    res.sendFile(path.join(publicPath, 'index.html'));
});

// ============================================================
// ERROR HANDLER
// ============================================================

app.use(errorHandler);

// ==========================================
// SERVER STARTUP (Adapted for Vercel & Local)
// ==========================================

// If running on Vercel, export the app as a serverless function
if (process.env.VERCEL) {
    module.exports = app;
} else {
    // If running locally or on Render, start the server normally
    app.listen(PORT, () => {
        console.log(`========================================`);
        console.log(`  ${platformConfig.name} Server`);
        console.log(`  Port: ${PORT}`);
        console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`  CSP Enabled: ${securityConfig.csp ? securityConfig.csp.enabled : 'No'}`);
        console.log(`========================================`);
    });
}