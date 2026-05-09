// config/db.js
require('dotenv').config();
const { Pool } = require('pg');
const types = require('pg').types;
types.setTypeParser(1700, (val) => parseFloat(val));

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:A7n473w0$@localhost:5432/pay_to_earn';

const pool = new Pool({
    connectionString: connectionString,
    ssl: connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

module.exports = pool;