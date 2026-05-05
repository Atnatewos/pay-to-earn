// public/admin/js/pages/withdrawals.js
class AdminWithdrawals {
    constructor(container) {
        this.container = container;
        this.currentFilter = 'pending';
        this.selectedIds = [];
    }

    async render() {
        AdminSidebar.render('/admin/withdrawals');

        this.container.innerHTML = `
            <div class="admin-main">
                <div class="admin-page-header">
                    <h1 class="admin-page-title">Withdrawals</h1>
                    <p class="admin-page-subtitle">Process user withdrawal requests</p>
                </div>

                <div class="filter-tabs mb-4">
                    <button class="filter-tab ${this.currentFilter === 'pending' ? 'active' : ''}" 
                            onclick="AdminWithdrawals.switchFilter('pending')">⏳ Pending</button>
                    <button class="filter-tab ${this.currentFilter === 'completed' ? 'active' : ''}" 
                            onclick="AdminWithdrawals.switchFilter('completed')">✅ Completed</button>
                    <button class="filter-tab ${this.currentFilter === 'rejected' ? 'active' : ''}" 
                            onclick="AdminWithdrawals.switchFilter('rejected')">❌ Rejected</button>
                </div>

                ${this.currentFilter === 'pending' ? `
                    <div class="admin-action-buttons mb-3">
                        <button class="btn btn-success" onclick="AdminWithdrawals.bulkApprove()">✅ Approve Selected</button>
                        <button class="btn btn-danger" onclick="AdminWithdrawals.bulkReject()">❌ Reject Selected</button>
                        <button class="btn btn-outline" onclick="AdminWithdrawals.selectAll()">☑️ Select All</button>
                    </div>
                ` : ''}

                <div id="withdrawalsList">
                    <div class="loader"><div class="spinner"></div></div>
                </div>
            </div>
        `;

        router.reinjectNavigation();
        this.selectedIds = [];
        this.loadWithdrawals();
    }

    async loadWithdrawals() {
        try {
            const token = localStorage.getItem('admin_token');
            const data = await fetch(`/api/admin/withdrawals?status=${this.currentFilter}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => r.json());

            const withdrawals = data.data || [];
            const list = document.getElementById('withdrawalsList');

            if (withdrawals.length === 0) {
                list.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📭</div>
                        <h3 class="empty-state-title">No ${this.currentFilter} withdrawals</h3>
                    </div>
                `;
                return;
            }

            list.innerHTML = withdrawals.map((w, i) => `
                <div class="card mb-4 animate-fadeInUp" style="animation-delay:${i * 0.04}s">
                    <div class="flex justify-between items-start mb-3">
                        <div class="flex items-start gap-3">
                            ${this.currentFilter === 'pending' ? `
                                <input type="checkbox" class="withdrawal-checkbox" value="${w.id}" 
                                       style="margin-top:6px; width:18px; height:18px; cursor:pointer;"
                                       onchange="AdminWithdrawals.toggleSelect(${w.id}, this.checked)">
                            ` : ''}
                            <div>
                                <div class="font-bold text-lg">${w.full_name || w.phone}</div>
                                <div class="text-sm text-secondary">${w.full_name ? w.phone + ' • ' : ''}User #${w.user_id}</div>
                            </div>
                        </div>
                        <span class="badge badge-lg ${w.status === 'completed' ? 'badge-success' : w.status === 'rejected' ? 'badge-danger' : 'badge-warning'}">
                            ${w.status.toUpperCase()}
                        </span>
                    </div>

                    <div class="bank-info-card mb-3">
                        <div class="bank-info-row">
                            <span class="bank-info-label">Amount</span>
                            <span class="bank-info-value text-xl font-bold text-danger">-${Number(w.amount).toLocaleString()} ETB</span>
                        </div>
                        <div class="bank-info-row">
                            <span class="bank-info-label">Bank</span>
                            <span class="bank-info-value">${w.bank_name}</span>
                        </div>
                        <div class="bank-info-row">
                            <span class="bank-info-label">Account</span>
                            <span class="bank-info-value">${w.account_number}</span>
                        </div>
                        <div class="bank-info-row">
                            <span class="bank-info-label">Requested</span>
                            <span class="bank-info-value">${new Date(w.created_at).toLocaleString()}</span>
                        </div>
                        ${w.processed_at ? `
                            <div class="bank-info-row">
                                <span class="bank-info-label">Processed</span>
                                <span class="bank-info-value">${new Date(w.processed_at).toLocaleString()}</span>
                            </div>
                        ` : ''}
                        ${w.reason ? `
                            <div class="bank-info-row">
                                <span class="bank-info-label">Reason</span>
                                <span class="bank-info-value text-danger">${w.reason}</span>
                            </div>
                        ` : ''}
                    </div>

                    ${w.status === 'pending' ? `
                        <div class="flex gap-3">
                            <button class="btn btn-success btn-block" onclick="AdminWithdrawals.approve(${w.id})">
                                ✅ Approve & Pay
                            </button>
                            <button class="btn btn-danger btn-block" onclick="AdminWithdrawals.reject(${w.id})">
                                ❌ Reject
                            </button>
                        </div>
                    ` : ''}
                </div>
            `).join('');
        } catch (error) {
            document.getElementById('withdrawalsList').innerHTML = '<div class="empty-state"><p>Failed to load</p></div>';
        }
    }

