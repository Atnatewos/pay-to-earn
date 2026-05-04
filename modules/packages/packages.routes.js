// modules/packages/packages.routes.js
const router = require('express').Router();
const PackagesService = require('./packages.service');
const Response = require('../../utils/response');
const { authenticateUser } = require('../../middleware/auth');

router.get('/', authenticateUser, async (req, res, next) => {
    try {
        const packages = await PackagesService.getAllPackages();
        return Response.success(res, packages);
    } catch (error) {
        next(error);
    }
});

router.get('/active', authenticateUser, async (req, res, next) => {
    try {
        const pkg = await PackagesService.getUserActivePackage(req.user.id);
        return Response.success(res, pkg);
    } catch (error) {
        next(error);
    }
});

module.exports = router;