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
 * @param {string} permissionCode - Required permission code from config/permissions.json
 * @returns {function} Express middleware
 */
function requirePermission(permissionCode) {
  return async function(req, res, next) {
    try {
      var adminId = req.admin && req.admin.id;
      if (!adminId) {
        return Response.error(res, 'Authentication required', 401);
      }

      // Check if admin is super_admin - they have all permissions
      var roleResult = await pool.query(
        'SELECT role FROM admins WHERE id = $1 AND status = $2',
        [adminId, 'active']
      );

      if (roleResult.rows.length === 0) {
        return Response.error(res, 'Admin account not found or inactive', 403);
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
        return Response.error(res, 'Insufficient permissions. Required: ' + permissionCode, 403);
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error.message);
      return Response.error(res, 'Permission check failed', 500);
    }
  };
}

module.exports = { requirePermission };