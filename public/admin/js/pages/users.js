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
                            <div class="bank-info-row"><span class="bank-info-label">Total Earned</span><span class="bank-info-value">${Number(u.total_earned||0).toLocaleString()} ETB</span></div>
                            <div class="bank-info-row"><span class="bank-info-label">Total Deposited</span><span class="bank-info-value">${Number(u.total_deposited||0).toLocaleString()} ETB</span></div>
                            <div class="bank-info-row"><span class="bank-info-label">Referral Code</span><span class="bank-info-value">${u.referral_code}</span></div>
                            <div class="bank-info-row"><span class="bank-info-label">Warnings</span><span class="bank-info-value">${u.warningCount || 0}</span></div>
                            <div class="bank-info-row"><span class="bank-info-label">Joined</span><span class="bank-info-value">${new Date(u.created_at).toLocaleDateString()}</span></div>
                        </div>

                        <div class="flex gap-2 mb-3">
                            <button class="btn btn-outline btn-sm btn-block" onclick="AdminUsers.editUserModal(${u.id},'${u.phone}','${u.full_name||''}')">✏️ Edit</button>
                            <button class="btn btn-outline btn-sm btn-block" onclick="AdminUsers.notifyUserModal(${u.id})">📢 Notify</button>
                            <button class="btn btn-outline btn-sm btn-block" onclick="AdminUsers.alertUserModal(${u.id})">🔔 Alert</button>
                            <button class="btn btn-outline btn-sm btn-block" onclick="AdminUsers.warnUserModal(${u.id})">⚠️ Warn</button>
                        </div>

                        <div class="flex gap-2 mb-2">
                            <button class="btn btn-outline btn-sm btn-block" onclick="AdminUsers.levelModal(${u.id},'${u.active_package||'none'}')">📊 Level</button>
                            <button class="btn btn-outline btn-sm btn-block" onclick="AdminUsers.addMoneyModal(${u.id})">💵 Add Money</button>
                        </div>

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
                            <div class="list-item">
                                <div class="list-item-icon">💳</div>
                                <div class="list-item-content">
                                    <div class="list-item-title">${Number(d.amount).toLocaleString()} ETB</div>
                                    <div class="list-item-subtitle">${d.bank_name} | ${new Date(d.created_at).toLocaleString()}</div>
                                </div>
                                <span class="badge ${d.status==='verified'?'badge-success':d.status==='rejected'?'badge-danger':'badge-warning'}">${d.status}</span>
                            </div>
                        `).join('') : '<p class="text-center text-secondary py-3">No deposits</p>'}

                        <h5 class="mb-2 mt-4">💸 Recent Withdrawals</h5>
                        ${u.recentWithdrawals && u.recentWithdrawals.length > 0 ? u.recentWithdrawals.map(w => `
                            <div class="list-item">
                                <div class="list-item-icon">💸</div>
                                <div class="list-item-content">
                                    <div class="list-item-title">${Number(w.amount).toLocaleString()} ETB</div>
                                    <div class="list-item-subtitle">${new Date(w.created_at).toLocaleString()}</div>
                                </div>
                                <span class="badge ${w.status==='completed'?'badge-success':w.status==='rejected'?'badge-danger':'badge-warning'}">${w.status}</span>
                            </div>
                        `).join('') : '<p class="text-center text-secondary py-3">No withdrawals</p>'}
                    </div>

                    <!-- Passwords Tab -->
                    <div id="tabPasswords" style="display:none;">
                        <h5 class="mb-2">🔑 Password History</h5>
                        <div class="bank-info-card mb-3">
                            <div class="bank-info-row"><span class="bank-info-label">Current Hash</span><span class="bank-info-value text-xs" style="word-break:break-all;">${u.password_hash ? u.password_hash.substring(0, 20) + '...' : 'N/A'}</span></div>
                        </div>
                        ${u.passwordHistory && u.passwordHistory.length > 0 ? u.passwordHistory.map(ph => `
                            <div class="list-item">
                                <div class="list-item-icon">🔑</div>
                                <div class="list-item-content">
                                    <div class="list-item-title">Password Changed</div>
                                    <div class="list-item-subtitle">Hash: ${ph.password_hash.substring(0, 15)}... | By: ${ph.admin_name||'System'} | ${new Date(ph.changed_at).toLocaleString()}</div>
                                </div>
                            </div>
                        `).join('') : '<p class="text-center text-secondary py-3">No password history</p>'}
                    </div>
                </div>
            `;

            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
            document.body.appendChild(overlay);

            // Tab switching
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
        const newName = await Dialog.prompt('Edit Full Name', 'Enter full name', name);
        if (newName === null) return;
        const newPhone = await Dialog.prompt('Edit Phone Number', 'Enter phone number', phone);
        if (newPhone === null) return;
        const newPass = await Dialog.prompt('New Password (leave blank to keep)', 'Enter new password');
        
        const confirmed = await Dialog.confirm('Save changes?', 'Update User', '💾 Save', 'Cancel');
        if (!confirmed) return;

        const body = {};
        if (newName !== name) body.fullName = newName;
        if (newPhone !== phone) body.phone = newPhone;
        if (newPass && newPass.trim()) body.password = newPass;
        if (Object.keys(body).length === 0) return;

        const token = localStorage.getItem('admin_token');
        const apiUrl = APP_CONFIG.apiUrl;
        try {
            const res = await fetch(`${apiUrl}/admin/users/${id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (data.success) {
                await Dialog.alert('User updated successfully!', 'Updated', 'success');
                document.querySelector('.modal-overlay')?.remove();
                router.navigate('/admin/users');
            } else { await Dialog.alert(data.message, 'Error', 'error'); }
        } catch (error) { await Dialog.alert('Failed to update user', 'Error', 'error'); }
    }

    static async notifyUserModal(id) {
        const title = await Dialog.prompt('Notification Title', 'Enter title...');
        if (!title) return;
        const message = await Dialog.prompt('Notification Message', 'Enter message...');
        if (!message) return;
        const token = localStorage.getItem('admin_token');
        const apiUrl = APP_CONFIG.apiUrl;
        await fetch(`${apiUrl}/admin/users/${id}/notify`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ title, message })
        });
        await Dialog.alert('Notification sent!', 'Sent', 'success');
    }

    static async alertUserModal(id) {
        const title = await Dialog.prompt('Alert Title', 'Enter alert title...');
        if (!title) return;
        const message = await Dialog.prompt('Alert Message', 'Enter alert message...');
        if (!message) return;
        const token = localStorage.getItem('admin_token');
        const apiUrl = APP_CONFIG.apiUrl;
        await fetch(`${apiUrl}/admin/users/${id}/alert`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ customTitle: title, customMessage: message })
        });
        await Dialog.alert('Alert sent!', 'Sent', 'success');
    }

    static async warnUserModal(id) {
        const reason = await Dialog.prompt('Warning Reason', 'Enter reason for warning...');
        if (!reason) return;
        const confirmed = await Dialog.confirm('Send warning? It will appear on their dashboard.', 'Confirm Warning', '⚠️ Send', 'Cancel', 'warning');
        if (!confirmed) return;
        const token = localStorage.getItem('admin_token');
        const apiUrl = APP_CONFIG.apiUrl;
        await fetch(`${apiUrl}/admin/users/${id}/warn`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ reason })
        });
        await Dialog.alert('Warning sent!', 'Warning Sent', 'warning');
        document.querySelector('.modal-overlay')?.remove();
        router.navigate('/admin/users');
    }

    static async suspendUserModal(id, action) {
        const confirmed = await Dialog.confirm(
            action === 'ban' ? 'Ban permanently?' : 'Suspend this user?',
            action === 'ban' ? 'Ban User' : 'Suspend User',
            action === 'ban' ? '🚫 Ban' : '⏸️ Suspend', 'Cancel',
            action === 'ban' ? 'danger' : 'warning'
        );
        if (!confirmed) return;
        const token = localStorage.getItem('admin_token');
        const apiUrl = APP_CONFIG.apiUrl;
        await fetch(`${apiUrl}/admin/users/${id}/suspend`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ action, reason: 'Admin action' })
        });
        document.querySelector('.modal-overlay')?.remove();
        router.navigate('/admin/users');
    }

    static async activateUserModal(id) {
        const confirmed = await Dialog.confirm('Activate this user?', 'Activate User', '✅ Activate', 'Cancel');
        if (!confirmed) return;
        const token = localStorage.getItem('admin_token');
        const apiUrl = APP_CONFIG.apiUrl;
        await fetch(`${apiUrl}/admin/users/${id}/activate`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        });
        document.querySelector('.modal-overlay')?.remove();
        router.navigate('/admin/users');
    }

    static async deleteUserModal(id) {
        const confirmed = await Dialog.confirm(
            'Delete this user permanently? Their phone will be saved for registration tracking.',
            'Delete User',
            '🗑️ Delete',
            'Cancel',
            'danger'
        );
        if (!confirmed) return;
        const token = localStorage.getItem('admin_token');
        const apiUrl = APP_CONFIG.apiUrl;
        await fetch(`${apiUrl}/admin/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        document.querySelector('.modal-overlay')?.remove();
        router.navigate('/admin/users');
    }

    static async levelModal(id, currentPackage) {
        const packages = ['none', 'Intern', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'];
        let options = packages.map(p => `<option value="${p}" ${p === currentPackage ? 'selected' : ''}>${p === 'none' ? 'No Package' : p}</option>`).join('');
        
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal animate-scaleIn" style="max-width:380px;text-align:center;">
                <h4 class="mb-3">📊 Change Package</h4>
                <select class="form-select mb-3" id="levelSelect">${options}</select>
                <div class="flex gap-2">
                    <button class="btn btn-outline btn-block" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button class="btn btn-primary btn-block" id="confirmLevel">Change</button>
                </div>
            </div>
        `;
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
        document.body.appendChild(overlay);

        document.getElementById('confirmLevel').addEventListener('click', async () => {
            const pkg = document.getElementById('levelSelect').value;
            const token = localStorage.getItem('admin_token');
            const apiUrl = APP_CONFIG.apiUrl;
            await fetch(`${apiUrl}/admin/users/${id}/level`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ packageName: pkg })
            });
            overlay.remove();
            document.querySelector('.modal-overlay')?.remove();
            router.navigate('/admin/users');
        });
    }

    static async addMoneyModal(id) {
        const amount = await Dialog.prompt('Amount (ETB)', 'Enter amount to add to earnings...');
        if (!amount) return;
        const reason = await Dialog.prompt('Reason', 'Enter reason for bonus...');
        const confirmed = await Dialog.confirm(`Add ${Number(amount).toLocaleString()} ETB to user earnings?`, 'Add Money', '💵 Add', 'Cancel');
        if (!confirmed) return;
        const token = localStorage.getItem('admin_token');
        const apiUrl = APP_CONFIG.apiUrl;
        await fetch(`${apiUrl}/admin/users/${id}/add-money`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ amount: parseFloat(amount), reason })
        });
        await Dialog.alert(`${Number(amount).toLocaleString()} ETB added to user earnings!`, 'Money Added', 'success');
        document.querySelector('.modal-overlay')?.remove();
        router.navigate('/admin/users');
    }

    unmount() {}
}