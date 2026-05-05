// public/admin/js/pages/users.js
class AdminUsers {
    constructor(container) {
        this.container = container;
        this.searchTerm = '';
        this.statusFilter = '';
        this.currentPage = 1;
    }

    render() {
        AdminSidebar.render('/admin/users');
        this.container.innerHTML = `
            <div class="admin-main">
                <div class="admin-page-header">
                    <h1 class="admin-page-title">Users</h1>
                    <p class="admin-page-subtitle">Manage platform users</p>
                </div>
                <div class="search-bar mb-4">
                    <input type="text" class="form-input" id="userSearch" placeholder="Search..." value="${this.searchTerm}" onkeyup="AdminUsers.doSearch(this.value)">
                    <select class="form-select" id="statusFilter" onchange="AdminUsers.doFilter(this.value)">
                        <option value="">All</option>
                        <option value="active" ${this.statusFilter==='active'?'selected':''}>Active</option>
                        <option value="suspended" ${this.statusFilter==='suspended'?'selected':''}>Suspended</option>
                        <option value="banned" ${this.statusFilter==='banned'?'selected':''}>Banned</option>
                    </select>
                </div>
                <div id="usersList"></div>
                <div id="usersPagination" class="pagination mt-4"></div>
            </div>
        `;
        router.reinjectNavigation();
        setTimeout(() => this.loadUsers(), 100);
    }

