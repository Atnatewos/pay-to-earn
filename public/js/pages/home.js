// public/js/pages/home.js
class HomePage {
    constructor(container) {
        this.container = container;
    }

    async render() {
        Navbar.render('Earn', false, [
            { icon: '🔔', title: 'Notifications', onclick: 'NotificationBell.showNotifications()' }
        ]);
        BottomNav.render('/home');
        DesktopSidebar.render('/home');

        setTimeout(() => {
            if (typeof NotificationBell !== 'undefined') {
                NotificationBell.updateCount();
            }
        }, 300);

        this.container.innerHTML = `
            <div class="page">
                <div id="homeContent">
                    <div class="balance-hero">
                        <div class="skeleton" style="height:24px;width:100px;background:rgba(255,255,255,0.2);margin-bottom:8px;"></div>
                        <div class="skeleton" style="height:48px;width:200px;background:rgba(255,255,255,0.2);margin-bottom:16px;"></div>
                        <div class="flex gap-3">
                            <div class="skeleton" style="height:36px;width:80px;background:rgba(255,255,255,0.2);border-radius:8px;"></div>
                            <div class="skeleton" style="height:36px;width:80px;background:rgba(255,255,255,0.2);border-radius:8px;"></div>
                        </div>
                    </div>
                    <div class="stats-row">
                        <div class="skeleton" style="height:100px;"></div>
                        <div class="skeleton" style="height:100px;"></div>
                    </div>
                </div>
            </div>
        `;

        router.reinjectNavigation();
        await this.loadData();
        setTimeout(() => HomePage.calculateDaysRemaining(), 200);
    }

    async loadData() {
        try {
            const [profile, earnings, task] = await Promise.all([
                API.get('/auth/profile'),
                API.get('/tasks/earnings'),
                API.get('/tasks/today')
            ]);

            const user = profile.data;
            const earn = earnings.data;
            const todayTask = task.data;

            document.getElementById('homeContent').innerHTML = `
                <!-- Balance Hero Card -->
                <div class="balance-hero animate-fadeInUp">
                    <div class="balance-hero-label">Total Balance</div>
                    <div class="balance-hero-amount">${this.formatETB(user.balance)} ETB</div>
                    ${user.active_package ? `
                        <div class="package-expiry-info mt-3">
                            <div class="flex items-center gap-2 mb-2">
                                <span class="badge badge-success">
                                    <span class="pulse-dot"></span> ${user.active_package} Active
                                </span>
                            </div>
                            ${user.package_expiry ? `
                                <div class="expiry-timer" data-expiry="${user.package_expiry}">
                                    <div class="flex items-center gap-2 text-xs" style="color: rgba(255,255,255,0.9);">
                                        <span>⏳</span>
                                        <span id="daysRemaining">Calculating...</span>
                                    </div>
                                    <div class="progress-bar mt-1" style="height:4px; background:rgba(255,255,255,0.2);">
                                        <div id="expiryProgress" class="progress-fill" style="width:100%; background: rgba(255,255,255,0.8);"></div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    ` : `
                        <div class="mt-3">
                            <span class="badge badge-warning">⚠️ No Active Package</span>
                        </div>
                    `}
                    <div class="balance-hero-actions">
                        <button class="btn btn-white btn-sm" onclick="router.navigate('/deposit')">
                            💳 Deposit
                        </button>
                        <button class="btn btn-outline-white btn-sm" onclick="router.navigate('/withdraw')">
                            💸 Withdraw
                        </button>
                    </div>
                </div>

                <!-- Stats Row -->
                <div class="stats-row">
                    <div class="stat-card-home animate-fadeInUp stagger-1" onclick="router.navigate('/tasks')">
                        <div class="stat-card-icon tasks">✅</div>
                        <div class="stat-card-label">Tasks Today</div>
                        <div class="stat-card-value">${todayTask?.tasks_completed || 0}/${todayTask?.tasks_allocated || 0}</div>
                        <div class="stat-card-sub">${this.formatETB(todayTask?.earned || 0)} ETB earned</div>
                    </div>
                    <div class="stat-card-home animate-fadeInUp stagger-2" onclick="router.navigate('/earnings')">
                        <div class="stat-card-icon earnings">💰</div>
                        <div class="stat-card-label">Today's Earnings</div>
                        <div class="stat-card-value text-success">${this.formatETB(earn.todayEarnings)}</div>
                        <div class="stat-card-sub">ETB</div>
                    </div>
                </div>

                <!-- Quick Actions Grid -->
                <div class="quick-actions-grid animate-fadeInUp stagger-3">
                    <div class="quick-action-item" onclick="router.navigate('/tasks')">
                        <div class="quick-action-icon tasks">✅</div>
                        <span class="quick-action-label">Tasks</span>
                    </div>
                    <div class="quick-action-item" onclick="router.navigate('/team')">
                        <div class="quick-action-icon team">👥</div>
                        <span class="quick-action-label">Team</span>
                    </div>
                    <div class="quick-action-item" onclick="router.navigate('/packages')">
                        <div class="quick-action-icon packages">💎</div>
                        <span class="quick-action-label">Packages</span>
                    </div>
                    <div class="quick-action-item" onclick="router.navigate('/leaderboard')">
                        <div class="quick-action-icon" style="background: #FFF8E1;">🏆</div>
                        <span class="quick-action-label">Ranks</span>
                    </div>
                    <!-- FUTURE: Add more quick actions here -->
                    <!-- <div class="quick-action-item" onclick="router.navigate('/giftcode')">
                        <div class="quick-action-icon" style="background: #FFF0F6;">🎁</div>
                        <span class="quick-action-label">Gifts</span>
                    </div> -->
                </div>

                <!-- Earnings Summary -->
                <div class="summary-card animate-fadeInUp stagger-4">
                    <div class="summary-card-header">📊 Earnings Summary</div>
                    <div class="summary-card-body">
                        <div class="summary-row">
                            <span class="summary-label">Yesterday</span>
                            <span class="summary-value">${this.formatETB(earn.yesterdayEarnings)} ETB</span>
                        </div>
                        <div class="summary-row">
                            <span class="summary-label">This Week</span>
                            <span class="summary-value">${this.formatETB(earn.weekEarnings)} ETB</span>
                        </div>
                        <div class="summary-row">
                            <span class="summary-label">This Month</span>
                            <span class="summary-value">${this.formatETB(earn.monthEarnings)} ETB</span>
                        </div>
                        <div class="summary-row">
                            <span class="summary-label">Total Earned</span>
                            <span class="summary-value highlight">${this.formatETB(earn.totalEarned)} ETB</span>
                        </div>
                        <!-- FUTURE: Add more earning stats -->
                        <!-- <div class="summary-row">
                            <span class="summary-label">Manager Salary</span>
                            <span class="summary-value highlight">0 ETB</span>
                        </div> -->
                    </div>
                </div>

                <!-- Commissions Summary -->
                <div class="summary-card animate-fadeInUp stagger-5">
                    <div class="summary-card-header">💎 Commissions</div>
                    <div class="summary-card-body">
                        <div class="summary-row">
                            <span class="summary-label">Referral Commissions</span>
                            <span class="summary-value highlight">${this.formatETB(earn.referralCommissions)} ETB</span>
                        </div>
                        <div class="summary-row">
                            <span class="summary-label">Task Commissions</span>
                            <span class="summary-value highlight">${this.formatETB(earn.taskCommissions)} ETB</span>
                        </div>
                        <div class="summary-row">
                            <span class="summary-label">Total Deposited</span>
                            <span class="summary-value">${this.formatETB(earn.totalDeposited)} ETB</span>
                        </div>
                    </div>
                </div>

                <!-- FUTURE: Recent Activity Feed -->
                <!-- <div class="summary-card animate-fadeInUp stagger-6">
                    <div class="summary-card-header">🔄 Recent Activity</div>
                    <div class="summary-card-body" id="recentActivity">
                        <p class="text-center text-secondary py-3">Loading...</p>
                    </div>
                </div> -->

                <!-- FUTURE: Announcements Section -->
                <!-- <div class="card mt-4">
                    <h4 class="mb-3">📢 Announcements</h4>
                    <div id="announcements">
                        <p class="text-center text-secondary py-3">No announcements</p>
                    </div>
                </div> -->
            `;
        } catch (error) {
            document.getElementById('homeContent').innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <h3 class="empty-state-title">Failed to load</h3>
                    <p class="empty-state-description">${error.message}</p>
                    <button class="btn btn-primary" onclick="router.navigate('/home')">Retry</button>
                </div>
            `;
        }
    }

