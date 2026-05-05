const router = require('express').Router();
const SalaryService = require('./salary.service');
const Response = require('../../utils/response');
const { authenticateUser, authenticateAdmin } = require('../../middleware/auth');

router.get('/eligibility', authenticateUser, async (req, res, next) => {
    try { const eligibility = await SalaryService.checkRankEligibility(req.user.id); return Response.success(res, eligibility); }
    catch (error) { next(error); }
});

router.get('/history', authenticateUser, async (req, res, next) => {
    try { const history = await SalaryService.getUserSalaryHistory(req.user.id); return Response.success(res, history); }
    catch (error) { next(error); }
});

router.post('/process-all', authenticateAdmin, async (req, res, next) => {
    try { const results = await SalaryService.processAllSalaries(); return Response.success(res, results, `Processed ${results.length} salaries`); }
    catch (error) { next(error); }
});

module.exports = router;