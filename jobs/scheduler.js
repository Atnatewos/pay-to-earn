const cron = require('node-cron');
const SalaryService = require('../modules/salary/salary.service');
const LeaderboardService = require('../modules/leaderboard/leaderboard.service');

class Scheduler {
    static start() {
        console.log('⏰ Scheduler started');
        cron.schedule('1 0 1 * *', async () => {
            console.log('📅 Processing monthly salaries...');
            try { const results = await SalaryService.processAllSalaries(); console.log(`✓ Processed ${results.length} salaries`); }
            catch (error) { console.error('Salary processing failed:', error.message); }
        });
        cron.schedule('0 * * * *', async () => {
            console.log('🔄 Updating leaderboard...');
            try { await LeaderboardService.updateLeaderboardCache(); console.log('✓ Leaderboard updated'); }
            catch (error) { console.error('Leaderboard update failed:', error.message); }
        });
        console.log('✓ All cron jobs scheduled');
    }
}

module.exports = Scheduler;