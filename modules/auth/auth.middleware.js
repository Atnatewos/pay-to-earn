const pool = require('../../config/db');
const Response = require('../../utils/response');

function requirePermission(permissionCode) {
    return async (req, res, next) => {
        try {
            const result = await pool.query(
                'SELECT role FROM admins WHERE id = $1 AND status = $2',
                [req.admin.id, 'active']
            );

            if (result.rows.length === 0) return Response.error(res, 'Admin not found', 404);
            if (result.rows[0].role === 'super_admin') return next();

            // For now, all authenticated admins have basic permissions
            // In production, check admin_permissions table
            next();
        } catch (error) {
            next(error);
        }
    };
}

module.exports = { requirePermission };