    static toggleSelect(id, checked) {
        const instance = router.currentAdminPage;
        if (checked) {
            instance.selectedIds.push(id);
        } else {
            instance.selectedIds = instance.selectedIds.filter(i => i !== id);
        }
    }

    static selectAll() {
        const instance = router.currentAdminPage;
        const checkboxes = document.querySelectorAll('.withdrawal-checkbox');
        if (instance.selectedIds.length === checkboxes.length) {
            instance.selectedIds = [];
            checkboxes.forEach(cb => cb.checked = false);
        } else {
            instance.selectedIds = [];
            checkboxes.forEach(cb => { cb.checked = true; instance.selectedIds.push(parseInt(cb.value)); });
        }
    }

    static async bulkApprove() {
        const instance = router.currentAdminPage;
        if (instance.selectedIds.length === 0) {
            await Dialog.alert('Please select withdrawals to approve', 'No Selection', 'warning');
            return;
        }
        const confirmed = await Dialog.confirm(
            `Approve ${instance.selectedIds.length} selected withdrawals?`,
            'Bulk Approve',
            '✅ Approve All',
            'Cancel'
        );
        if (!confirmed) return;
        const token = localStorage.getItem('admin_token');
        await AdminAPI.post('/withdrawals/bulk-process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ ids: instance.selectedIds, action: 'completed' })
        });
        await Dialog.alert(`${instance.selectedIds.length} withdrawals approved!`, 'Done', 'success');
        router.navigate('/admin/withdrawals');
    }

    static async bulkReject() {
        const instance = router.currentAdminPage;
        if (instance.selectedIds.length === 0) {
            await Dialog.alert('Please select withdrawals to reject', 'No Selection', 'warning');
            return;
        }
        const reason = await Dialog.prompt('Rejection reason for all selected:', 'Enter reason...');
        if (!reason) return;
        const confirmed = await Dialog.confirm(
            `Reject ${instance.selectedIds.length} withdrawals? Amounts will be refunded.`,
            'Bulk Reject',
            '❌ Reject All',
            'Cancel',
            'danger'
        );
        if (!confirmed) return;
        const token = localStorage.getItem('admin_token');
        await AdminAPI.post('/withdrawals/bulk-process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ ids: instance.selectedIds, action: 'rejected', reason })
        });
        await Dialog.alert(`${instance.selectedIds.length} withdrawals rejected!`, 'Done', 'info');
        router.navigate('/admin/withdrawals');
    }

    static switchFilter(filter) {
        const instance = router.currentAdminPage;
        instance.currentFilter = filter;
        instance.selectedIds = [];
        instance.render();
    }

    static async approve(id) {
        const confirmed = await Dialog.confirm(
            'This will mark the withdrawal as paid.',
            'Confirm Payment',
            '✅ Yes, Mark as Paid',
            'Cancel'
        );
        if (!confirmed) return;
        const token = localStorage.getItem('admin_token');
        try {
            const res = await AdminAPI.post(`/withdrawals/${id}/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: 'completed' })
            });
            const data = await res.json();
            if (data.success) {
                await Dialog.alert('Withdrawal approved and marked as completed.', 'Payment Approved', 'success');
                router.navigate('/admin/withdrawals');
            }
        } catch (error) {
            await Dialog.alert('Failed to process withdrawal', 'Error', 'error');
        }
    }

    static async reject(id) {
        const reason = await Dialog.prompt('Rejection Reason', 'Enter reason for rejection...');
        if (!reason) return;
        const confirmed = await Dialog.confirm(
            `Reject this withdrawal? The amount will be refunded.`,
            'Confirm Rejection',
            '❌ Yes, Reject',
            'Cancel',
            'danger'
        );
        if (!confirmed) return;
        const token = localStorage.getItem('admin_token');
        try {
            const res = await AdminAPI.post(`/withdrawals/${id}/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: 'rejected', reason })
            });
            const data = await res.json();
            if (data.success) {
                await Dialog.alert('Withdrawal rejected and balance refunded to user.', 'Withdrawal Rejected', 'info');
                router.navigate('/admin/withdrawals');
            }
        } catch (error) {
            await Dialog.alert('Failed to reject withdrawal', 'Error', 'error');
        }
    }

    unmount() {}
}