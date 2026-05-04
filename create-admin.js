// scripts/create-admin.js
const bcrypt = require('bcrypt');
const pool = require('../config/db');

async function createSuperAdmin() {
    try {
        const password = 'admin123';
        const hash = await bcrypt.hash(password, 12);
        
        console.log('Password hash:', hash);
        
        // Check if admin exists
        const [existing] = await pool.query('SELECT id FROM admins WHERE username = ?', ['superadmin']);
        
        if (existing.length > 0) {
            // Update password
            await pool.query('UPDATE admins SET password_hash = ? WHERE username = ?', [hash, 'superadmin']);
            console.log('Super admin password updated.');
        } else {
            // Create new
            await pool.query(
                'INSERT INTO admins (username, password_hash, role) VALUES (?, ?, ?)',
                ['superadmin', hash, 'super_admin']
            );
            console.log('Super admin created.');
            
            // Assign permissions
            await pool.query(
                'INSERT INTO admin_permissions (admin_id, permission_id) SELECT 1, id FROM permissions'
            );
            console.log('Permissions assigned.');
        }
        
        console.log('\nLogin with:');
        console.log('Username: superadmin');
        console.log('Password: admin123');
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

createSuperAdmin();