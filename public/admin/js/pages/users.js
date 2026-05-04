// public/admin/js/pages/users.js
class AdminUsers {
    constructor(container) {
        this.container = container;
        this.searchTerm = '';
        this.statusFilter = '';
        this.currentPage = 1;
    }

    async render() {
        AdminSidebar.render('/admin/users');

        this.container.innerHTML = `
            <div class="admin-main">
                <div class="admin-page-header">
                    <h1 class="admin-page-title">Users</h1>
                    <p class="admin-page-subtitle">Manage all platform users</p>
                </div>

                <div class="search-bar mb-4">
                    <input type="text" class="form-input" id="userSearch" 
                           placeholder="🔍 Search by name, phone or ID..." 
                           value="${this.searchTerm}"
                           onkeyup="AdminUsers.search(this.value)">
                    <select class="form-select" id="statusFilter" 
                            onchange="AdminUsers.filterStatus(this.value)">
                        <option value="">All Status</option>
                        <option value="active" ${this.statusFilter === 'active' ? 'selected' : ''}>Active</option>
                        <option value="suspended" ${this.statusFilter === 'suspended' ? 'selected' : ''}>Suspended</option>
                        <option value="banned" ${this.statusFilter === 'banned' ? 'selected' : ''}>Banned</option>
                    </select>
                </div>

                <div id="usersList">
                    <div class="loader"><div class="spinner"></div></div>
                </div>

                <div id="usersPagination" class="pagination mt-4"></div>
            </div>
        `;

        router.reinjectNavigation();
        this.loadUsers();
    }

    async loadUsers() {
        try {
            const token = localStorage.getItem('admin_token');
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: 20,
                search: this.searchTerm,
                status: this.statusFilter
            });

            const data = await fetch(`/api/admin/users?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => r.json());

            const users = data.data || [];
            const pagination = data.pagination || {};
            const list = document.getElementById('usersList');

            if (users.length === 0) {
                list.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">👻</div>
                        <h3 class="empty-state-title">No users found</h3>
                        <p class="empty-state-description">Try different search terms</p>
                    </div>
                `;
                return;
            }

            list.innerHTML = `
                <div class="admin-table">
                    <div class="admin-table-header" style="grid-template-columns: 50px 1fr 120px 100px 100px 80px 50px;">
                        <span>ID</span>
                        <span>Name / Phone</span>
                        <span>Package</span>
                        <span>Balance</span>
                        <span>Earned</span>
                        <span>Status</span>
                        <span></span>
                    </div>
                    ${users.map((u, i) => `
                        <div class="admin-table-row animate-fadeInUp" 
                             style="grid-template-columns: 50px 1fr 120px 100px 100px 80px 50px; animation-delay:${i * 0.03}s">
                            <span class="text-muted">#${u.id}</span>
                            <div>
                                <span class="font-medium">${u.full_name || 'N/A'}</span>
                                <div class="text-xs text-muted">${u.phone}</div>
                            </div>
                            <span>${u.active_package || 'None'}</span>
                            <span class="font-semibold">${Number(u.balance || 0).toLocaleString()}</span>
                            <span class="text-success">${Number(u.total_earned || 0).toLocaleString()}</span>
                            <span>
                                <span class="badge ${u.status === 'active' ? 'badge-success' : u.status === 'suspended' ? 'badge-warning' : 'badge-danger'}">
                                    ${u.status}
                                </span>
                            </span>
                            <button class="btn btn-ghost btn-sm" onclick="AdminUsers.viewUser(${u.id})" title="View">👁️</button>
                        </div>
                    `).join('')}
                </div>
            `;

