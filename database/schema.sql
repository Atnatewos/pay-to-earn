-- database/schema.sql
-- Earn Platform - Complete Database Schema

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- USERS
-- ============================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    referral_code VARCHAR(10) UNIQUE NOT NULL,
    referred_by INT DEFAULT NULL,
    parent_id INT DEFAULT NULL,
    status ENUM('active', 'suspended', 'banned') DEFAULT 'active',
    balance DECIMAL(12,2) DEFAULT 0.00,
    total_earned DECIMAL(12,2) DEFAULT 0.00,
    total_deposited DECIMAL(12,2) DEFAULT 0.00,
    active_package VARCHAR(10) DEFAULT NULL,
    package_expiry DATE DEFAULT NULL,
    is_intern_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phone (phone),
    INDEX idx_referral (referral_code),
    INDEX idx_parent (parent_id),
    FOREIGN KEY (referred_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- USER TREE (Closure Table for MLM)
-- ============================================
CREATE TABLE user_tree (
    ancestor_id INT NOT NULL,
    descendant_id INT NOT NULL,
    level INT NOT NULL,
    PRIMARY KEY (ancestor_id, descendant_id),
    INDEX idx_descendant (descendant_id),
    INDEX idx_level (ancestor_id, level),
    FOREIGN KEY (ancestor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (descendant_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- ADMINS
-- ============================================
CREATE TABLE admins (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'senior_admin', 'admin', 'moderator') NOT NULL,
    status ENUM('active', 'suspended') DEFAULT 'active',
    created_by INT DEFAULT NULL,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- PERMISSIONS
-- ============================================
CREATE TABLE permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE admin_permissions (
    admin_id INT NOT NULL,
    permission_id INT NOT NULL,
    PRIMARY KEY (admin_id, permission_id),
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- PACKAGES (Membership Levels)
-- ============================================
CREATE TABLE packages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(10) UNIQUE NOT NULL,
    level_order INT NOT NULL,
    deposit_amount DECIMAL(12,2) NOT NULL,
    tasks_per_day INT NOT NULL,
    income_per_task DECIMAL(10,2) NOT NULL,
    daily_income DECIMAL(10,2) NOT NULL,
    monthly_income DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- USER PACKAGES HISTORY
-- ============================================
CREATE TABLE user_packages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    package_name VARCHAR(10) NOT NULL,
    deposit_amount DECIMAL(12,2) NOT NULL,
    started_at DATE NOT NULL,
    expires_at DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_active (user_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- DEPOSITS (Recharges)
-- ============================================
CREATE TABLE deposits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    bank_name VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(100) NOT NULL,
    status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    verified_by INT DEFAULT NULL,
    verified_at TIMESTAMP NULL,
    rejection_reason TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES admins(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_user (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- DAILY TASKS
-- ============================================
CREATE TABLE daily_tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    task_date DATE NOT NULL,
    tasks_allocated INT NOT NULL,
    tasks_completed INT DEFAULT 0,
    earned DECIMAL(10,2) DEFAULT 0.00,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_date (user_id, task_date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- TASK LOGS
-- ============================================
CREATE TABLE task_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    daily_task_id INT NOT NULL,
    task_number INT NOT NULL,
    earned DECIMAL(10,2) NOT NULL,
    video_watched BOOLEAN DEFAULT TRUE,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (daily_task_id) REFERENCES daily_tasks(id) ON DELETE CASCADE,
    INDEX idx_daily (daily_task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- COMMISSIONS
-- ============================================
CREATE TABLE commissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    from_user_id INT NOT NULL,
    to_user_id INT NOT NULL,
    type ENUM('referral', 'task') NOT NULL,
    level INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    source_amount DECIMAL(10,2) NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_to_user (to_user_id, created_at),
    INDEX idx_from_user (from_user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- BANK ACCOUNTS
-- ============================================
CREATE TABLE bank_accounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    bank_name VARCHAR(50) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- WITHDRAWALS
-- ============================================
CREATE TABLE withdrawals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    bank_account_id INT NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'rejected') DEFAULT 'pending',
    processed_by INT DEFAULT NULL,
    processed_at TIMESTAMP NULL,
    reason TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (processed_by) REFERENCES admins(id) ON DELETE SET NULL,
    INDEX idx_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- TRANSACTIONS (Immutable Ledger)
-- ============================================
CREATE TABLE transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    type ENUM('credit', 'debit') NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    balance_after DECIMAL(12,2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    reference_id INT DEFAULT NULL,
    description VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- BROADCAST MESSAGES
-- ============================================
CREATE TABLE broadcasts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    target ENUM('all', 'users', 'admins') NOT NULL,
    created_by INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- SYSTEM FEATURES (Toggle switches)
-- ============================================
CREATE TABLE system_features (
    id INT PRIMARY KEY AUTO_INCREMENT,
    feature_key VARCHAR(50) UNIQUE NOT NULL,
    feature_name VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    updated_by INT DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- ADMIN LOGS
-- ============================================
CREATE TABLE admin_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    details JSON DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
    INDEX idx_admin_date (admin_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;