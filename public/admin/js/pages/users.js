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
                    <input type="text" class="form-input" id="userSearch" placeholder="🔍 Search by name or phone..." value="${this.searchTerm}" onkeyup="AdminUsers.search(this.value)">
                    <select class="form-select" id="statusFilter" onchange="AdminUsers.filterStatus(this.value)">
                        <option value="">All Status</option>
                        <option value="active" ${this.statusFilter==='active'?'selected':''}>Active</option>
                        <option value="suspended" ${this.statusFilter==='suspended'?'selected':''}>Suspended</option>
                        <option value="banned" ${this.statusFilter==='banned'?'selected':''}>Banned</option>
                    </select>
                </div>
                <div id="usersList"><div class="loader"><div class="spinner"></div></div></div>
                <div id="usersPagination" class="pagination mt-4"></div>
            </div>
        `;
        router.reinjectNavigation();
        this.loadUsers();
    }

    async loadUsers() {
        try {
            const params = new URLSearchParams({ page: this.currentPage, limit: 20, search: this.searchTerm, status: this.statusFilter });
            const data = await AdminAPI.get(`/users?${params}`);
            const users = data.data || [];
            const pagination = data.pagination || {};
            const list = document.getElementById('usersList');

            if (users.length === 0) {
                list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">👻</div><h3>No users found</h3></div>`;
                return;
            }

            list.innerHTML = `
                <div class="admin-table">
                    <div class="admin-table-header" style="grid-template-columns:50px 1fr 100px 100px 80px 50px;">
                        <span>ID</span><span>Name / Phone</span><span>Package</span><span>Balance</span><span>Status</span><span></span>
                    </div>
                    ${users.map((u, i) => `
                        <div class="admin-table-row" style="grid-template-columns:50px 1fr 100px 100px 80px 50px;">
                            <span class="text-muted">#${u.id}</span>
                            <div><span class="font-medium">${u.full_name || 'N/A'}</span><div class="text-xs text-muted">${u.phone}</div></div>
                            <span>${u.active_package || 'None'}</span>
                            <span class="font-semibold">${Number(u.balance||0).toLocaleString()}</span>
                            <span class="badge ${u.status==='active'?'badge-success':u.status==='suspended'?'badge-warning':'badge-danger'}">${u.status}</span>
                            <button class="btn btn-ghost btn-sm" onclick="AdminUsers.viewUser(${u.id})">👁️</button>
                        </div>
                    `).join('')}
                </div>
            `;

            if (pagination.pages > 1) {
                document.getElementById('usersPagination').innerHTML = `
                    <div class="flex justify-center gap-2">
                        <button class="btn btn-outline btn-sm" ${this.currentPage<=1?'disabled':''} onclick="AdminUsers.goToPage(${this.currentPage-1})">←</button>
                        <span class="px-4 py-2 text-sm">Page ${this.currentPage} of ${pagination.pages}</span>
                        <button class="btn btn-outline btn-sm" ${this.currentPage>=pagination.pages?'disabled':''} onclick="AdminUsers.goToPage(${this.currentPage+1})">→</button>
                    </div>
                `;
            }
        } catch (error) {
            document.getElementById('usersList').innerHTML = '<div class="empty-state"><p>Failed to load</p></div>';
        }
    }

    static search(term) { const i = router.currentAdminPage; i.searchTerm = term; i.currentPage = 1; clearTimeout(i._t); i._t = setTimeout(() => i.loadUsers(), 300); }
    static filterStatus(s) { const i = router.currentAdminPage; i.statusFilter = s; i.currentPage = 1; i.loadUsers(); }
    static goToPage(p) { const i = router.currentAdminPage; i.currentPage = p; i.loadUsers(); window.scrollTo(0,0); }

    static async viewUser(userId) {
        const data = await AdminAPI.get(`/users/${userId}`);
        const u = data.data;
        const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal" style="max-width:500px">
                <div class="modal-header"><h3>${u.full_name || u.phone}</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button></div>
                <div class="bank-info-card mb-3">
                    <div class="bank-info-row"><span>Phone</span><span>${u.phone}</span></div>
                    <div class="bank-info-row"><span>Balance</span><span class="font-bold">${Number(u.balance).toLocaleString()} ETB</span></div>
                    <div class="bank-info-row"><span>Package</span><span>${u.active_package||'None'}</span></div>
                    <div class="bank-info-row"><span>Status</span><span class="badge ${u.status==='active'?'badge-success':'badge-danger'}">${u.status}</span></div>
                </div>
                <div class="flex gap-2">
                    ${u.status==='active' ? `
                        <button class="btn btn-warning btn-block" onclick="AdminUsers.suspendUser(${u.id})">Suspend</button>
                        <button class="btn btn-danger btn-block" onclick="AdminUsers.banUser(${u.id})">Ban</button>
                    ` : `<button class="btn btn-success btn-block" onclick="AdminUsers.activateUser(${u.id})">Activate</button>`}
                </div>
            </div>
        `;
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
        document.body.appendChild(overlay);
    }

    static async suspendUser(id) { const c = await Dialog.confirm('Suspend this user?', 'Confirm', 'Suspend', 'Cancel'); if (!c) return; await AdminAPI.post(`/users/${id}/suspend`, { action: 'suspend' }); document.querySelector('.modal-overlay')?.remove(); router.navigate('/admin/users'); }
    static async banUser(id) { const c = await Dialog.confirm('Ban permanently?', 'Confirm', 'Ban', 'Cancel', 'danger'); if (!c) return; await AdminAPI.post(`/users/${id}/suspend`, { action: 'ban' }); document.querySelector('.modal-overlay')?.remove(); router.navigate('/admin/users'); }
    static async activateUser(id) { await AdminAPI.post(`/users/${id}/activate`); document.querySelector('.modal-overlay')?.remove(); router.navigate('/admin/users'); }

    unmount() {}
}