            const pagEl = document.getElementById('usersPagination');
            if (pagination.pages > 1) {
                pagEl.innerHTML = `
                    <div class="flex justify-center gap-2">
                        <button class="btn btn-outline btn-sm" ${this.currentPage <= 1 ? 'disabled' : ''} 
                                onclick="AdminUsers.goToPage(${this.currentPage - 1})">← Prev</button>
                        <span class="px-4 py-2 text-sm text-secondary">Page ${this.currentPage} of ${pagination.pages}</span>
                        <button class="btn btn-outline btn-sm" ${this.currentPage >= pagination.pages ? 'disabled' : ''} 
                                onclick="AdminUsers.goToPage(${this.currentPage + 1})">Next →</button>
                    </div>
                `;
            }
        } catch (error) {
            document.getElementById('usersList').innerHTML = `
                <div class="empty-state">
                    <p>Failed to load users</p>
                    <button class="btn btn-primary" onclick="router.navigate('/admin/users')">Retry</button>
                </div>
            `;
        }
    }

    static search(term) {
        const instance = router.currentAdminPage;
        instance.searchTerm = term;
        instance.currentPage = 1;
        clearTimeout(instance._searchTimeout);
        instance._searchTimeout = setTimeout(() => instance.loadUsers(), 300);
    }

    static filterStatus(status) {
        const instance = router.currentAdminPage;
        instance.statusFilter = status;
        instance.currentPage = 1;
        instance.loadUsers();
    }

    static goToPage(page) {
        const instance = router.currentAdminPage;
        instance.currentPage = page;
        instance.loadUsers();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    static async viewUser(userId) {
        const token = localStorage.getItem('admin_token');
        try {
            const data = await fetch(`/api/admin/users/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => r.json());

            const u = data.data;
            
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal animate-slideUp" style="max-width:500px">
                    <div class="modal-header">
                        <h3 class="modal-title">User Details</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                    </div>
                    <div class="card-glass p-4 mb-3 text-center">
                        <div class="profile-avatar" style="margin:0 auto">${u.avatar_url || '👤'}</div>
                        <h4 class="mt-2">${u.full_name || 'N/A'}</h4>
                        <p class="text-secondary">${u.phone}</p>
                        <span class="badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}">${u.status}</span>
                        ${u.active_package ? `<span class="badge badge-primary ml-1">${u.active_package}</span>` : ''}
                    </div>
                    <div class="bank-info-card mb-3">
                        <div class="bank-info-row"><span class="bank-info-label">User ID</span><span class="bank-info-value">#${u.id}</span></div>
                        <div class="bank-info-row"><span class="bank-info-label">Balance</span><span class="bank-info-value font-bold">${Number(u.balance).toLocaleString()} ETB</span></div>
                        <div class="bank-info-row"><span class="bank-info-label">Total Earned</span><span class="bank-info-value">${Number(u.total_earned).toLocaleString()} ETB</span></div>
                        <div class="bank-info-row"><span class="bank-info-label">Total Deposited</span><span class="bank-info-value">${Number(u.total_deposited).toLocaleString()} ETB</span></div>
                        <div class="bank-info-row"><span class="bank-info-label">Referral Code</span><span class="bank-info-value">${u.referral_code}</span></div>
                        <div class="bank-info-row"><span class="bank-info-label">Joined</span><span class="bank-info-value">${new Date(u.created_at).toLocaleDateString()}</span></div>
                    </div>
                    <div class="flex gap-2">
                        ${u.status === 'active' ? `
                            <button class="btn btn-warning btn-block" onclick="AdminUsers.suspendUser(${u.id})">⏸️ Suspend</button>
                            <button class="btn btn-danger btn-block" onclick="AdminUsers.banUser(${u.id})">🚫 Ban</button>
                        ` : `
                            <button class="btn btn-success btn-block" onclick="AdminUsers.activateUser(${u.id})">✅ Activate</button>
                        `}
                    </div>
                </div>
            `;

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.remove();
            });

            document.body.appendChild(overlay);
        } catch (error) {
            await Dialog.alert('Failed to load user details', 'Error', 'error');
        }
    }

    static async suspendUser(userId) {
        const confirmed = await Dialog.confirm('Suspend this user? They will not be able to access their account.', 'Suspend User', '⏸️ Suspend', 'Cancel', 'warning');
        if (!confirmed) return;
        const token = localStorage.getItem('admin_token');
        await fetch(`/api/admin/users/${userId}/suspend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ action: 'suspend', reason: 'Admin action' })
        });
        document.querySelector('.modal-overlay')?.remove();
        router.navigate('/admin/users');
    }

    static async banUser(userId) {
        const confirmed = await Dialog.confirm('Ban this user permanently? This action cannot be easily undone.', 'Ban User', '🚫 Ban Permanently', 'Cancel', 'danger');
        if (!confirmed) return;
        const token = localStorage.getItem('admin_token');
        await fetch(`/api/admin/users/${userId}/suspend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ action: 'ban', reason: 'Admin action' })
        });
        document.querySelector('.modal-overlay')?.remove();
        router.navigate('/admin/users');
    }

    static async activateUser(userId) {
        const confirmed = await Dialog.confirm('Activate this user? They will regain full access.', 'Activate User', '✅ Activate', 'Cancel');
        if (!confirmed) return;
        const token = localStorage.getItem('admin_token');
        await fetch(`/api/admin/users/${userId}/activate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        });
        document.querySelector('.modal-overlay')?.remove();
        router.navigate('/admin/users');
    }

    unmount() {}
}