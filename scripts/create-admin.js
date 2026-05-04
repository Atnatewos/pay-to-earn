const bcrypt = require('bcrypt');
const pool = require('../config/db');

async function createSuperAdmin() {
    try {
        const password = 'admin123';
        const hash = await bcrypt.hash(password, 12);
        
        console.log('Password hash:', hash);
        
        const [existing] = await pool.query('SELECT id FROM admins WHERE username = ?', ['superadmin']);
        
        if (existing.length > 0) {
            await pool.query('UPDATE admins SET password_hash = ? WHERE username = ?', [hash, 'superadmin']);
            console.log('Super admin password updated.');
        } else {
            await pool.query(
                'INSERT INTO admins (username, password_hash, role) VALUES (?, ?, ?)',
                ['superadmin', hash, 'super_admin']
            );
            console.log('Super admin created.');
            
            await pool.query(
                'INSERT INTO admin_permissions (admin_id, permission_id) SELECT 1, id FROM permissions'
            );
            console.log('Permissions assigned.');
        }
        
        console.log('\nLogin: superadmin / admin123');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

createSuperAdmin();
