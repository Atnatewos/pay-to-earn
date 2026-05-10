// public/js/pages/home.js
class HomePage {
    constructor(container) {
        this.container = container;
    }

    async render() {
        Navbar.render((typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.name : 'Earn'), false, [
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
                <div id="stickyAlerts"></div>
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
        await this.loadStickyAlerts();
        setTimeout(() => HomePage.calculateDaysRemaining(), 200);
    }

    async loadStickyAlerts() {
        try {
            const token = localStorage.getItem('token');
            const apiUrl = APP_CONFIG.apiUrl;
            const response = await fetch(`${apiUrl}/alerts/sticky`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            
            if (result.success && result.data && result.data.length > 0) {
                const alertsContainer = document.getElementById('stickyAlerts');
                if (!alertsContainer) return;
                
                result.data.forEach(alert => {
                    const alertEl = document.createElement('div');
                    const bgColor = alert.color === 'color-danger' ? 'var(--color-danger-bg)' 
                        : alert.color === 'color-warning' ? 'var(--color-warning-bg)' 
                        : 'var(--color-info-bg)';
                    const borderColor = alert.color === 'color-danger' ? 'var(--color-danger)' 
                        : alert.color === 'color-warning' ? 'var(--color-warning)' 
                        : 'var(--color-info)';
                    
                    alertEl.style.cssText = `
                        background: ${bgColor};
                        border-left: 4px solid ${borderColor};
                        padding: 12px 16px;
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        margin-bottom: 8px;
                        border-radius: var(--radius-lg);
                        font-size: var(--font-sm);
                    `;
                    alertEl.innerHTML = `
                        <span style="font-size:24px;">${alert.icon}</span>
                        <div style="flex:1;">
                            <strong>${alert.title}</strong>
                            <div style="color:var(--color-text-secondary);">${alert.message}</div>
                        </div>
                        <button onclick="this.parentElement.remove(); fetch('${apiUrl}/alerts/${alert.id}/dismiss', {method:'POST', headers:{'Authorization':'Bearer ${token}'}});" 
                                style="font-size:20px;cursor:pointer;opacity:0.5;padding:4px 8px;">×</button>
                    `;
                    alertsContainer.appendChild(alertEl);
                });
            }
        } catch (error) {}
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
                <div class="balance-hero animate-fadeInUp">
                    <div class="balance-hero-label">Total Balance</div>
                    <div class="balance-hero-amount">${this.formatETB(user.balance)} ETB</div>
                    <div style="display:flex;gap:10px;margin-top:10px;">
                        <div style="flex:1;background:rgba(255,255,255,0.2);padding:8px 12px;border-radius:10px;">
                            <div style="font-size:10px;opacity:0.7;">💎 Capital</div>
                            <div style="font-weight:700;font-size:13px;">${this.formatETB(user.capital || 0)} ETB</div>
                        </div>
                        <div style="flex:1;background:rgba(255,255,255,0.2);padding:8px 12px;border-radius:10px;">
                            <div style="font-size:10px;opacity:0.7;">💰 Withdrawable</div>
                            <div style="font-weight:700;font-size:13px;">${this.formatETB(user.earnings_balance || 0)} ETB</div>
                        </div>
                    </div>

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
                        <button class="btn btn-white btn-sm" onclick="router.navigate('/deposit')">💳 Deposit</button>
                        <button class="btn btn-outline-white btn-sm" onclick="router.navigate('/withdraw')">💸 Withdraw</button>
                    </div>
                </div>

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
                </div>

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
                    </div>
                </div>

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
        const diffDays = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        const daysEl = document.getElementById('daysRemaining');
        const progressEl = document.getElementById('expiryProgress');
        if (daysEl) {
            if (diffDays > 30) daysEl.textContent = '30+ days remaining';
            else if (diffDays > 0) daysEl.textContent = `${diffDays} day${diffDays > 1 ? 's' : ''} remaining`;
            else if (diffDays === 0) daysEl.textContent = '⚠️ Expires today!';
            else daysEl.textContent = '❌ Expired';
        }
        if (progressEl) {
            const percentLeft = Math.max(0, Math.min(100, (diffDays / 30) * 100));
            progressEl.style.width = `${percentLeft}%`;
            if (diffDays <= 1) progressEl.style.background = '#EF4444';
            else if (diffDays <= 5) progressEl.style.background = '#F59E0B';
            else progressEl.style.background = 'rgba(255,255,255,0.8)';
        }
    }

    formatETB(amount) {
        const num = Number(amount || 0);
        if (!isFinite(num) || num > 999999999 || num < 0) return '0.00';
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    unmount() {}
}