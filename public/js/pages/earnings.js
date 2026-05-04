// public/js/pages/earnings.js
class EarningsPage {
    constructor(container) {
        this.container = container;
        this.currentTab = 'overview';
    }

    async render() {
        Navbar.render('Earnings', false, []);
        BottomNav.render('/earnings');

        this.container.innerHTML = `
            <div class="page">
                <div id="earningsContent">
                    <div class="loader"><div class="spinner"></div></div>
                </div>
            </div>
        `;

        router.reinjectNavigation();
        await this.loadEarnings();
    }

    async loadEarnings() {
        try {
            const [earnings, transactions, commissions] = await Promise.all([
                API.get('/tasks/earnings'),
                API.get('/transactions?limit=50'),
                API.get('/commissions/breakdown')
            ]);

            const e = earnings.data;
            const txns = transactions.data.transactions || [];
            const comms = commissions.data || [];

            document.getElementById('earningsContent').innerHTML = `
                <!-- Balance Hero -->
                <div class="card card-gradient text-center mb-4">
                    <div class="text-sm text-secondary mb-1">Available Balance</div>
                    <div class="text-5xl font-extrabold" style="background: var(--gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                        ${this.formatETB(e.balance)} ETB
                    </div>
                    <div class="flex justify-center gap-3 mt-3">
                        <button class="btn btn-primary btn-sm" onclick="router.navigate('/deposit')">💳 Deposit</button>
                        <button class="btn btn-outline btn-sm" onclick="router.navigate('/withdraw')">💸 Withdraw</button>
                    </div>
                </div>

                <!-- Earnings Stats -->
                <div class="grid grid-cols-2 gap-3 mb-4">
                    <div class="card text-center">
                        <div class="text-lg font-bold text-success">${this.formatETB(e.todayEarnings)}</div>
                        <div class="text-xs text-secondary">Today</div>
                    </div>
                    <div class="card text-center">
                        <div class="text-lg font-bold">${this.formatETB(e.monthEarnings)}</div>
                        <div class="text-xs text-secondary">This Month</div>
                    </div>
                    <div class="card text-center">
                        <div class="text-lg font-bold">${this.formatETB(e.totalEarned)}</div>
                        <div class="text-xs text-secondary">Total Earned</div>
                    </div>
                    <div class="card text-center">
                        <div class="text-lg font-bold">${this.formatETB(e.totalDeposited)}</div>
                        <div class="text-xs text-secondary">Total Deposited</div>
                    </div>
                </div>

                <!-- Tab Navigation -->
                <div class="filter-tabs mb-4">
                    <button class="filter-tab ${this.currentTab === 'overview' ? 'active' : ''}" 
                            onclick="EarningsPage.switchTab('overview')">📊 Overview</button>
                    <button class="filter-tab ${this.currentTab === 'commissions' ? 'active' : ''}" 
                            onclick="EarningsPage.switchTab('commissions')">💎 Commissions</button>
                    <button class="filter-tab ${this.currentTab === 'transactions' ? 'active' : ''}" 
                            onclick="EarningsPage.switchTab('transactions')">📄 History</button>
                </div>

                <div id="tabContent"></div>
            `;

            this.renderTabContent(e, comms, txns);
        } catch (error) {
            document.getElementById('earningsContent').innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <h3>Failed to load</h3>
                    <button class="btn btn-primary" onclick="router.navigate('/earnings')">Retry</button>
                </div>
            `;
        }
    }

    renderTabContent(e, comms, txns) {
        const content = document.getElementById('tabContent');

        if (this.currentTab === 'overview') {
            content.innerHTML = `
                <div class="card mb-4">
                    <h4 class="mb-3">💰 Commission Earnings</h4>
                    <div class="flex justify-between py-2">
                        <span class="text-secondary">Task Commissions</span>
                        <span class="font-semibold text-success">+${this.formatETB(e.taskCommissions)} ETB</span>
                    </div>
                    <div class="flex justify-between py-2">
                        <span class="text-secondary">Referral Commissions</span>
                        <span class="font-semibold text-success">+${this.formatETB(e.referralCommissions)} ETB</span>
                    </div>
                    <hr class="divider">
                    <div class="flex justify-between py-2">
                        <span class="font-bold">Total Commissions</span>
                        <span class="font-extrabold text-success">${this.formatETB(e.totalCommissions)} ETB</span>
                    </div>
                </div>
            `;
        } else if (this.currentTab === 'commissions') {
            content.innerHTML = comms.length > 0 ? comms.map((c, i) => `
                <div class="card mb-2 animate-fadeInUp" style="animation-delay:${i * 0.03}s">
                    <div class="flex justify-between items-center">
                        <div>
                            <div class="font-medium">${c.type === 'referral' ? '🎁 Referral' : '✅ Task'} Commission</div>
                            <div class="text-xs text-secondary">
                                From: ${c.from_phone} • Level ${c.level} • ${new Date(c.created_at).toLocaleDateString()}
                            </div>
                        </div>
                        <span class="font-bold text-success">+${this.formatETB(c.amount)} ETB</span>
                    </div>
                </div>
            `).join('') : '<p class="text-center text-secondary py-4">No commissions yet</p>';
        } else if (this.currentTab === 'transactions') {
            content.innerHTML = txns.length > 0 ? txns.map((tx, i) => `
                <div class="list-item animate-fadeInUp" style="animation-delay:${i * 0.02}s">
                    <div class="list-item-icon" style="background: ${tx.type === 'credit' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)'}">
                        ${tx.type === 'credit' ? '↓' : '↑'}
                    </div>
                    <div class="list-item-content">
                        <div class="list-item-title">${tx.category.replace(/_/g, ' ')}</div>
                        <div class="list-item-subtitle">${new Date(tx.created_at).toLocaleString()}</div>
                    </div>
                    <div class="list-item-trailing">
                        <span class="font-semibold ${tx.type === 'credit' ? 'text-success' : 'text-danger'}">
                            ${tx.type === 'credit' ? '+' : '-'}${this.formatETB(tx.amount)} ETB
                        </span>
                    </div>
                </div>
            `).join('') : '<p class="text-center text-secondary py-4">No transactions yet</p>';
        }
    }

    static switchTab(tab) {
        const instance = router.currentPage;
        instance.currentTab = tab;
        instance.render();
    }

    formatETB(amount) {
        return Number(amount || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    unmount() {}
}