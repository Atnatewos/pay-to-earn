// modules/config/config.routes.js
const router = require('express').Router();
const withdrawalConfig = require('../../config/withdrawalConfig');

router.get('/withdrawal-amounts', (req, res) => {
    res.json({ success: true, data: withdrawalConfig.FIXED_AMOUNTS });
});

router.get('/support', (req, res) => {
    res.json({ 
        success: true, 
        data: {
            telegram: withdrawalConfig.SUPPORT_TELEGRAM,
            email: withdrawalConfig.SUPPORT_EMAIL,
            appName: withdrawalConfig.APP_NAME
        }
    });
});

module.exports = router;