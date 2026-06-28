// public/js/config.js
/**
 * APP_CONFIG - Global configuration object
 * All values loaded from server config on startup
 * config/platform.json is the SINGLE source of truth
 */

// Default values (overwritten by server config on load)
const APP_CONFIG = {
    // API & URLs 
    // Since frontend and backend are on the same domain (Vercel or Localhost), 
    // we just use relative paths! No need for hardcoded URLs anymore.
    apiUrl: '/api',
    frontendUrl: window.location.origin, // Automatically detects localhost or vercel.app

    // Platform identity
    name: 'Pay to Earn',
    fullName: 'Pay to Earn Platform',
    tagline: 'Share & Earn',
    adminName: 'Pay to Earn Admin',
    currency: 'ETB',
    currencySymbol: 'ETB',

    // Logo configuration
    logo: {
        imageUrl: '',
        emoji: '💰',
        showImage: false,
        showEmoji: true
    },

    // Support links
    support: {
        telegram: '',
        telegramChannel: '',
        telegramGroup: '',
        email: ''
    },

    // Bank details
    bankName: 'CBE',
    bankAccount: '1000428407567',
    bankHolder: 'ATNATEWOS'
};

/**
 * Fetch platform config from server
 */
async function fetchPlatformConfig() {
    try {
        const response = await fetch(`${APP_CONFIG.apiUrl}/config/platform`);
        const result = await response.json();
        if (result.success && result.data) {
            const c = result.data;
            if (c.name) APP_CONFIG.name = c.name;
            if (c.fullName) APP_CONFIG.fullName = c.fullName;
            if (c.tagline) APP_CONFIG.tagline = c.tagline;
            if (c.adminName) APP_CONFIG.adminName = c.adminName;
            if (c.currency) APP_CONFIG.currency = c.currency;
            if (c.logo) APP_CONFIG.logo = c.logo;
            if (c.support) APP_CONFIG.support = c.support;
            document.title = c.fullName || APP_CONFIG.fullName;
        }
    } catch (e) {}
}

async function fetchDepositConfig() {
    try {
        const response = await fetch(`${APP_CONFIG.apiUrl}/config/deposit-info`);
        const result = await response.json();
        if (result.success && result.data) {
            if (result.data.bankName) APP_CONFIG.bankName = result.data.bankName;
            if (result.data.bankAccount) APP_CONFIG.bankAccount = result.data.bankAccount;
            if (result.data.bankHolder) APP_CONFIG.bankHolder = result.data.bankHolder;
        }
    } catch (e) {}
}

// Fetch server configs
fetchPlatformConfig();
fetchDepositConfig();