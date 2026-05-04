const mysql = require('mysql2/promise');

async function setup() {
    const connection = await mysql.createConnection({
        host: 'tramway.proxy.rlwy.net',
        port: 15725,
        user: 'root',
        password: 'aaUiKnLcKLFzxSplgatgEZEtHaUgBYkz',
        database: 'railway'
    });

    console.log('Connected to Railway MySQL!');

    const fs = require('fs');
    
    // Run schema
    const schema = fs.readFileSync('database/schema.sql', 'utf8');
    const schemaStatements = schema.split(';').filter(s => s.trim());
    
    for (const stmt of schemaStatements) {
        try {
            await connection.query(stmt);
            console.log('✓ Schema executed');
        } catch (err) {
            if (!err.message.includes('already exists')) {
                console.log('⚠', err.message.substring(0, 50));
            }
        }
    }

    // Run seeds
    const seeds = fs.readFileSync('database/seeds.sql', 'utf8');
    const seedStatements = seeds.split(';').filter(s => s.trim());
    
    for (const stmt of seedStatements) {
        try {
            await connection.query(stmt);
            console.log('✓ Seeds executed');
        } catch (err) {
            if (!err.message.includes('Duplicate')) {
                console.log('⚠', err.message.substring(0, 50));
            }
        }
    }

    console.log('✅ Database setup complete!');
    await connection.end();
}

setup().catch(err => console.error('Failed:', err.message));
