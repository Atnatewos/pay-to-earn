// public/js/config.js
const IS_PRODUCTION = window.location.hostname !== 'localhost';

const APP_CONFIG = {
    // Platform name
    name: 'Pay to Earn',
    fullName: 'Pay to Earn Platform',
    tagline: 'Share & Earn',
    adminName: 'Pay to Earn Admin',
    
    // API URLs - AUTO-DETECTS environment
    apiUrl: IS_PRODUCTION 
        ? 'https://pay-to-earn-production.up.railway.app/api' 
        : '/api',
    
    frontendUrl: IS_PRODUCTION 
        ? 'https://pay-to-earn.vercel.app' 
        : 'http://localhost:3000',
    
    // Currency
    currency: 'ETB',
    
    // Bank Details
    bankName: 'CBE',
    bankAccount: '1000428407567',
    bankHolder: 'ATNATEWOS',
    
    // Contact
    supportPhone: '',
    supportEmail: '',
};