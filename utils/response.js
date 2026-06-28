// utils/response.js
/**
 * Standardized API Response Helper
 */
const Response = {
    success: (res, data, message = 'Success', statusCode = 200) => {
        return res.status(statusCode).json({
            success: true,
            message,
            data
        });
    },

    error: (res, message = 'An error occurred', statusCode = 400, errors = null) => {
        return res.status(statusCode).json({
            success: false,
            message,
            errors
        });
    }
};

module.exports = Response;