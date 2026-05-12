// modules/deposits/deposits.routes.js
const router = require('express').Router();
const DepositsService = require('./deposits.service');
const Response = require('../../utils/response');
const { authenticateUser, authenticateAdmin } = require('../../middleware/auth');
const { requirePermission } = require('../auth/auth.middleware');
const pool = require('../../config/db');

/*
 * User creates a deposit request
 * Validates schedule, amount limits, and duplicate transaction IDs
 */
router.post('/', authenticateUser, async (req, res, next) => {
  try {
    const { amount, bankName, transactionId } = req.body;

    if (!amount || !bankName || !transactionId) {
      return Response.error(res, 'Amount, bank name and transaction ID are required', 400);
    }

    const result = await DepositsService.createDeposit(
      req.user.id, amount, bankName, transactionId
    );
    return Response.success(res, result, 'Deposit submitted for verification', 201);
  } catch (error) {
    return Response.error(res, error.message, 400);
  }
});

/*
 * User views their deposit history
 */
router.get('/history', authenticateUser, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM deposits WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    return Response.success(res, result.rows);
  } catch (error) {
    next(error);
  }
});

/*
 * Admin views pending deposits
 */
router.get('/pending', authenticateAdmin, requirePermission('deposits.verify'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await DepositsService.getPendingDeposits(parseInt(page), parseInt(limit));
    return Response.paginated(res, result.deposits, result.pagination);
  } catch (error) {
    next(error);
  }
});

/*
 * Admin verifies a pending deposit
 * Credits capital, activates package, distributes commissions
 */
router.post('/:id/verify', authenticateAdmin, requirePermission('deposits.verify'), async (req, res, next) => {
  try {
    const result = await DepositsService.verifyDeposit(req.params.id, req.admin.id);
    return Response.success(res, result);
  } catch (error) {
    return Response.error(res, error.message, 400);
  }
});

/*
 * Admin rejects a pending deposit
 * Does NOT refund (no money was credited yet for deposits)
 */
router.post('/:id/reject', authenticateAdmin, requirePermission('deposits.reject'), async (req, res, next) => {
  try {
    const { reason } = req.body;
    const result = await DepositsService.rejectDeposit(req.params.id, req.admin.id, reason);
    return Response.success(res, result);
  } catch (error) {
    return Response.error(res, error.message, 400);
  }
});

/*
 * Admin unblocks a rejected transaction ID
 * Marks deposit as 'unblocked' so the transaction ID can be reused
 */
router.post('/:id/unblock', authenticateAdmin, requirePermission('deposits.verify'), async (req, res, next) => {
  try {
    const result = await DepositsService.unblockTransactionId(req.params.id, req.admin.id);
    return Response.success(res, result);
  } catch (error) {
    return Response.error(res, error.message, 400);
  }
});

module.exports = router;