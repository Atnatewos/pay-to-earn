-- database/schema.sql
-- Earn Platform - Complete Database Schema (PostgreSQL)

-- ============================================
-- USERS
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    referral_code VARCHAR(10) UNIQUE NOT NULL,
    referred_by INT DEFAULT NULL,
    parent_id INT DEFAULT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
    balance DECIMAL(12,2) DEFAULT 0.00,
    total_earned DECIMAL(12,2) DEFAULT 0.00,
    total_deposited DECIMAL(12,2) DEFAULT 0.00,
    active_package VARCHAR(10) DEFAULT NULL,
    package_expiry DATE DEFAULT NULL,
    is_intern_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_referral ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_parent ON users(parent_id);

ALTER TABLE users ADD CONSTRAINT fk_users_referred_by 
    FOREIGN KEY (referred_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD CONSTRAINT fk_users_parent 
    FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- USER TREE (Closure Table for MLM)
-- ============================================
CREATE TABLE IF NOT EXISTS user_tree (
    ancestor_id INT NOT NULL,
    descendant_id INT NOT NULL,
    level INT NOT NULL,
    PRIMARY KEY (ancestor_id, descendant_id)
);

CREATE INDEX IF NOT EXISTS idx_descendant ON user_tree(descendant_id);
CREATE INDEX IF NOT EXISTS idx_level ON user_tree(ancestor_id, level);

ALTER TABLE user_tree ADD CONSTRAINT fk_tree_ancestor 
    FOREIGN KEY (ancestor_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE user_tree ADD CONSTRAINT fk_tree_descendant 
    FOREIGN KEY (descendant_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================
-- ADMINS
-- ============================================
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('super_admin', 'senior_admin', 'admin', 'moderator')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_by INT DEFAULT NULL,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE admins ADD CONSTRAINT fk_admins_created_by 
    FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL;

-- ============================================
-- PERMISSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_permissions (
    admin_id INT NOT NULL,
    permission_id INT NOT NULL,
    PRIMARY KEY (admin_id, permission_id)
);

ALTER TABLE admin_permissions ADD CONSTRAINT fk_admin_perms_admin 
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE;
ALTER TABLE admin_permissions ADD CONSTRAINT fk_admin_perms_perm 
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE;

-- ============================================
-- PACKAGES (Membership Levels)
-- ============================================
CREATE TABLE IF NOT EXISTS packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(10) UNIQUE NOT NULL,
    level_order INT NOT NULL,
    deposit_amount DECIMAL(12,2) NOT NULL,
    tasks_per_day INT NOT NULL,
    income_per_task DECIMAL(10,2) NOT NULL,
    daily_income DECIMAL(10,2) NOT NULL,
    monthly_income DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- USER PACKAGES HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS user_packages (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    package_name VARCHAR(10) NOT NULL,
    deposit_amount DECIMAL(12,2) NOT NULL,
    started_at DATE NOT NULL,
    expires_at DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_active ON user_packages(user_id, is_active);

ALTER TABLE user_packages ADD CONSTRAINT fk_user_packages_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================
-- DEPOSITS (Recharges)
-- ============================================
CREATE TABLE IF NOT EXISTS deposits (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    bank_name VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    verified_by INT DEFAULT NULL,
    verified_at TIMESTAMP NULL,
    rejection_reason TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_status ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_user ON deposits(user_id, created_at);

ALTER TABLE deposits ADD CONSTRAINT fk_deposits_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE deposits ADD CONSTRAINT fk_deposits_verified 
    FOREIGN KEY (verified_by) REFERENCES admins(id) ON DELETE SET NULL;

-- ============================================
-- DAILY TASKS
-- ============================================
CREATE TABLE IF NOT EXISTS daily_tasks (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    task_date DATE NOT NULL,
    tasks_allocated INT NOT NULL,
    tasks_completed INT DEFAULT 0,
    earned DECIMAL(10,2) DEFAULT 0.00,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, task_date)
);

ALTER TABLE daily_tasks ADD CONSTRAINT fk_daily_tasks_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================
-- TASK LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS task_logs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    daily_task_id INT NOT NULL,
    task_number INT NOT NULL,
    earned DECIMAL(10,2) NOT NULL,
    video_watched BOOLEAN DEFAULT TRUE,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daily ON task_logs(daily_task_id);

ALTER TABLE task_logs ADD CONSTRAINT fk_task_logs_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE task_logs ADD CONSTRAINT fk_task_logs_daily 
    FOREIGN KEY (daily_task_id) REFERENCES daily_tasks(id) ON DELETE CASCADE;

-- ============================================
-- COMMISSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS commissions (
    id SERIAL PRIMARY KEY,
    from_user_id INT NOT NULL,
    to_user_id INT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('referral', 'task')),
    level INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    source_amount DECIMAL(10,2) NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_to_user ON commissions(to_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_from_user ON commissions(from_user_id, created_at);

ALTER TABLE commissions ADD CONSTRAINT fk_commissions_from 
    FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE commissions ADD CONSTRAINT fk_commissions_to 
    FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================
-- BANK ACCOUNTS
-- ============================================
CREATE TABLE IF NOT EXISTS bank_accounts (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    bank_name VARCHAR(50) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE bank_accounts ADD CONSTRAINT fk_bank_accounts_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================
-- WITHDRAWALS
-- ============================================
CREATE TABLE IF NOT EXISTS withdrawals (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    bank_account_id INT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
    processed_by INT DEFAULT NULL,
    processed_at TIMESTAMP NULL,
    reason TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_status ON withdrawals(user_id, status);

ALTER TABLE withdrawals ADD CONSTRAINT fk_withdrawals_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE withdrawals ADD CONSTRAINT fk_withdrawals_bank 
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE;
ALTER TABLE withdrawals ADD CONSTRAINT fk_withdrawals_processed 
    FOREIGN KEY (processed_by) REFERENCES admins(id) ON DELETE SET NULL;

-- ============================================
-- TRANSACTIONS (Immutable Ledger)
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
    amount DECIMAL(12,2) NOT NULL,
    balance_after DECIMAL(12,2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    reference_id INT DEFAULT NULL,
    description VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_date ON transactions(user_id, created_at);

ALTER TABLE transactions ADD CONSTRAINT fk_transactions_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================
-- BROADCAST MESSAGES
-- ============================================
CREATE TABLE IF NOT EXISTS broadcasts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    target VARCHAR(20) NOT NULL CHECK (target IN ('all', 'users', 'admins')),
    created_by INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE broadcasts ADD CONSTRAINT fk_broadcasts_admin 
    FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE CASCADE;

-- ============================================
-- SYSTEM FEATURES (Toggle switches)
-- ============================================
CREATE TABLE IF NOT EXISTS system_features (
    id SERIAL PRIMARY KEY,
    feature_key VARCHAR(50) UNIQUE NOT NULL,
    feature_name VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    updated_by INT DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE system_features ADD CONSTRAINT fk_features_admin 
    FOREIGN KEY (updated_by) REFERENCES admins(id) ON DELETE SET NULL;

-- ============================================
-- ADMIN LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS admin_logs (
    id SERIAL PRIMARY KEY,
    admin_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_date ON admin_logs(admin_id, created_at);

ALTER TABLE admin_logs ADD CONSTRAINT fk_admin_logs_admin 
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE;