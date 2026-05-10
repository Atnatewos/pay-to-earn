// public/js/config.js

/**
 * APP_CONFIG - Global configuration object
 * 
 * On first load, values come from this file as defaults.
 * Then fetchPlatformConfig() updates them from the server config.
 * This means the server config (config/platform.json) is the SINGLE source of truth.
 * 
 * To change ANY platform setting, just edit config/platform.json
 * No need to touch this file or any frontend code.
 */

// Auto-detect environment
const IS_PRODUCTION = window.location.hostname !== 'localhost';

// Default values (overwritten by server config on load)
const APP_CONFIG = {
    // API & URLs
    apiUrl: IS_PRODUCTION 
        ? 'https://pay-to-earn-api.onrender.com/api' 
        : '/api',
    frontendUrl: IS_PRODUCTION 
        ? 'https://pay-to-earn.vercel.app' 
        : 'http://localhost:3000',

    // Platform identity (overwritten by server config)
    name: 'Pay to Earn',
    fullName: 'Pay to Earn Platform',
    tagline: 'Share & Earn',
    adminName: 'Pay to Earn Admin',
    currency: 'ETB',
    currencySymbol: 'ETB',

    // Logo configuration (overwritten by server config)
    logo: {
        imageUrl: '',
        emoji: '💰',
        showImage: false,
        showEmoji: true
    },

    // Support links (overwritten by server config)
    support: {
        telegram: '',
        telegramChannel: '',
        telegramGroup: '',
        email: '',
        showInNavbar: true
    },

    // Deposit bank details (overwritten by server config)
    bankName: 'CBE',
    bankAccount: '1000428407567',
    bankHolder: 'ATNATEWOS',
};

/**
 * Fetch platform config from server and merge into APP_CONFIG
 * Called once on app startup
 */
async function fetchPlatformConfig() {
    try {
        const apiUrl = IS_PRODUCTION 
            ? 'https://pay-to-earn-api.onrender.com/api' 
            : '/api';
        
        const response = await fetch(`${apiUrl}/config/platform`);
        const result = await response.json();
        
        if (result.success && result.data) {
            const serverConfig = result.data;
            
            // Merge all server config values into APP_CONFIG
            if (serverConfig.name) APP_CONFIG.name = serverConfig.name;
            if (serverConfig.fullName) APP_CONFIG.fullName = serverConfig.fullName;
            if (serverConfig.tagline) APP_CONFIG.tagline = serverConfig.tagline;
            if (serverConfig.adminName) APP_CONFIG.adminName = serverConfig.adminName;
            if (serverConfig.currency) APP_CONFIG.currency = serverConfig.currency;
            if (serverConfig.currencySymbol) APP_CONFIG.currencySymbol = serverConfig.currencySymbol;
            if (serverConfig.logo) APP_CONFIG.logo = serverConfig.logo;
            if (serverConfig.support) APP_CONFIG.support = serverConfig.support;
            
            // Update page title
            document.title = serverConfig.fullName || 'Pay to Earn Platform';
            
            console.log('✓ Platform config loaded from server');
        }
    } catch (error) {
        // Silently fail - use default values from this file
        console.log('⚠ Using default config (server unreachable)');
    }
}

// Fetch config immediately
fetchPlatformConfig();// public/js/config.js

/**
 * APP_CONFIG - Global configuration object
 * 
 * On first load, values come from this file as defaults.
 * Then fetchPlatformConfig() updates them from the server config.
 * This means the server config (config/platform.json) is the SINGLE source of truth.
 * 
 * To change ANY platform setting, just edit config/platform.json
 * No need to touch this file or any frontend code.
 */

// Auto-detect environment
const IS_PRODUCTION = window.location.hostname !== 'localhost';

// Default values (overwritten by server config on load)
const APP_CONFIG = {
    // API & URLs
    apiUrl: IS_PRODUCTION 
        ? 'https://pay-to-earn-api.onrender.com/api' 
        : '/api',
    frontendUrl: IS_PRODUCTION 
        ? 'https://pay-to-earn.vercel.app' 
        : 'http://localhost:3000',

    // Platform identity (overwritten by server config)
    name: 'Pay to Earn',
    fullName: 'Pay to Earn Platform',
    tagline: 'Share & Earn',
    adminName: 'Pay to Earn Admin',
    currency: 'ETB',
    currencySymbol: 'ETB',

    // Logo configuration (overwritten by server config)
    logo: {
        imageUrl: '',
        emoji: '💰',
        showImage: false,
        showEmoji: true
    },

    // Support links (overwritten by server config)
    support: {
        telegram: '',
        telegramChannel: '',
        telegramGroup: '',
        email: '',
        showInNavbar: true
    },

    // Deposit bank details (overwritten by server config from deposit.json)
    bankName: 'CBE',
    bankAccount: '1000428407567',
    bankHolder: 'ATNATEWOS'
};

/**
 * Fetch platform config from server and merge into APP_CONFIG
 * Called once on app startup
 */
async function fetchPlatformConfig() {
    try {
        const apiUrl = APP_CONFIG.apiUrl;
        const response = await fetch(`${apiUrl}/config/platform`);
        const result = await response.json();
        
        if (result.success && result.data) {
            const serverConfig = result.data;
            
            // Merge all server config values into APP_CONFIG
            if (serverConfig.name) APP_CONFIG.name = serverConfig.name;
            if (serverConfig.fullName) APP_CONFIG.fullName = serverConfig.fullName;
            if (serverConfig.tagline) APP_CONFIG.tagline = serverConfig.tagline;
            if (serverConfig.adminName) APP_CONFIG.adminName = serverConfig.adminName;
            if (serverConfig.currency) APP_CONFIG.currency = serverConfig.currency;
            if (serverConfig.currencySymbol) APP_CONFIG.currencySymbol = serverConfig.currencySymbol;
            
            // Merge logo config
            if (serverConfig.logo) {
                APP_CONFIG.logo = {
                    imageUrl: serverConfig.logo.imageUrl || '',
                    emoji: serverConfig.logo.emoji || '💰',
                    showImage: serverConfig.logo.showImage || false,
                    showEmoji: serverConfig.logo.showEmoji !== false
                };
            }
            
            // Merge support config
            if (serverConfig.support) {
                APP_CONFIG.support = {
                    telegram: serverConfig.support.telegram || '',
                    telegramChannel: serverConfig.support.telegramChannel || '',
                    telegramGroup: serverConfig.support.telegramGroup || '',
                    email: serverConfig.support.email || '',
                    showInNavbar: serverConfig.support.showInNavbar !== false
                };
            }
            
            // Update page title
            document.title = serverConfig.fullName || APP_CONFIG.fullName;
            
            console.log('✓ Platform config loaded from server');
        }
    } catch (error) {
        console.log('⚠ Using default config (server unreachable)');
    }
}

// Also fetch deposit config from server
async function fetchDepositConfig() {
    try {
        const apiUrl = APP_CONFIG.apiUrl;
        const response = await fetch(`${apiUrl}/config/deposit-info`);
        const result = await response.json();
        
        if (result.success && result.data) {
            if (result.data.bankName) APP_CONFIG.bankName = result.data.bankName;
            if (result.data.bankAccount) APP_CONFIG.bankAccount = result.data.bankAccount;
            if (result.data.bankHolder) APP_CONFIG.bankHolder = result.data.bankHolder;
        }
    } catch (error) {
        // Use defaults
    }
}

// Fetch all configs on startup
fetchPlatformConfig();
fetchDepositConfig();