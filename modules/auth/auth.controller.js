// modules/auth/auth.controller.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../../config/db');
const Response = require('../../utils/response');

/**
 * User Login
 */
exports.login = async (req, res) => {
    try {
        const { phone, password } = req.body;

        if (!phone || !password) {
            return Response.error(res, 'Phone and password are required', 400);
        }

        // Find user by phone
        const result = await pool.query(
            'SELECT * FROM users WHERE phone = $1',
            [phone]
        );

        if (result.rows.length === 0) {
            return Response.error(res, 'Invalid phone or password', 401);
        }

        const user = result.rows[0];

        // Check if user is banned or suspended
        if (user.status === 'banned') {
            return Response.error(res, 'Your account has been permanently banned', 403);
        }

        if (user.status === 'suspended') {
            return Response.error(res, 'Your account has been suspended', 403);
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return Response.error(res, 'Invalid phone or password', 401);
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                phone: user.phone,
                role: 'user'
            },
            process.env.JWT_SECRET || 'fallback-secret-key-change-in-production',
            { expiresIn: '24h' }
        );

        // Return user data (without password)
        const { password_hash, ...userData } = user;

        Response.success(res, {
            token,
            user: userData
        }, 'Login successful');

    } catch (error) {
        console.error('Login error:', error);
        Response.error(res, 'An unexpected error occurred. Please try again later.', 500);
    }
};

/**
 * User Registration
 */
exports.register = async (req, res) => {
    try {
        const { phone, password, full_name, referral_code } = req.body;

        if (!phone || !password) {
            return Response.error(res, 'Phone and password are required', 400);
        }

        // Check if phone already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE phone = $1',
            [phone]
        );

        if (existingUser.rows.length > 0) {
            return Response.error(res, 'Phone number already registered', 409);
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Generate unique referral code if not provided
        const userReferralCode = referral_code || `REF${Date.now()}${Math.floor(Math.random() * 1000)}`;

        // Find referrer if referral code provided
        let referrerId = null;
        if (referral_code) {
            const referrerResult = await pool.query(
                'SELECT id FROM users WHERE referral_code = $1',
                [referral_code]
            );
            if (referrerResult.rows.length > 0) {
                referrerId = referrerResult.rows[0].id;
            }
        }

        // Insert new user
        const result = await pool.query(
            `INSERT INTO users (phone, password_hash, full_name, referral_code, referred_by, status) 
             VALUES ($1, $2, $3, $4, $5, 'active') 
             RETURNING id, phone, full_name, referral_code, status, created_at`,
            [phone, passwordHash, full_name || null, userReferralCode, referrerId]
        );

        const user = result.rows[0];

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                phone: user.phone,
                role: 'user'
            },
            process.env.JWT_SECRET || 'fallback-secret-key-change-in-production',
            { expiresIn: '24h' }
        );

        Response.success(res, {
            token,
            user
        }, 'Registration successful', 201);

    } catch (error) {
        console.error('Registration error:', error);
        Response.error(res, 'An unexpected error occurred. Please try again later.', 500);
    }
};

/**
 * Get Current User
 */
exports.getCurrentUser = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE id = $1',
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return Response.error(res, 'User not found', 404);
        }

        const { password_hash, ...userData } = result.rows[0];
        Response.success(res, userData);

    } catch (error) {
        console.error('Get user error:', error);
        Response.error(res, 'An unexpected error occurred', 500);
    }
};

/**
 * Logout
 */
exports.logout = async (req, res) => {
    Response.success(res, null, 'Logout successful');
};

/**
 * Admin Login
 */
exports.adminLogin = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return Response.error(res, 'Username and password are required', 400);
        }

        // Find admin by username
        const result = await pool.query(
            'SELECT * FROM admins WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return Response.error(res, 'Invalid username or password', 401);
        }

        const admin = result.rows[0];

        // Check if admin is suspended
        if (admin.status === 'suspended') {
            return Response.error(res, 'Your account has been suspended', 403);
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, admin.password_hash);
        if (!isValidPassword) {
            return Response.error(res, 'Invalid username or password', 401);
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                adminId: admin.id, 
                username: admin.username,
                role: admin.role
            },
            process.env.JWT_SECRET || 'fallback-secret-key-change-in-production',
            { expiresIn: '24h' }
        );

        // Update last login
        await pool.query(
            'UPDATE admins SET last_login = NOW() WHERE id = $1',
            [admin.id]
        );

        Response.success(res, {
            token,
            admin: {
                id: admin.id,
                username: admin.username,
                role: admin.role
            }
        }, 'Login successful');

    } catch (error) {
        console.error('Admin login error:', error);
        Response.error(res, 'An unexpected error occurred. Please try again later.', 500);
    }
};

/**
 * Get Current Admin
 */
exports.getCurrentAdmin = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, role, status, created_at, last_login FROM admins WHERE id = $1',
            [req.user.adminId]
        );

        if (result.rows.length === 0) {
            return Response.error(res, 'Admin not found', 404);
        }

        Response.success(res, result.rows[0]);

    } catch (error) {
        console.error('Get admin error:', error);
        Response.error(res, 'An unexpected error occurred', 500);
    }
};