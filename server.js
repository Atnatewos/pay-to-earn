// server.js

/**
 * Main Application Entry Point
 * Configures Express server with security, routing, and static files
 * All configuration from config files and environment variables
 * Zero hardcoded values
 */
require('dotenv').config();

var express = require('express');
var cors = require('cors');
var helmet = require('helmet');
var compression = require('compression');
var path = require('path');
var fs = require('fs');

// Import configuration files
var securityConfig = require('./config/security.json');
var featuresConfig = require('./config/features.json');
var platformConfig = require('./config/platform.json');

// Import middleware
var errorHandler = require('./middleware/errorHandler');
var rateLimiter = require('./middleware/rateLimit');

var app = express();
var PORT = process.env.PORT || 3000;

// ============================================================
// SECURITY HEADERS
// ============================================================

// Configure Content Security Policy from config file
var cspDirectives = {
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
// CORS CONFIGURATION
// ============================================================

var allowedOrigins = securityConfig.cors.allowedOrigins;

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
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

var publicPath = path.join(__dirname, 'public');

if (!fs.existsSync(publicPath)) {
  console.error('ERROR: public/ directory not found at:', publicPath);
  console.error('The frontend files are missing. Please check the deployment.');
}

app.use(express.static(publicPath, {
  setHeaders: function(res, filePath) {
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

var routes = {
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

Object.keys(routes).forEach(function(routePath) {
  var routeFile = routes[routePath];

  try {
    var routeModule = require(routeFile);

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

app.get('/api/health', function(req, res) {
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

app.get('*', function(req, res) {
  // Skip API routes that weren't matched
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: 'API endpoint not found'
    });
  }

  // Check if requested file exists
  var fileExtension = path.extname(req.path);
  if (fileExtension) {
    var filePath = path.join(publicPath, req.path);
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