    static calculateDaysRemaining() {
        const expiryEl = document.querySelector('[data-expiry]');
        if (!expiryEl) return;
        
        const expiryDate = new Date(expiryEl.dataset.expiry);
        const now = new Date();
        const diffTime = expiryDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const daysEl = document.getElementById('daysRemaining');
        const progressEl = document.getElementById('expiryProgress');
        
        if (daysEl) {
            if (diffDays > 30) {
                daysEl.textContent = '30+ days remaining';
            } else if (diffDays > 0) {
                daysEl.textContent = `${diffDays} day${diffDays > 1 ? 's' : ''} remaining`;
            } else if (diffDays === 0) {
                daysEl.textContent = '⚠️ Expires today!';
            } else {
                daysEl.textContent = '❌ Expired';
            }
        }
        
        if (progressEl) {
            const totalDays = 30;
            const percentLeft = Math.max(0, Math.min(100, (diffDays / totalDays) * 100));
            progressEl.style.width = `${percentLeft}%`;
            
            if (diffDays <= 1) {
                progressEl.style.background = '#EF4444';
            } else if (diffDays <= 5) {
                progressEl.style.background = '#F59E0B';
            } else {
                progressEl.style.background = 'rgba(255,255,255,0.8)';
            }
        }
    }

    // FUTURE: Load recent activity
    // static async loadRecentActivity() {
    //     const data = await API.get('/transactions?limit=5');
    //     // Render recent transactions
    // }

    // FUTURE: Load announcements
    // static async loadAnnouncements() {
    //     const data = await API.get('/broadcasts');
    //     // Render announcements
    // }

    formatETB(amount) {
        return Number(amount || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    unmount() {}
}