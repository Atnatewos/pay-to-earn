// modules/auth/auth.middleware.js
const pool = require('../../config/db');
const Response = require('../../utils/response');

function requirePermission(permissionCode) {
    return async (req, res, next) => {
        try {
            const [admins] = await pool.query(
                'SELECT role FROM admins WHERE id = ? AND status = "active"',
                [req.admin.id]
            );

            if (admins.length === 0) {
                return Response.error(res, 'Admin not found', 404);
            }

            // Super admin has all permissions
            if (admins[0].role === 'super_admin') {
                return next();
            }

            const [hasPermission] = await pool.query(
                `SELECT 1 FROM admin_permissions ap
                 JOIN permissions p ON ap.permission_id = p.id
                 WHERE ap.admin_id = ? AND p.code = ?`,
                [req.admin.id, permissionCode]
            );

            if (hasPermission.length === 0) {
                return Response.error(res, 'Insufficient permissions', 403);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

module.exports = { requirePermission };