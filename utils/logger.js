const pool = require('../config/db');

async function logAdminActivity(adminId, action, details = null, ipAddress = null) {
    try {
        await pool.query(
            'INSERT INTO admin_logs (admin_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
            [adminId, action, details ? JSON.stringify(details) : null, ipAddress]
        );
    } catch (error) { console.error('Failed to log activity:', error.message); }
}

module.exports = { logAdminActivity };