// config/db.js
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/pay_to_earn',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

// Test connection
pool.query('SELECT NOW()')
    .then(result => console.log('✓ PostgreSQL connected at:', result.rows[0].now))
    .catch(err => console.error('Database connection failed:', err.message));

module.exports = pool;