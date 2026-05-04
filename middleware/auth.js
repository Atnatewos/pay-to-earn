// middleware/auth.js
const jwt = require('jsonwebtoken');
const { JWT } = require('../config/constants');
const Response = require('../utils/response');

function authenticateUser(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return Response.error(res, 'Access denied. No token provided.', 401);
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT.SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return Response.error(res, 'Invalid or expired token.', 401);
    }
}

function authenticateAdmin(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return Response.error(res, 'Access denied. No token provided.', 401);
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT.SECRET);

        if (!decoded.isAdmin) {
            return Response.error(res, 'Admin access required.', 403);
        }

        req.admin = decoded;
        next();
    } catch (error) {
        return Response.error(res, 'Invalid or expired token.', 401);
    }
}

module.exports = { authenticateUser, authenticateAdmin };