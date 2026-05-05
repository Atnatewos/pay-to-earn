// public/js/config.js
const IS_PRODUCTION = window.location.hostname !== 'localhost';

const APP_CONFIG = {
    name: 'Pay to Earn',
    fullName: 'Pay to Earn Platform',
    tagline: 'Share & Earn',
    adminName: 'Pay to Earn Admin',
    
    // API URLs - AUTO-DETECTS environment
    apiUrl: IS_PRODUCTION 
        ? 'https://pay-to-earn-api.onrender.com/api' 
        : '/api',
    
    frontendUrl: IS_PRODUCTION 
        ? 'https://pay-to-earn.vercel.app' 
        : 'http://localhost:3000',
    
    currency: 'ETB',
    bankName: 'CBE',
    bankAccount: '1000428407567',
    bankHolder: 'ATNATEWOS',
    supportPhone: '',
    supportEmail: '',
};