// modules/deposits/deposits.service.js
const pool = require('../../config/db');
const { COMMISSION, DEPOSIT } = require('../../config/constants');
const NotificationsService = require('../notifications/notifications.service');

class DepositsService {
    async createDeposit(userId, amount, bankName, transactionId) {
        if (amount < DEPOSIT.MIN || amount > DEPOSIT.MAX) {
            throw new Error(`Deposit must be between ${DEPOSIT.MIN} and ${DEPOSIT.MAX} ETB`);
        }

        const [result] = await pool.query(
            'INSERT INTO deposits (user_id, amount, bank_name, transaction_id) VALUES (?, ?, ?, ?)',
            [userId, amount, bankName, transactionId]
        );

        return { id: result.insertId, status: 'pending' };
    }

    async verifyDeposit(depositId, adminId) {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            const [deposits] = await connection.query(
                'SELECT * FROM deposits WHERE id = ? AND status = "pending"',
                [depositId]
            );

            if (deposits.length === 0) {
                throw new Error('Deposit not found or already processed');
            }

            const deposit = deposits[0];

            await connection.query(
                'UPDATE deposits SET status = "verified", verified_by = ?, verified_at = NOW() WHERE id = ?',
                [adminId, depositId]
            );

            await connection.query(
                'UPDATE users SET balance = balance + ?, total_deposited = total_deposited + ? WHERE id = ?',
                [deposit.amount, deposit.amount, deposit.user_id]
            );

            const [userBalance] = await connection.query(
                'SELECT balance FROM users WHERE id = ?',
                [deposit.user_id]
            );

            await connection.query(
                `INSERT INTO transactions (user_id, type, amount, balance_after, category, reference_id, description)
                 VALUES (?, 'credit', ?, ?, 'deposit', ?, ?)`,
                [deposit.user_id, deposit.amount, userBalance[0].balance, depositId, 'Deposit verified']
            );

            const [packages] = await connection.query(
                'SELECT name FROM packages WHERE deposit_amount = ? AND is_active = TRUE',
                [deposit.amount]
            );

            if (packages.length > 0) {
                const packageName = packages[0].name;

                await connection.query(
                    'UPDATE user_packages SET is_active = FALSE WHERE user_id = ? AND is_active = TRUE',
                    [deposit.user_id]
                );

                await connection.query(
                    `INSERT INTO user_packages (user_id, package_name, deposit_amount, started_at, expires_at)
                     VALUES (?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY))`,
                    [deposit.user_id, packageName, deposit.amount]
                );

                await connection.query(
                    'UPDATE users SET active_package = ?, package_expiry = DATE_ADD(CURDATE(), INTERVAL 30 DAY) WHERE id = ?',
                    [packageName, deposit.user_id]
                );
            }

            const upline = await this.distributeReferralCommissions(connection, deposit.user_id, deposit.amount);

            await connection.commit();

            // Send notifications AFTER commit
            await NotificationsService.create(
                deposit.user_id,
                'Deposit Verified ✅',
                `Your deposit of ${deposit.amount.toLocaleString()} ETB has been verified and your package is now active.`,
                'deposit',
                depositId
            );

            if (upline && upline.length > 0) {
                const rates = [COMMISSION.REFERRAL.LEVEL_1, COMMISSION.REFERRAL.LEVEL_2, COMMISSION.REFERRAL.LEVEL_3];
                for (const uplineUser of upline) {
                    const rate = rates[uplineUser.level - 1];
                    const commissionAmount = deposit.amount * rate;
                    
                    await NotificationsService.create(
                        uplineUser.ancestor_id,
                        'Referral Commission 💰',
                        `You received ${commissionAmount.toFixed(2)} ETB from a Level ${uplineUser.level} referral deposit.`,
                        'commission',
                        deposit.user_id
                    );
                }
            }

            return { success: true, message: 'Deposit verified and notifications sent' };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async distributeReferralCommissions(connection, userId, amount) {
        const [upline] = await connection.query(
            `SELECT ancestor_id, level FROM user_tree 
             WHERE descendant_id = ? AND level > 0 AND level <= 3
             ORDER BY level ASC`,
            [userId]
        );

        const rates = [
            COMMISSION.REFERRAL.LEVEL_1,
            COMMISSION.REFERRAL.LEVEL_2,
            COMMISSION.REFERRAL.LEVEL_3
        ];

        for (const uplineUser of upline) {
            const rate = rates[uplineUser.level - 1];
            const commissionAmount = amount * rate;

            await connection.query(
                'UPDATE users SET balance = balance + ?, total_earned = total_earned + ? WHERE id = ?',
                [commissionAmount, commissionAmount, uplineUser.ancestor_id]
            );

            await connection.query(
                `INSERT INTO commissions (from_user_id, to_user_id, type, level, amount, source_amount, percentage)
                 VALUES (?, ?, 'referral', ?, ?, ?, ?)`,
                [userId, uplineUser.ancestor_id, uplineUser.level, commissionAmount, amount, rate * 100]
            );

            const [uplineBalance] = await connection.query(
                'SELECT balance FROM users WHERE id = ?',
                [uplineUser.ancestor_id]
            );

            await connection.query(
                `INSERT INTO transactions (user_id, type, amount, balance_after, category, reference_id, description)
                 VALUES (?, 'credit', ?, ?, 'commission', ?, ?)`,
                [uplineUser.ancestor_id, commissionAmount, uplineBalance[0].balance, userId,
                 `Referral commission level ${uplineUser.level} from user #${userId}`]
            );
        }

        return upline;
    }

    async rejectDeposit(depositId, adminId, reason) {
        const [result] = await pool.query(
            'UPDATE deposits SET status = "rejected", verified_by = ?, rejection_reason = ?, verified_at = NOW() WHERE id = ? AND status = "pending"',
            [adminId, reason, depositId]
        );

        if (result.affectedRows === 0) {
            throw new Error('Deposit not found or already processed');
        }

        return { success: true, message: 'Deposit rejected' };
    }

    async getPendingDeposits(page = 1, limit = 20) {
        const offset = (page - 1) * limit;

        const [deposits] = await pool.query(
            `SELECT d.*, u.phone, u.full_name 
            FROM deposits d 
            JOIN users u ON d.user_id = u.id 
            WHERE d.status = 'pending' 
            ORDER BY d.created_at ASC 
            LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        const [[{ total }]] = await pool.query(
            'SELECT COUNT(*) as total FROM deposits WHERE status = "pending"'
        );

        return {
            deposits,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        };
    }
}

module.exports = new DepositsService();