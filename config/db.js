// config/db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'earn_platform',
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    connectTimeout: 10000,
    acquireTimeout: 10000,
    timeout: 10000
});

module.exports = pool;