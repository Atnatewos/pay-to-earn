// modules/auth/auth.middleware.js

/**
 * Permission-based access control middleware
 * Checks admin's permissions from database before allowing access
 * Super admin bypasses all checks
 */
const pool = require('../../config/db');
const Response = require('../../utils/response');


/**
 * Factory function that returns middleware for a specific permission
 * Returns descriptive error messages for permission denied
 * @param {string} permissionCode - Required permission code
 * @returns {function} Express middleware
 */
function requirePermission(permissionCode) {
  return async function(req, res, next) {
    try {
      var adminId = req.admin && req.admin.id;
      if (!adminId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      // Super admin bypasses all permission checks
      var roleResult = await pool.query(
        'SELECT role FROM admins WHERE id = $1 AND status = $2',
        [adminId, 'active']
      );

      if (roleResult.rows.length === 0) {
        return res.status(403).json({ success: false, message: 'Admin account not found or inactive' });
      }

      if (roleResult.rows[0].role === 'super_admin') {
        return next();
      }

      // Check specific permission in database
      var permResult = await pool.query(
        'SELECT 1 FROM admin_permissions WHERE admin_id = $1 AND permission_code = $2',
        [adminId, permissionCode]
      );

      if (permResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions. Required: ' + permissionCode
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error.message);
      return res.status(500).json({ success: false, message: 'Permission check failed' });
    }
  };
}

module.exports = { requirePermission };