    async loadUsers() {
        const list = document.getElementById('usersList');
        if (!list) return;
        list.innerHTML = '<div class="loader"><div class="spinner"></div></div>';

        try {
            const token = localStorage.getItem('admin_token');
            const apiUrl = APP_CONFIG.apiUrl;
            const params = new URLSearchParams({ page: this.currentPage, limit: 20, search: this.searchTerm, status: this.statusFilter });
            const response = await fetch(`${apiUrl}/admin/users?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            const users = result.data || [];

            if (users.length === 0) {
                list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👻</div><h3>No users found</h3></div>';
                return;
            }

            list.innerHTML = `
                <div class="admin-table">
                    <div class="admin-table-header" style="grid-template-columns:50px 1fr 100px 100px 80px 80px;">
                        <span>ID</span><span>Name/Phone</span><span>Package</span><span>Balance</span><span>Status</span><span></span>
                    </div>
                    ${users.map(u => `
                        <div class="admin-table-row" style="grid-template-columns:50px 1fr 100px 100px 80px 80px;">
                            <span class="text-muted">#${u.id}</span>
                            <div><span class="font-medium">${u.full_name||'N/A'}</span><div class="text-xs text-muted">${u.phone}</div></div>
                            <span>${u.active_package||'None'}</span>
                            <span class="font-semibold">${Number(u.balance||0).toLocaleString()}</span>
                            <span class="badge ${u.status==='active'?'badge-success':u.status==='suspended'?'badge-warning':'badge-danger'}">${u.status}</span>
                            <button class="btn btn-ghost btn-sm" onclick="AdminUsers.viewUser(${u.id})">👁️</button>
                        </div>
                    `).join('')}
                </div>
            `;

            const pag = result.pagination || {};
            if (pag.pages > 1) {
                document.getElementById('usersPagination').innerHTML = `
                    <div class="flex justify-center gap-2">
                        <button class="btn btn-outline btn-sm" ${this.currentPage<=1?'disabled':''} onclick="AdminUsers.goPage(${this.currentPage-1})">←</button>
                        <span class="px-4 py-2 text-sm">${this.currentPage}/${pag.pages}</span>
                        <button class="btn btn-outline btn-sm" ${this.currentPage>=pag.pages?'disabled':''} onclick="AdminUsers.goPage(${this.currentPage+1})">→</button>
                    </div>
                `;
            }
        } catch (error) {
            list.innerHTML = '<div class="empty-state"><p>Failed to load</p><button class="btn btn-primary" onclick="AdminUsers.loadUsers()">Retry</button></div>';
        }
    }

    static doSearch(term) { const i = router.currentAdminPage; i.searchTerm = term; i.currentPage = 1; clearTimeout(i._t); i._t = setTimeout(() => i.loadUsers(), 300); }
    static doFilter(status) { const i = router.currentAdminPage; i.statusFilter = status; i.currentPage = 1; i.loadUsers(); }
    static goPage(p) { const i = router.currentAdminPage; i.currentPage = p; i.loadUsers(); }

    static async viewUser(userId) {
        const token = localStorage.getItem('admin_token');
        const apiUrl = APP_CONFIG.apiUrl;
        const response = await fetch(`${apiUrl}/admin/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        const u = result.data;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal" style="max-width:500px">
                <div class="modal-header"><h3>${u.full_name||u.phone}</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button></div>
                <div class="bank-info-card mb-3">
                    <div class="bank-info-row"><span>ID</span><span>#${u.id}</span></div>
                    <div class="bank-info-row"><span>Phone</span><span>${u.phone}</span></div>
                    <div class="bank-info-row"><span>Balance</span><span class="font-bold">${Number(u.balance).toLocaleString()} ETB</span></div>
                    <div class="bank-info-row"><span>Package</span><span>${u.active_package||'None'}</span></div>
                    <div class="bank-info-row"><span>Status</span><span class="badge ${u.status==='active'?'badge-success':'badge-danger'}">${u.status}</span></div>
                </div>
                <div class="flex gap-2 mb-3">
                    <button class="btn btn-outline btn-sm btn-block" onclick="AdminUsers.editUser(${u.id},'${u.phone}','${u.full_name||''}')">✏️ Edit</button>
                    <button class="btn btn-outline btn-sm btn-block" onclick="AdminUsers.notifyUser(${u.id})">📢 Notify</button>
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

    static async editUser(id, phone, name) {
        const newName = prompt('Full name:', name);
        if (newName === null) return;
        const newPhone = prompt('Phone:', phone);
        if (newPhone === null) return;
        const newPass = prompt('New password (leave blank to keep):');
        
        const body = { fullName: newName, phone: newPhone };
        if (newPass) body.password = newPass;

        const token = localStorage.getItem('admin_token');
        const apiUrl = APP_CONFIG.apiUrl;
        await fetch(`${apiUrl}/admin/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(body)
        });
        alert('User updated!');
        document.querySelector('.modal-overlay')?.remove();
        router.navigate('/admin/users');
    }

    static async notifyUser(id) {
        const title = prompt('Notification title:');
        if (!title) return;
        const message = prompt('Notification message:');
        if (!message) return;
        const token = localStorage.getItem('admin_token');
        const apiUrl = APP_CONFIG.apiUrl;
        await fetch(`${apiUrl}/admin/users/${id}/notify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ title, message })
        });
        alert('Notification sent!');
    }

    static async suspendUser(id) { if (!confirm('Suspend this user?')) return; const token = localStorage.getItem('admin_token'); const apiUrl = APP_CONFIG.apiUrl; await fetch(`${apiUrl}/admin/users/${id}/suspend`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ action: 'suspend', reason: 'Admin action' }) }); document.querySelector('.modal-overlay')?.remove(); router.navigate('/admin/users'); }
    static async banUser(id) { if (!confirm('Ban this user permanently?')) return; const token = localStorage.getItem('admin_token'); const apiUrl = APP_CONFIG.apiUrl; await fetch(`${apiUrl}/admin/users/${id}/suspend`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ action: 'ban', reason: 'Admin action' }) }); document.querySelector('.modal-overlay')?.remove(); router.navigate('/admin/users'); }
    static async activateUser(id) { const token = localStorage.getItem('admin_token'); const apiUrl = APP_CONFIG.apiUrl; await fetch(`${apiUrl}/admin/users/${id}/activate`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }); document.querySelector('.modal-overlay')?.remove(); router.navigate('/admin/users'); }

    unmount() {}
}