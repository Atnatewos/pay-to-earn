// scripts/seed-db.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

/**
 * Reads a SQL file and executes its statements against the database
 */
async function executeSQLFile(filename) {
    const filePath = path.join(__dirname, '..', 'database', filename);
    
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }

    console.log(`\n--- Executing ${filename} ---`);
    let sql = fs.readFileSync(filePath, 'utf8');
    
    // Remove all single-line comments (-- ...) so they don't break the split logic
    sql = sql.replace(/--.*$/gm, '');
    
    // Split SQL into individual statements by semicolon
    const statements = sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

    let successCount = 0;
    let errorCount = 0;

    for (const stmt of statements) {
        try {
            await pool.query(stmt);
            successCount++;
        } catch (error) {
            // Ignore "already exists" or "duplicate key" errors so we can run the script safely multiple times
            if (error.message.includes('already exists') || error.message.includes('does not exist') || error.message.includes('duplicate key')) {
                successCount++; 
            } else {
                console.error(`Error: ${error.message}`);
                console.error(`Statement: ${stmt.substring(0, 100)}...`);
                errorCount++;
            }
        }
    }

    console.log(`Finished ${filename}: ${successCount} successful, ${errorCount} errors.`);
}

async function main() {
    console.log('Connecting to Neon database...');
    try {
        // Test connection
        await pool.query('SELECT 1');
        console.log('Database connection successful!\n');
        
        // Run schema and seeds
        await executeSQLFile('schema.sql');
        await executeSQLFile('seeds.sql');
        
        console.log('\n✅ Database setup complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('Check your DATABASE_URL in your .env file.');
        process.exit(1);
    }
}

main();