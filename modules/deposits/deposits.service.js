// modules/deposits/deposits.service.js
const pool = require('../../config/db');
const NotificationsService = require('../notifications/notifications.service');
const MoneyService = require('../money/money.service');
const PackagesService = require('../packages/packages.service');
const depositConfig = require('../../config/deposit.json');
const commissionConfig = require('../../config/commissions.json');

class DepositsService {

  checkSchedule() {
    const schedule = depositConfig.schedule;
    if (!schedule.enabled) {
      return { allowed: false, message: 'Deposits are currently disabled.' };
    }
    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[now.getDay()];
    if (!schedule.days.includes(todayName)) {
      const availableDays = schedule.days.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ');
      return { allowed: false, message: `Deposits only available on: ${availableDays}.` };
    }
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = schedule.hoursStart.split(':').map(Number);
    const [endH, endM] = schedule.hoursEnd.split(':').map(Number);
    if (currentTime < startH * 60 + startM || currentTime > endH * 60 + endM) {
      return { allowed: false, message: `Deposits available from ${schedule.hoursStart} to ${schedule.hoursEnd}.` };
    }
    return { allowed: true };
  }

  /**
   * Check if a transaction ID has already been used
   * @param {string} transactionId - Bank transaction ID to check
   * @param {number} userId - Current user ID to check if same user
   * @returns {object} { used: boolean, status: string, userId: number, message: string }
   */
  async checkTransactionId(transactionId, userId) {
    const result = await pool.query(
      'SELECT id, user_id, status FROM deposits WHERE transaction_id = $1 ORDER BY created_at DESC LIMIT 1',
      [transactionId]
    );

    if (result.rows.length === 0) {
      return { used: false };
    }

    const existing = result.rows[0];
    const isSameUser = existing.user_id == userId;

    if (existing.status === 'verified') {
      return {
        used: true,
        status: 'verified',
        message: 'This transaction ID has already been verified and credited. Each bank transfer can only be used once.'
      };
    }

    if (existing.status === 'pending') {
      return {
        used: true,
        status: 'pending',
        isSameUser: isSameUser,
        message: isSameUser
          ? 'You already submitted this transaction ID. It is pending verification. Please wait or contact support.'
          : 'This transaction ID has already been submitted by another user.'
      };
    }

    if (existing.status === 'rejected') {
      return {
        used: true,
        status: 'rejected',
        isSameUser: isSameUser,
        message: 'This transaction ID was previously rejected. Please contact an admin to unblock it before resubmitting.'
      };
    }

    if (existing.status === 'unblocked') {
      return { used: false };
    }

    return {
      used: true,
      message: 'This transaction ID cannot be used.'
    };
  }

  async createDeposit(userId, amount, bankName, transactionId) {
    const scheduleCheck = this.checkSchedule();
    if (!scheduleCheck.allowed) throw new Error(scheduleCheck.message);

    const min = depositConfig.minAmount || 1600;
    const max = depositConfig.maxAmount || 330000;
    if (amount < min || amount > max) {
      throw new Error(`Deposit must be between ${min.toLocaleString()} and ${max.toLocaleString()} ETB`);
    }

    // Check if transaction ID already exists
    const idCheck = await this.checkTransactionId(transactionId, userId);
    if (idCheck.used) {
      throw new Error(idCheck.message);
    }

    const result = await pool.query(
      'INSERT INTO deposits (user_id, amount, bank_name, transaction_id) VALUES ($1, $2, $3, $4) RETURNING id',
      [userId, amount, bankName, transactionId]
    );
    return { id: result.rows[0].id, status: 'pending' };
  }

