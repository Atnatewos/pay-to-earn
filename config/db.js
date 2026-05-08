// config/db.js
const { Pool } = require('pg');

// Set numeric parsing to avoid overflow
const types = require('pg').types;
types.setTypeParser(1700, (val) => parseFloat(val));

const pool = new Pool({
    connectionString: (process.env.DATABASE_URL || 'postgresql://postgres:A7n473w0$@localhost:5432/pay_to_earn') + '?sslmode=require',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    statement_timeout: 30000
});

pool.query('SELECT NOW()')
    .then(result => console.log('PostgreSQL connected at:', result.rows[0].now))
    .catch(err => console.error('Database connection failed:', err.message));

module.exports = pool;