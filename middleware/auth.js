// middleware/auth.js
const jwt = require('jsonwebtoken');
const Response = require('../utils/response');

/**
 * Authenticate User
 */
const authenticateUser = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return Response.error(res, 'Access token is required', 401);
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'fallback-secret-key-change-in-production'
        );

        req.user = decoded;
        next();

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return Response.error(res, 'Token has expired', 401);
        }
        if (error.name === 'JsonWebTokenError') {
            return Response.error(res, 'Invalid token', 401);
        }
        return Response.error(res, 'Authentication failed', 401);
    }
};

/**
 * Authenticate Admin
 */
const authenticateAdmin = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return Response.error(res, 'Access token is required', 401);
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'fallback-secret-key-change-in-production'
        );

        // Check if user has admin role
        if (!decoded.role || !decoded.adminId) {
            return Response.error(res, 'Admin access required', 403);
        }

        req.user = decoded;
        next();

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return Response.error(res, 'Token has expired', 401);
        }
        if (error.name === 'JsonWebTokenError') {
            return Response.error(res, 'Invalid token', 401);
        }
        return Response.error(res, 'Authentication failed', 401);
    }
};

module.exports = {
    authenticateUser,
    authenticateAdmin
};