  /**
   * Admin unblocks a rejected transaction ID
   * Marks the old deposit as 'unblocked' so the ID can be reused
   * @param {number} depositId - ID of the rejected deposit to unblock
   * @param {number} adminId - Admin performing the action
   */
  async unblockTransactionId(depositId, adminId) {
    const client = await pool.connect();
    try {
      const depositResult = await client.query(
        'SELECT * FROM deposits WHERE id = $1 AND status = $2',
        [depositId, 'rejected']
      );

      if (depositResult.rows.length === 0) {
        throw new Error('Deposit not found or not in rejected status');
      }

      const deposit = depositResult.rows[0];

      await client.query(
        'UPDATE deposits SET status = $1, verified_by = $2, verified_at = NOW() WHERE id = $3',
        ['unblocked', adminId, depositId]
      );

      await client.query(
        'INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [adminId, 'deposit_unblocked', 'deposit', depositId, JSON.stringify({ transaction_id: deposit.transaction_id })]
      );

      return {
        success: true,
        message: 'Transaction ID unblocked. User can now resubmit.'
      };
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  async verifyDeposit(depositId, adminId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const depositResult = await client.query(
        'SELECT * FROM deposits WHERE id = $1 AND status = $2',
        [depositId, 'pending']
      );
      if (depositResult.rows.length === 0) throw new Error('Deposit not found or already processed');
      const deposit = depositResult.rows[0];

      await client.query(
        'UPDATE deposits SET status = $1, verified_by = $2, verified_at = NOW() WHERE id = $3',
        ['verified', adminId, depositId]
      );

      await MoneyService.credit(deposit.user_id, deposit.amount, 'capital', 'deposit', 'Deposit verified', depositId);

      const matchedPackage = PackagesService.getPackageByDeposit(deposit.amount);
      if (matchedPackage && matchedPackage.key !== 'Intern') {
        const packageName = matchedPackage.name || matchedPackage.key;
        const durationDays = matchedPackage.durationDays || 30;
        await client.query('UPDATE user_packages SET is_active = FALSE WHERE user_id = $1 AND is_active = TRUE', [deposit.user_id]);
        await client.query(`INSERT INTO user_packages (user_id, package_name, deposit_amount, started_at, expires_at) VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE + INTERVAL '${durationDays} days')`, [deposit.user_id, packageName, deposit.amount]);
        await client.query(`UPDATE users SET active_package = $1, package_expiry = CURRENT_DATE + INTERVAL '${durationDays} days' WHERE id = $2`, [packageName, deposit.user_id]);
      }

      await this.distributeReferralCommissions(client, deposit.user_id, deposit.amount);
      await client.query('COMMIT');

      await NotificationsService.create(deposit.user_id, 'Deposit Verified', `Your deposit of ${deposit.amount.toLocaleString()} ETB has been verified.`, 'deposit', depositId);

      return { success: true, message: 'Deposit verified' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async distributeReferralCommissions(client, userId, amount) {
    const uplineResult = await client.query(
      'SELECT ancestor_id, level FROM user_tree WHERE descendant_id = $1 AND level > 0 AND level <= 3 ORDER BY level ASC',
      [userId]
    );
    const rates = [commissionConfig.referral.level1.rate, commissionConfig.referral.level2.rate, commissionConfig.referral.level3.rate];
    for (const uplineUser of uplineResult.rows) {
      const rate = rates[uplineUser.level - 1];
      const commissionAmount = amount * rate;
      await MoneyService.credit(uplineUser.ancestor_id, commissionAmount, 'earnings', 'commission', `Referral commission level ${uplineUser.level}`, userId);
      await client.query('INSERT INTO commissions (from_user_id, to_user_id, type, level, amount, source_amount, percentage) VALUES ($1, $2, $3, $4, $5, $6, $7)', [userId, uplineUser.ancestor_id, 'referral', uplineUser.level, commissionAmount, amount, rate * 100]);
      await NotificationsService.create(uplineUser.ancestor_id, 'Referral Commission', `${commissionAmount.toFixed(2)} ETB from a Level ${uplineUser.level} referral.`, 'commission', userId);
    }
  }

  async rejectDeposit(depositId, adminId, reason) {
    const result = await pool.query(
      'UPDATE deposits SET status = $1, verified_by = $2, rejection_reason = $3, verified_at = NOW() WHERE id = $4 AND status = $5',
      ['rejected', adminId, reason, depositId, 'pending']
    );
    if (result.rowCount === 0) throw new Error('Deposit not found or already processed');
    const deposit = await pool.query('SELECT user_id, amount FROM deposits WHERE id = $1', [depositId]);
    if (deposit.rows.length > 0) {
      await NotificationsService.create(deposit.rows[0].user_id, 'Deposit Rejected', `Your deposit of ${deposit.rows[0].amount.toLocaleString()} ETB was rejected. Reason: ${reason}`, 'deposit', depositId);
    }
    return { success: true, message: 'Deposit rejected' };
  }

  async getPendingDeposits(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const depositsResult = await pool.query(
      `SELECT d.*, u.phone, u.full_name FROM deposits d JOIN users u ON d.user_id = u.id WHERE d.status = 'pending' ORDER BY d.created_at ASC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const countResult = await pool.query("SELECT COUNT(*) as total FROM deposits WHERE status = 'pending'");
    const total = parseInt(countResult.rows[0].total);
    return { deposits: depositsResult.rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }
}

module.exports = new DepositsService();