-- database/seeds.sql

-- ============================================
-- PACKAGES
-- ============================================
INSERT INTO packages (name, level_order, deposit_amount, tasks_per_day, income_per_task, daily_income, monthly_income) VALUES
('Intern', 0, 0.00, 5, 12.00, 60.00, 180.00),
('D1', 1, 1600.00, 5, 12.00, 60.00, 1800.00),
('D2', 2, 4000.00, 5, 30.00, 150.00, 4500.00),
('D3', 3, 7200.00, 5, 54.00, 270.00, 8100.00),
('D4', 4, 16000.00, 5, 120.00, 600.00, 18000.00),
('D5', 5, 36000.00, 5, 300.00, 1500.00, 45000.00),
('D6', 6, 90000.00, 10, 385.00, 3850.00, 115500.00),
('D7', 7, 140000.00, 20, 275.00, 5500.00, 165000.00),
('D8', 8, 330000.00, 20, 625.00, 12500.00, 375000.00);

-- ============================================
-- PERMISSIONS
-- ============================================
INSERT INTO permissions (code, name, category) VALUES
('system.control', 'System On/Off', 'system'),
('system.broadcast', 'Send Broadcasts', 'system'),
('system.features', 'Toggle Features', 'system'),
('system.logs', 'View Logs', 'system'),
('admins.create', 'Create Admins', 'admins'),
('admins.edit', 'Edit Admins', 'admins'),
('admins.delete', 'Delete Admins', 'admins'),
('admins.view', 'View Admins', 'admins'),
('users.view', 'View Users', 'users'),
('users.edit', 'Edit Users', 'users'),
('users.suspend', 'Suspend Users', 'users'),
('users.delete', 'Delete Users', 'users'),
('deposits.verify', 'Verify Deposits', 'finance'),
('deposits.reject', 'Reject Deposits', 'finance'),
('withdrawals.process', 'Process Withdrawals', 'finance'),
('withdrawals.reject', 'Reject Withdrawals', 'finance'),
('commissions.view', 'View Commissions', 'finance'),
('packages.edit', 'Edit Packages', 'system');

-- ============================================
-- SUPER ADMIN (Password: admin123 - CHANGE IMMEDIATELY)
-- ============================================
INSERT INTO admins (username, password_hash, role) VALUES
('superadmin', '$2b$12$LJ3m4ys3Lk0TSxGqmJzc5.YhHqZpB.XkHOBCMGkGHqG5HDUdJKzmW', 'super_admin');

-- Assign all permissions to super admin
INSERT INTO admin_permissions (admin_id, permission_id)
SELECT 1, id FROM permissions;

-- ============================================
-- SYSTEM FEATURES
-- ============================================
INSERT INTO system_features (feature_key, feature_name, is_enabled) VALUES
('registration', 'User Registration', TRUE),
('tasks', 'Task System', TRUE),
('deposits', 'Deposit System', TRUE),
('withdrawals', 'Withdrawal System', TRUE),
('commissions', 'Commission System', TRUE),
('referrals', 'Referral System', TRUE);