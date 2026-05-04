// middleware/errorHandler.js
function errorHandler(err, req, res, next) {
    console.error('Error:', err.message);

    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
            success: false,
            message: 'Duplicate entry. This record already exists.'
        });
    }

    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({
            success: false,
            message: 'Invalid reference. Related record not found.'
        });
    }

    if (err.code === 'ER_BAD_FIELD_ERROR') {
        return res.status(400).json({
            success: false,
            message: 'Database field error. Check your request.'
        });
    }

    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal server error.'
    });
}

module.exports = errorHandler;