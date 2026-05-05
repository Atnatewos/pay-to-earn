const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_n7KrIX6AkSuC@ep-frosty-truth-alxwrwao.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

async function resetAdmin() {
    try {
        const password = 'admin123';
        const hash = await bcrypt.hash(password, 12);
        
        const result = await pool.query("SELECT id FROM admins WHERE username = 'superadmin'");
        
        if (result.rows.length > 0) {
            await pool.query("UPDATE admins SET password_hash = $1, role = 'super_admin', status = 'active' WHERE username = 'superadmin'", [hash]);
            console.log('Super admin password updated.');
        } else {
            await pool.query("INSERT INTO admins (username, password_hash, role, status) VALUES ('superadmin', $1, 'super_admin', 'active')", [hash]);
            console.log('Super admin created.');
        }
        
        console.log('\nAdmin Login:');
        console.log('Username: superadmin');
        console.log('Password: admin123');
        
        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        await pool.end();
        process.exit(1);
    }
}

resetAdmin();
