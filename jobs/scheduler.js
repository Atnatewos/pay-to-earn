// jobs/scheduler.js
const cron = require('node-cron');
const SalaryService = require('../modules/salary/salary.service');
const LeaderboardService = require('../modules/leaderboard/leaderboard.service');

class Scheduler {
    static start() {
        console.log('⏰ Scheduler started');

        // Process salaries on 1st of every month at 00:01
        cron.schedule('1 0 1 * *', async () => {
            console.log('📅 Processing monthly salaries...');
            try {
                const results = await SalaryService.processAllSalaries();
                console.log(`✓ Processed ${results.length} salaries`);
            } catch (error) {
                console.error('Salary processing failed:', error.message);
            }
        });

        // Update leaderboard every hour
        cron.schedule('0 * * * *', async () => {
            console.log('🔄 Updating leaderboard cache...');
            try {
                await LeaderboardService.updateLeaderboardCache();
                console.log('✓ Leaderboard updated');
            } catch (error) {
                console.error('Leaderboard update failed:', error.message);
            }
        });

        // Reset daily tasks at midnight (00:01)
        cron.schedule('1 0 * * *', async () => {
            console.log('🔄 New day - tasks will reset on user login');
        });

        console.log('✓ All cron jobs scheduled');
    }
}

module.exports = Scheduler;