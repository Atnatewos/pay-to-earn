// config/db.js
const mysql = require('mysql2/promise');

let pool;

if (process.env.DATABASE_URL) {
    // Railway provides DATABASE_URL automatically
    const url = new URL(process.env.DATABASE_URL);
    pool = mysql.createPool({
        host: url.hostname,
        port: url.port,
        user: url.username,
        password: url.password,
        database: url.pathname.replace('/', ''),
        waitForConnections: true,
        connectionLimit: 5
    });
} else if (process.env.MYSQL_URL) {
    const url = new URL(process.env.MYSQL_URL);
    pool = mysql.createPool({
        host: url.hostname,
        port: url.port,
        user: url.username,
        password: url.password,
        database: url.pathname.replace('/', ''),
        waitForConnections: true,
        connectionLimit: 5
    });
} else {
    pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'earn_platform',
        waitForConnections: true,
        connectionLimit: 5
    });
}

module.exports = pool;