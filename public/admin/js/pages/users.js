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
                    <p class="admin-page-subtitle">Manage all platform users</p>
                </div>
                <div class="search-bar mb-4">
                    <input type="text" class="form-input" id="userSearch" placeholder="🔍 Search by name, phone or ID..." value="${this.searchTerm}" onkeyup="AdminUsers.doSearch(this.value)">
                    <select class="form-select" id="statusFilter" onchange="AdminUsers.doFilter(this.value)">
                        <option value="">All Status</option>
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
            const response = await fetch(`${apiUrl}/admin/users?${params}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const result = await response.json();
            const users = result.data || [];
            const pagination = result.pagination || {};

            if (users.length === 0) {
                list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👻</div><h3>No users found</h3><p>Try a different search</p></div>';
                return;
            }

            list.innerHTML = `
                <div class="admin-table">
                    <div class="admin-table-header" style="grid-template-columns:50px 1fr 100px 100px 80px 60px;">
                        <span>ID</span><span>Name / Phone</span><span>Package</span><span>Balance</span><span>Status</span><span></span>
                    </div>
                    ${users.map(u => `
                        <div class="admin-table-row" style="grid-template-columns:50px 1fr 100px 100px 80px 60px;">
                            <span class="text-muted">#${u.id}</span>
                            <div><span class="font-medium">${u.full_name||'N/A'}</span><div class="text-xs text-muted">${u.phone}</div></div>
                            <span>${u.active_package||'None'}</span>
                            <span class="font-semibold">${Number(u.balance||0).toLocaleString()}</span>
                            <span class="badge ${u.status==='active'?'badge-success':u.status==='suspended'?'badge-warning':'badge-danger'}">${u.status}</span>
                            <button class="btn btn-ghost btn-sm" onclick="AdminUsers.viewUser(${u.id})" title="View Details">👁️</button>
                        </div>
                    `).join('')}
                </div>
            `;

            if (pagination.pages > 1) {
                document.getElementById('usersPagination').innerHTML = `
                    <div class="flex justify-center gap-2">
                        <button class="btn btn-outline btn-sm" ${this.currentPage<=1?'disabled':''} onclick="AdminUsers.goPage(${this.currentPage-1})">← Prev</button>
                        <span class="px-4 py-2 text-sm text-secondary">Page ${this.currentPage} of ${pagination.pages}</span>
                        <button class="btn btn-outline btn-sm" ${this.currentPage>=pagination.pages?'disabled':''} onclick="AdminUsers.goPage(${this.currentPage+1})">Next →</button>
                    </div>
                `;
            }
        } catch (error) {
            list.innerHTML = '<div class="empty-state"><p>Failed to load users</p><button class="btn btn-primary" onclick="AdminUsers.prototype.loadUsers.call(router.currentAdminPage)">Retry</button></div>';
        }
    }

    static doSearch(term) { const i = router.currentAdminPage; i.searchTerm = term; i.currentPage = 1; clearTimeout(i._t); i._t = setTimeout(() => i.loadUsers(), 300); }
    static doFilter(status) { const i = router.currentAdminPage; i.statusFilter = status; i.currentPage = 1; i.loadUsers(); }
    static goPage(p) { const i = router.currentAdminPage; i.currentPage = p; i.loadUsers(); window.scrollTo(0,0); }

    // ============ VIEW USER WITH ALL TABS ============
    static async viewUser(userId) {
        const token = localStorage.getItem('admin_token');
        const apiUrl = APP_CONFIG.apiUrl;

        try {
            const response = await fetch(`${apiUrl}/admin/users/${userId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const result = await response.json();
            const u = result.data;

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal animate-slideUp" style="max-width:600px; max-height:90vh;">
                    <div class="modal-header">
                        <h3 class="modal-title">${u.full_name||u.phone}</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                    </div>

                    <!-- User Summary Card -->
                    <div class="card card-gradient text-center mb-3">
                        <div class="profile-avatar" style="margin:0 auto">${u.avatar_url||'👤'}</div>
                        <h4 class="mt-2">${u.full_name||'N/A'}</h4>
                        <p class="text-sm text-secondary">${u.phone} | #${u.id}</p>
                        <div class="mt-2">
                            <span class="badge ${u.status==='active'?'badge-success':u.status==='suspended'?'badge-warning':'badge-danger'}">${u.status}</span>
                            ${u.active_package?`<span class="badge badge-primary ml-1">${u.active_package}</span>`:''}
                            ${u.manager_rank ? `<span class="badge ml-1" style="background:linear-gradient(135deg,#FFD700,#FFA500);color:#000;">🏆 ${u.manager_rank}</span>` : ''}
                            ${u.warningCount > 0 ? `<span class="badge badge-warning ml-1">⚠️ ${u.warningCount} warnings</span>` : ''}
                        </div>
                    </div>

                    <!-- Tabs -->
                    <div class="filter-tabs mb-3" style="position:sticky;top:0;z-index:10;background:white;">
                        <button class="filter-tab active" id="tabBtnInfo">📋 Info</button>
                        <button class="filter-tab" id="tabBtnHistory">📜 History</button>
                        <button class="filter-tab" id="tabBtnFinance">💰 Finance</button>
                        <button class="filter-tab" id="tabBtnPasswords">🔑 Passwords</button>
                    </div>

                    <!-- Info Tab -->
                    <div id="tabInfo">
                        <div class="bank-info-card mb-3">
                            <div class="bank-info-row"><span class="bank-info-label">User ID</span><span class="bank-info-value">#${u.id}</span></div>
                            <div class="bank-info-row"><span class="bank-info-label">Phone</span><span class="bank-info-value">${u.phone}</span></div>
                            <div class="bank-info-row"><span class="bank-info-label">Name</span><span class="bank-info-value">${u.full_name||'N/A'}</span></div>
                            <div class="bank-info-row"><span class="bank-info-label">Balance</span><span class="bank-info-value font-bold">${Number(u.balance||0).toLocaleString()} ETB</span></div>
                            <div class="bank-info-row"><span class="bank-info-label">Capital</span><span class="bank-info-value">${Number(u.capital||0).toLocaleString()} ETB</span></div>
                            <div class="bank-info-row"><span class="bank-info-label">Earnings</span><span class="bank-info-value">${Number(u.earnings_balance||0).toLocaleString()} ETB</span></div>
                            <div class="bank-info-row"><span class="bank-info-label">Manager Rank</span><span class="bank-info-value">${u.manager_rank || 'None'}</span></div>
                            <div class="bank-info-row"><span class="bank-info-label">Referral Code</span><span class="bank-info-value">${u.referral_code}</span></div>
                            <div class="bank-info-row"><span class="bank-info-label">Warnings</span><span class="bank-info-value">${u.warningCount || 0}</span></div>
                            <div class="bank-info-row"><span class="bank-info-label">Joined</span><span class="bank-info-value">${new Date(u.created_at).toLocaleDateString()}</span></div>
                        </div>

                        <!-- Action Buttons Row 1 -->
                        <div class="flex gap-2 mb-3">
                            <button class="btn btn-outline btn-sm btn-block" onclick="AdminUsers.editUserModal(${u.id},'${u.phone}','${u.full_name||''}')">✏️ Edit</button>
                            <button class="btn btn-outline btn-sm btn-block" onclick="AdminUsers.notifyUserModal(${u.id})">📢 Notify</button>
                            <button class="btn btn-outline btn-sm btn-block" onclick="AdminUsers.alertUserModal(${u.id})">🔔 Alert</button>
                            <button class="btn btn-outline btn-sm btn-block" onclick="AdminUsers.warnUserModal(${u.id})">⚠️ Warn</button>
                        </div>

                        <!-- Action Buttons Row 2 -->
                        <div class="flex gap-2 mb-2">
                            <button class="btn btn-outline btn-sm btn-block" onclick="AdminUsers.levelModal(${u.id},'${u.active_package||'none'}')">📊 Level</button>
                            <button class="btn btn-outline btn-sm btn-block" onclick="AdminUsers.addMoneyModal(${u.id})">💵 Add Money</button>
                            <button class="btn btn-outline btn-sm btn-block" onclick="AdminUsers.managerRankModal(${u.id})">🏆 Rank</button>
                        </div>

                        <!-- Action Buttons Row 3 - Status -->
                        <div class="flex gap-2">
                            ${u.status==='active' ? `
                                <button class="btn btn-warning btn-block" onclick="AdminUsers.suspendUserModal(${u.id},'suspend')">⏸️ Suspend</button>
                                <button class="btn btn-danger btn-block" onclick="AdminUsers.suspendUserModal(${u.id},'ban')">🚫 Ban</button>
                            ` : `<button class="btn btn-success btn-block" onclick="AdminUsers.activateUserModal(${u.id})">✅ Activate</button>`}
                            <button class="btn btn-danger btn-block" onclick="AdminUsers.deleteUserModal(${u.id})">🗑️ Delete</button>
                        </div>
                    </div>

                    <!-- History Tab -->
                    <div id="tabHistory" style="display:none;">
                        <h5 class="mb-2">📜 Suspension & Warning History</h5>
                        ${u.suspensionHistory && u.suspensionHistory.length > 0 ? u.suspensionHistory.map(h => `
                            <div class="list-item" style="border-left:3px solid ${h.action==='ban'?'var(--color-danger)':h.action==='warning'?'var(--color-warning)':'var(--color-info)'}">
                                <div class="list-item-icon">${h.action==='ban'?'🚫':h.action==='warning'?'⚡':'⏸️'}</div>
                                <div class="list-item-content">
                                    <div class="list-item-title">${h.action.toUpperCase()}</div>
                                    <div class="list-item-subtitle">${h.reason||'No reason'} | By: ${h.admin_name||'System'} | ${new Date(h.created_at).toLocaleString()}</div>
                                </div>
                            </div>
                        `).join('') : '<p class="text-center text-secondary py-3">No history</p>'}
                        <h5 class="mb-2 mt-4">🔧 Activity Log</h5>
                        ${u.activityLog && u.activityLog.length > 0 ? u.activityLog.map(log => `
                            <div class="list-item">
                                <div class="list-item-icon">📝</div>
                                <div class="list-item-content">
                                    <div class="list-item-title">${log.action.replace(/_/g,' ')}</div>
                                    <div class="list-item-subtitle">${log.field_name}: ${log.old_value||'N/A'} → ${log.new_value||'N/A'} | ${new Date(log.created_at).toLocaleString()}</div>
                                </div>
                            </div>
                        `).join('') : '<p class="text-center text-secondary py-3">No activity</p>'}
                    </div>

                    <!-- Finance Tab -->
                    <div id="tabFinance" style="display:none;">
                        <h5 class="mb-2">💳 Recent Deposits</h5>
                        ${u.recentDeposits && u.recentDeposits.length > 0 ? u.recentDeposits.map(d => `
                            <div class="list-item"><div class="list-item-icon">💳</div><div class="list-item-content"><div class="list-item-title">${Number(d.amount).toLocaleString()} ETB</div><div class="list-item-subtitle">${d.bank_name} | ${new Date(d.created_at).toLocaleString()}</div></div><span class="badge ${d.status==='verified'?'badge-success':d.status==='rejected'?'badge-danger':'badge-warning'}">${d.status}</span></div>
                        `).join('') : '<p class="text-center text-secondary py-3">No deposits</p>'}
                        <h5 class="mb-2 mt-4">💸 Recent Withdrawals</h5>
                        ${u.recentWithdrawals && u.recentWithdrawals.length > 0 ? u.recentWithdrawals.map(w => `
                            <div class="list-item"><div class="list-item-icon">💸</div><div class="list-item-content"><div class="list-item-title">${Number(w.amount).toLocaleString()} ETB</div><div class="list-item-subtitle">${new Date(w.created_at).toLocaleString()}</div></div><span class="badge ${w.status==='completed'?'badge-success':w.status==='rejected'?'badge-danger':'badge-warning'}">${w.status}</span></div>
                        `).join('') : '<p class="text-center text-secondary py-3">No withdrawals</p>'}
                    </div>

                    <!-- Passwords Tab -->
                    <div id="tabPasswords" style="display:none;">
                        <h5 class="mb-2">🔑 Password Change History</h5>
                        ${u.passwordHistory && u.passwordHistory.length > 0 ? u.passwordHistory.map(ph => `
                            <div class="list-item">
                                <div class="list-item-icon">🔑</div>
                                <div class="list-item-content">
                                    <div class="list-item-title">Password Changed</div>
                                    <div class="list-item-subtitle">By: ${ph.changed_by_name || 'System'} | ${new Date(ph.changed_at).toLocaleString()}</div>
                                </div>
                            </div>
                        `).join('') : '<p class="text-center text-secondary py-3">No password changes recorded</p>'}
                        <button class="btn btn-primary btn-block mt-3" onclick="AdminUsers.resetPasswordModal(${u.id})">🔄 Reset Password</button>
                    </div>
                </div>
            `;

            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
            document.body.appendChild(overlay);

            document.getElementById('tabBtnInfo').addEventListener('click', () => AdminUsers.switchTab('Info'));
            document.getElementById('tabBtnHistory').addEventListener('click', () => AdminUsers.switchTab('History'));
            document.getElementById('tabBtnFinance').addEventListener('click', () => AdminUsers.switchTab('Finance'));
            document.getElementById('tabBtnPasswords').addEventListener('click', () => AdminUsers.switchTab('Passwords'));

        } catch (error) {
            await Dialog.alert('Failed to load user details', 'Error', 'error');
        }
    }

    static switchTab(name) {
        ['Info', 'History', 'Finance', 'Passwords'].forEach(t => {
            const tab = document.getElementById(`tab${t}`);
            const btn = document.getElementById(`tabBtn${t}`);
            if (tab) tab.style.display = t === name ? 'block' : 'none';
            if (btn) btn.classList.toggle('active', t === name);
        });
    }

    // ============ MODAL METHODS ============

    static async editUserModal(id, phone, name) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal animate-scaleIn" style="max-width:420px;">
                <div class="modal-header"><h3 class="modal-title">✏️ Edit User</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button></div>
                <form id="editUserForm">
                    <div class="form-group"><label class="form-label">Full Name</label><input type="text" class="form-input" id="editFullName" value="${name||''}" placeholder="Full name"></div>
                    <div class="form-group"><label class="form-label">Phone Number</label><input type="text" class="form-input" id="editPhone" value="${phone}" placeholder="Phone"></div>
                    <div class="form-group"><label class="form-label">New Password (leave blank to keep)</label><input type="text" class="form-input" id="editPassword" placeholder="New password (min 6 chars)"></div>
                    <div class="flex gap-2 mt-4"><button type="button" class="btn btn-outline btn-block" onclick="this.closest('.modal-overlay').remove()">Cancel</button><button type="submit" class="btn btn-primary btn-block">💾 Save All Changes</button></div>
                </form>
            </div>
        `;
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
        document.body.appendChild(overlay);
        document.getElementById('editUserForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const newName = document.getElementById('editFullName').value.trim();
            const newPhone = document.getElementById('editPhone').value.trim();
            const newPass = document.getElementById('editPassword').value.trim();
            const body = {};
            if (newName !== (name||'')) body.fullName = newName;
            if (newPhone !== phone) body.phone = newPhone;
            if (newPass && newPass.length >= 6) body.password = newPass;
            else if (newPass && newPass.length < 6) { await Dialog.alert('Password must be at least 6 characters', 'Invalid', 'warning'); return; }
            if (Object.keys(body).length === 0) { await Dialog.alert('No changes made', 'Info', 'info'); return; }
            const token = localStorage.getItem('admin_token'); const apiUrl = APP_CONFIG.apiUrl;
            const res = await fetch(`${apiUrl}/admin/users/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(body) });
            const data = await res.json();
            if (data.success) { await Dialog.alert('User updated!', 'Updated', 'success'); overlay.remove(); document.querySelector('.modal-overlay')?.remove(); router.navigate('/admin/users'); }
            else { await Dialog.alert(data.message, 'Error', 'error'); }
        });
    }

    static async notifyUserModal(id) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal animate-scaleIn" style="max-width:420px;">
                <div class="modal-header"><h3 class="modal-title">📢 Send Notification</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button></div>
                <form id="notifyForm">
                    <div class="form-group"><label class="form-label">Title</label><input type="text" class="form-input" id="notifyTitle" placeholder="Notification title" required></div>
                    <div class="form-group"><label class="form-label">Message</label><textarea class="form-textarea" id="notifyMessage" rows="3" placeholder="Notification message" required></textarea></div>
                    <div class="flex gap-2 mt-4"><button type="button" class="btn btn-outline btn-block" onclick="this.closest('.modal-overlay').remove()">Cancel</button><button type="submit" class="btn btn-primary btn-block">📢 Send</button></div>
                </form>
            </div>
        `;
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
        document.body.appendChild(overlay);
        document.getElementById('notifyForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('notifyTitle').value.trim();
            const message = document.getElementById('notifyMessage').value.trim();
            if (!title || !message) return;
            const token = localStorage.getItem('admin_token'); const apiUrl = APP_CONFIG.apiUrl;
            await fetch(`${apiUrl}/admin/users/${id}/notify`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ title, message }) });
            await Dialog.alert('Notification sent!', 'Sent', 'success'); overlay.remove();
        });
    }

    static async alertUserModal(id) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal animate-scaleIn" style="max-width:420px;">
                <div class="modal-header"><h3 class="modal-title">🔔 Send Alert</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button></div>
                <form id="alertForm">
                    <div class="form-group"><label class="form-label">Title</label><input type="text" class="form-input" id="alertTitle" placeholder="Alert title" required></div>
                    <div class="form-group"><label class="form-label">Message</label><textarea class="form-textarea" id="alertMessage" rows="3" placeholder="Alert message" required></textarea></div>
                    <div class="flex gap-2 mt-4"><button type="button" class="btn btn-outline btn-block" onclick="this.closest('.modal-overlay').remove()">Cancel</button><button type="submit" class="btn btn-primary btn-block">🔔 Send</button></div>
                </form>
            </div>
        `;
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
        document.body.appendChild(overlay);
        document.getElementById('alertForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('alertTitle').value.trim();
            const message = document.getElementById('alertMessage').value.trim();
            if (!title || !message) return;
            const token = localStorage.getItem('admin_token'); const apiUrl = APP_CONFIG.apiUrl;
            await fetch(`${apiUrl}/admin/users/${id}/alert`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ customTitle: title, customMessage: message }) });
            await Dialog.alert('Alert sent!', 'Sent', 'success'); overlay.remove();
        });
    }

    static async warnUserModal(id) {
        const reason = await Dialog.prompt('Warning Reason', 'Enter reason...'); if (!reason) return;
        const confirmed = await Dialog.confirm('Send warning?', 'Confirm', '⚠️ Send', 'Cancel', 'warning'); if (!confirmed) return;
        const token = localStorage.getItem('admin_token'); const apiUrl = APP_CONFIG.apiUrl;
        await fetch(`${apiUrl}/admin/users/${id}/warn`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ reason }) });
        await Dialog.alert('Warning sent!', 'Sent', 'warning'); document.querySelector('.modal-overlay')?.remove(); router.navigate('/admin/users');
    }

    static async suspendUserModal(id, action) {
        const confirmed = await Dialog.confirm(action==='ban'?'Ban permanently?':'Suspend this user?', action==='ban'?'Ban':'Suspend', action==='ban'?'🚫 Ban':'⏸️ Suspend', 'Cancel', action==='ban'?'danger':'warning');
        if (!confirmed) return;
        const token = localStorage.getItem('admin_token'); const apiUrl = APP_CONFIG.apiUrl;
        await fetch(`${apiUrl}/admin/users/${id}/suspend`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ action, reason: 'Admin action' }) });
        document.querySelector('.modal-overlay')?.remove(); router.navigate('/admin/users');
    }

    static async activateUserModal(id) {
        const confirmed = await Dialog.confirm('Activate this user?', 'Activate', '✅ Activate', 'Cancel'); if (!confirmed) return;
        const token = localStorage.getItem('admin_token'); const apiUrl = APP_CONFIG.apiUrl;
        await fetch(`${apiUrl}/admin/users/${id}/activate`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } });
        document.querySelector('.modal-overlay')?.remove(); router.navigate('/admin/users');
    }

    static async deleteUserModal(id) {
        const confirmed = await Dialog.confirm('Delete permanently?', 'Delete', '🗑️ Delete', 'Cancel', 'danger'); if (!confirmed) return;
        const token = localStorage.getItem('admin_token'); const apiUrl = APP_CONFIG.apiUrl;
        await fetch(`${apiUrl}/admin/users/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        document.querySelector('.modal-overlay')?.remove(); router.navigate('/admin/users');
    }

    static async levelModal(id, currentPackage) {
        const apiUrl = APP_CONFIG.apiUrl; const token = localStorage.getItem('admin_token');
        let packages = [{ name: 'No Package', value: 'none' }];
        try {
            const response = await fetch(`${apiUrl}/packages`, { headers: { 'Authorization': `Bearer ${token}` } });
            const result = await response.json();
            if (result.success && result.data && result.data.length > 0) {
                packages = [{ name: 'No Package', value: 'none' }, ...result.data.map(p => ({ name: p.name, value: p.name }))];
            }
        } catch (e) { await Dialog.alert('Failed to load packages', 'Error', 'error'); return; }
        let options = packages.map(p => `<option value="${p.value}" ${p.value===currentPackage?'selected':''}>${p.name}</option>`).join('');
        const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
        overlay.innerHTML = `<div class="modal animate-scaleIn" style="max-width:380px;text-align:center;"><h4 class="mb-3">📊 Change Package</h4><select class="form-select mb-3" id="levelSelect">${options}</select><div class="flex gap-2"><button class="btn btn-outline btn-block" onclick="this.closest('.modal-overlay').remove()">Cancel</button><button class="btn btn-primary btn-block" id="confirmLevel">Change</button></div></div>`;
        overlay.addEventListener('click', e => { if (e.target===overlay) overlay.remove(); }); document.body.appendChild(overlay);
        document.getElementById('confirmLevel').addEventListener('click', async () => {
            const pkgName = document.getElementById('levelSelect').value;
            await fetch(`${apiUrl}/admin/users/${id}/level`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ packageName: pkgName }) });
            overlay.remove(); document.querySelector('.modal-overlay')?.remove(); router.navigate('/admin/users');
        });
    }

    static async addMoneyModal(id) {
        const amount = await Dialog.prompt('Amount (ETB)', 'Enter amount...'); if (!amount) return;
        const reason = await Dialog.prompt('Reason', 'Enter reason...');
        const confirmed = await Dialog.confirm(`Add ${Number(amount).toLocaleString()} ETB?`, 'Add Money', '💵 Add', 'Cancel'); if (!confirmed) return;
        const token = localStorage.getItem('admin_token'); const apiUrl = APP_CONFIG.apiUrl;
        await fetch(`${apiUrl}/admin/users/${id}/add-money`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ amount: parseFloat(amount), reason }) });
        await Dialog.alert(`${Number(amount).toLocaleString()} ETB added!`, 'Success', 'success');
        document.querySelector('.modal-overlay')?.remove(); router.navigate('/admin/users');
    }

    static async resetPasswordModal(id) {
        const newPass = await Dialog.prompt('New Password', 'Enter new password (min 6 chars)...');
        if (!newPass || newPass.length < 6) { await Dialog.alert('Password must be at least 6 characters', 'Invalid', 'warning'); return; }
        const confirmed = await Dialog.confirm(`Reset password to: ${newPass}?`, 'Reset Password', '🔄 Reset', 'Cancel');
        if (!confirmed) return;
        const token = localStorage.getItem('admin_token'); const apiUrl = APP_CONFIG.apiUrl;
        const res = await fetch(`${apiUrl}/admin/users/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ password: newPass }) });
        const data = await res.json();
        if (data.success) { await Dialog.alert(`Password reset to: ${newPass}`, 'Password Reset', 'success'); document.querySelector('.modal-overlay')?.remove(); router.navigate('/admin/users'); }
        else { await Dialog.alert(data.message, 'Error', 'error'); }
    }

    /**
     * Show manager rank management modal
     * Allows admin to view eligibility and assign ranks
     */
    static async managerRankModal(id) {
        const token = localStorage.getItem('admin_token');
        const apiUrl = APP_CONFIG.apiUrl;
        
        try {
            const [infoResponse, ranksResponse] = await Promise.all([
                fetch(`${apiUrl}/admin/users/${id}/manager-info`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${apiUrl}/config/manager-ranks`)
            ]);
            
            const infoResult = await infoResponse.json();
            const ranksResult = await ranksResponse.json();
            
            const info = infoResult.data || {};
            const allRanks = ranksResult.data?.ranks || [];
            
            let options = '<option value="none">No Rank (Auto-detect)</option>';
            allRanks.forEach(rank => {
                const selected = info.currentRank === rank.name ? 'selected' : '';
                options += `<option value="${rank.name}" ${selected}>${rank.name} - ${rank.monthlySalary.toLocaleString()} ETB/mo</option>`;
            });
            
            let eligibilityHtml = '';
            if (info.teamCounts) {
                eligibilityHtml = `
                    <div class="bank-info-card mb-3">
                        <div class="bank-info-row"><span>Level A Members</span><span>${info.teamCounts.a}</span></div>
                        <div class="bank-info-row"><span>Level B Members</span><span>${info.teamCounts.b}</span></div>
                        <div class="bank-info-row"><span>Level C Members</span><span>${info.teamCounts.c}</span></div>
                        <div class="bank-info-row"><span>Total Team</span><span class="font-bold">${info.teamCounts.total}</span></div>
                    </div>
                `;
            }
            
            if (info.highestEligibleRank) {
                eligibilityHtml += `
                    <div class="card card-accent mb-3 text-center">
                        <p class="text-sm">Auto-qualified for:</p>
                        <p class="font-bold">${info.highestEligibleRank.name}</p>
                        <p class="text-xs text-secondary">${info.highestEligibleRank.monthlySalary.toLocaleString()} ETB/month</p>
                    </div>
                `;
            }
            
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal animate-scaleIn" style="max-width:420px;">
                    <div class="modal-header"><h3 class="modal-title">🏆 Manager Rank</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button></div>
                    ${eligibilityHtml}
                    <div class="form-group">
                        <label class="form-label">Current Rank: <strong>${info.currentRank || 'None'}</strong></label>
                        <select class="form-select" id="managerRankSelect">${options}</select>
                    </div>
                    <p class="text-xs text-secondary mb-3">⚠️ Manual assignment overrides auto-detection.</p>
                    <div class="flex gap-2"><button class="btn btn-outline btn-block" onclick="this.closest('.modal-overlay').remove()">Cancel</button><button class="btn btn-primary btn-block" id="confirmRankBtn">💾 Save Rank</button></div>
                </div>
            `;
            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
            document.body.appendChild(overlay);
            
            document.getElementById('confirmRankBtn').addEventListener('click', async () => {
                const rankName = document.getElementById('managerRankSelect').value;
                await fetch(`${apiUrl}/admin/users/${id}/manager-rank`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ rankName }) });
                await Dialog.alert(rankName === 'none' ? 'Manager rank removed.' : `Manager rank set to "${rankName}"!`, 'Rank Updated', 'success');
                overlay.remove(); document.querySelector('.modal-overlay')?.remove(); router.navigate('/admin/users');
            });
        } catch (error) { await Dialog.alert('Failed to load manager info', 'Error', 'error'); }
    }

    unmount() {}
}