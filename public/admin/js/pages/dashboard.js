class AdminDashboard {
    constructor(container) { this.container = container; }
    async render() {
        AdminSidebar.render('/admin/dashboard');
        try {
            const data = await AdminAPI.get('/dashboard');
            const s = data.data;
            this.container.innerHTML = '<div class="admin-main"><div class="admin-page-header"><h1 class="admin-page-title">Dashboard</h1><p class="admin-page-subtitle">Platform overview</p></div><div class="admin-stats animate-fadeInUp"><div class="admin-stat-card"><div class="admin-stat-icon">👥</div><div class="admin-stat-value">' + (s.total_users || 0) + '</div><div class="admin-stat-label">Total Users</div></div><div class="admin-stat-card"><div class="admin-stat-icon">🆕</div><div class="admin-stat-value">' + (s.new_users_24h || 0) + '</div><div class="admin-stat-label">New Today</div></div><div class="admin-stat-card"><div class="admin-stat-icon">💰</div><div class="admin-stat-value">' + Number(s.total_deposits || 0).toLocaleString() + '</div><div class="admin-stat-label">Total Deposits</div></div><div class="admin-stat-card"><div class="admin-stat-icon">⏳</div><div class="admin-stat-value">' + (s.pending_deposits || 0) + '</div><div class="admin-stat-label">Pending</div></div></div></div>';
        } catch (error) { this.container.innerHTML = '<div class="admin-main"><p>Failed to load</p></div>'; }
    }
    unmount() {}
}
