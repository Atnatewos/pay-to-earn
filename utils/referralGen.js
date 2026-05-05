const crypto = require('crypto');

function generateReferralCode(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) { code += chars[bytes[i] % chars.length]; }
    return code;
}

module.exports = { generateReferralCode };