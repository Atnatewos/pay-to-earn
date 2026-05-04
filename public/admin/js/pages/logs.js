// public/admin/js/pages/logs.js
class AdminLogs {
    constructor(container) {
        this.container = container;
        this.currentPage = 1;
        this.filterAdmin = '';
        this.filterAction = '';
    }

    async render() {
        AdminSidebar.render('/admin/logs');

        this.container.innerHTML = `
            <div class="admin-main">
                <div class="admin-page-header">
                    <h1 class="admin-page-title">Activity Logs</h1>
                    <p class="admin-page-subtitle">Audit trail of all admin actions</p>
                </div>

                <div class="admin-breadcrumb-placeholder"></div>

                <div class="search-bar mb-4">
                    <select class="form-select" id="actionFilter" onchange="AdminLogs.filterAction(this.value)">
                        <option value="">All Actions</option>
                        <option value="login">Login</option>
                        <option value="admin_created">Admin Created</option>
                        <option value="deposit_verified">Deposit Verified</option>
                        <option value="deposit_rejected">Deposit Rejected</option>
                        <option value="withdrawal_processed">Withdrawal Processed</option>
                        <option value="broadcast">Broadcast Sent</option>
                        <option value="feature_toggle">Feature Toggled</option>
                        <option value="user_suspended">User Suspended</option>
                        <option value="user_banned">User Banned</option>
                    </select>
                    <input type="date" class="form-input" id="dateFilter" onchange="AdminLogs.filterDate(this.value)">
                </div>

                <div id="logsList">
                    <div class="loader"><div class="spinner"></div></div>
                </div>

                <div id="logsPagination" class="pagination mt-4"></div>
            </div>
        `;

        this.loadLogs();
    }

    async loadLogs() {
        try {
            const token = localStorage.getItem('admin_token');
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: 30
            });
            if (this.filterAction) params.append('action', this.filterAction);

            const data = await fetch(`/api/admin/logs?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => r.json());

            const logs = data.data || [];
            const list = document.getElementById('logsList');

            if (logs.length === 0) {
                list.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📭</div>
                        <h3 class="empty-state-title">No logs found</h3>
                        <p class="empty-state-description">Activity will appear here</p>
                    </div>
                `;
                return;
            }

            const actionColors = {
                'login': 'badge-info',
                'admin_created': 'badge-primary',
                'deposit_verified': 'badge-success',
                'deposit_rejected': 'badge-danger',
                'withdrawal_processed': 'badge-success',
                'broadcast': 'badge-primary',
                'feature_toggle': 'badge-warning',
                'user_suspended': 'badge-warning',
                'user_banned': 'badge-danger'
            };

            list.innerHTML = `
                <div class="admin-table">
                    <div class="admin-table-header" style="grid-template-columns: 160px 180px 1fr 120px 160px;">
                        <span>Date/Time</span>
                        <span>Admin</span>
                        <span>Action</span>
                        <span>Details</span>
                        <span>IP Address</span>
                    </div>
                    ${logs.map((log, i) => `
                        <div class="admin-table-row animate-fadeInUp" 
                             style="grid-template-columns: 160px 180px 1fr 120px 160px; animation-delay:${i * 0.02}s">
                            <span class="text-xs">${new Date(log.created_at).toLocaleString()}</span>
                            <span class="font-medium">👤 ${log.username}</span>
                            <span>
                                <span class="badge ${actionColors[log.action] || 'badge-info'}">${log.action.replace(/_/g, ' ')}</span>
                            </span>
                            <span class="text-xs text-secondary">${log.details ? JSON.stringify(log.details).substring(0, 40) : '-'}</span>
                            <span class="text-xs text-muted">${log.ip_address || 'N/A'}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            document.getElementById('logsList').innerHTML = `
                <div class="empty-state">
                    <p>Failed to load logs</p>
                    <button class="btn btn-primary" onclick="router.navigate('/admin/logs')">Retry</button>
                </div>
            `;
        }
    }

    static filterAction(action) {
        const instance = router.currentAdminPage;
        instance.filterAction = action;
        instance.currentPage = 1;
        instance.loadLogs();
    }

    static filterDate(date) {
        // Implement date filtering
        const instance = router.currentAdminPage;
        instance.loadLogs();
    }

    unmount() {}
}