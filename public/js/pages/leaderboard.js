class LeaderboardPage {
    constructor(container) {
        this.container = container;
        this.currentTab = 'earners';
        this.currentPeriod = 'weekly';
    }

    async render() {
        Navbar.render('Leaderboard', false, []);
        BottomNav.render('/leaderboard');
        DesktopSidebar.render('/leaderboard');

        this.container.innerHTML = `
            <div class="page">
                <div id="leaderboardContent">
                    <div class="loader"><div class="spinner"></div></div>
                </div>
            </div>
        `;

        router.reinjectNavigation();
        await this.loadLeaderboard();
    }

    async loadLeaderboard() {
        try {
            const endpoint = this.currentTab === 'earners' ? 'earners' : 'recruiters';
            const data = await API.get(`/leaderboard/${endpoint}?period=${this.currentPeriod}&limit=20`);
            const leaders = data.data || [];

            document.getElementById('leaderboardContent').innerHTML = `
                <div class="card card-gradient text-center mb-4">
                    <div class="text-4xl mb-2">🏆</div>
                    <h3>Leaderboard</h3>
                    <p class="text-sm text-secondary">Top performers this ${this.currentPeriod}</p>
                </div>

                <div class="filter-tabs mb-3">
                    <button class="filter-tab ${this.currentTab === 'earners' ? 'active' : ''}" 
                            onclick="LeaderboardPage.switchTab('earners')">💰 Earners</button>
                    <button class="filter-tab ${this.currentTab === 'recruiters' ? 'active' : ''}" 
                            onclick="LeaderboardPage.switchTab('recruiters')">👥 Recruiters</button>
                </div>

                <div class="filter-tabs mb-4">
                    <button class="filter-tab ${this.currentPeriod === 'weekly' ? 'active' : ''}" 
                            onclick="LeaderboardPage.switchPeriod('weekly')">Weekly</button>
                    <button class="filter-tab ${this.currentPeriod === 'monthly' ? 'active' : ''}" 
                            onclick="LeaderboardPage.switchPeriod('monthly')">Monthly</button>
                </div>

                <div id="leadersList">
                    ${leaders.length > 0 ? leaders.map((leader, i) => `
                        <div class="leaderboard-item animate-fadeInUp" style="animation-delay:${i * 0.04}s">
                            <div class="rank-badge rank-${leader.rank}">
                                ${leader.rank <= 3 ? ['🥇', '🥈', '🥉'][leader.rank - 1] : `#${leader.rank}`}
                            </div>
                            <div class="leader-info">
                                <div class="leader-phone">${leader.phone}</div>
                                <div class="leader-details">
                                    ${leader.active_package ? `<span class="badge badge-success badge-sm">${leader.active_package}</span>` : ''}
                                    ${leader.team_size ? `<span class="badge badge-primary badge-sm ml-1">👥 ${leader.team_size}</span>` : ''}
                                </div>
                            </div>
                            <div class="leader-earnings text-right">
                                <div class="font-bold text-success">
                                    ${this.currentTab === 'earners' 
                                        ? `${this.formatETB(leader.period_earnings)} ETB`
                                        : `${leader.new_referrals || 0} new refs`}
                                </div>
                                <div class="text-xs text-muted">${this.currentTab === 'earners' ? 'earned' : 'this period'}</div>
                            </div>
                        </div>
                    `).join('') : `
                        <div class="empty-state">
                            <p class="text-secondary">No data yet for this period</p>
                        </div>
                    `}
                </div>
            `;
        } catch (error) {
            document.getElementById('leaderboardContent').innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <h3>Failed to load</h3>
                    <button class="btn btn-primary" onclick="router.navigate('/leaderboard')">Retry</button>
                </div>
            `;
        }
    }

    static switchTab(tab) {
        const instance = router.currentPage;
        instance.currentTab = tab;
        instance.render();
    }

    static switchPeriod(period) {
        const instance = router.currentPage;
        instance.currentPeriod = period;
        instance.render();
    }

    formatETB(amount) {
        return Number(amount || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        });
    }

    unmount() {}
}
