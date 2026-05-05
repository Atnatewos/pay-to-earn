// public/admin/js/pages/withdrawals.js
class AdminWithdrawals {
    constructor(container) {
        this.container = container;
        this.currentFilter = 'pending';
    }

    render() {
        AdminSidebar.render('/admin/withdrawals');
        this.container.innerHTML = `
            <div class="admin-main">
                <div class="admin-page-header">
                    <h1 class="admin-page-title">Withdrawals</h1>
                    <p class="admin-page-subtitle">Process user withdrawal requests</p>
                </div>
                <div class="filter-tabs mb-4">
                    <button class="filter-tab ${this.currentFilter==='pending'?'active':''}" onclick="AdminWithdrawals.switchFilter('pending')">⏳ Pending</button>
                    <button class="filter-tab ${this.currentFilter==='completed'?'active':''}" onclick="AdminWithdrawals.switchFilter('completed')">✅ Completed</button>
                    <button class="filter-tab ${this.currentFilter==='rejected'?'active':''}" onclick="AdminWithdrawals.switchFilter('rejected')">❌ Rejected</button>
                </div>
                <div id="withdrawalsList"></div>
            </div>
        `;
        router.reinjectNavigation();
        setTimeout(() => this.loadWithdrawals(), 100);
    }

    async loadWithdrawals() {
        const list = document.getElementById('withdrawalsList');
        if (!list) return;
        list.innerHTML = '<div class="loader"><div class="spinner"></div></div>';

        try {
            const token = localStorage.getItem('admin_token');
            const apiUrl = APP_CONFIG.apiUrl;
            const response = await fetch(`${apiUrl}/admin/withdrawals?status=${this.currentFilter}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            const withdrawals = result.data || [];

            if (withdrawals.length === 0) {
                list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><h3>No ${this.currentFilter} withdrawals</h3></div>`;
                return;
            }

            list.innerHTML = withdrawals.map((w, i) => `
                <div class="card mb-4">
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <div class="font-bold text-lg">${w.full_name || w.phone}</div>
                            <div class="text-sm text-secondary">${w.phone} | User #${w.user_id}</div>
                        </div>
                        <span class="badge badge-lg ${w.status==='completed'?'badge-success':w.status==='rejected'?'badge-danger':'badge-warning'}">${w.status}</span>
                    </div>
                    <div class="bank-info-card mb-3">
                        <div class="bank-info-row"><span>Amount</span><span class="font-bold text-danger">-${Number(w.amount).toLocaleString()} ETB</span></div>
                        <div class="bank-info-row"><span>Bank</span><span>${w.bank_name}</span></div>
                        <div class="bank-info-row"><span>Account</span><span>${w.account_number}</span></div>
                        <div class="bank-info-row"><span>Date</span><span>${new Date(w.created_at).toLocaleString()}</span></div>
                    </div>
                    ${w.status==='pending' ? `
                        <div class="flex gap-3">
                            <button class="btn btn-success btn-block" onclick="AdminWithdrawals.approve(${w.id})">✅ Approve</button>
                            <button class="btn btn-danger btn-block" onclick="AdminWithdrawals.reject(${w.id})">❌ Reject</button>
                        </div>
                    ` : ''}
                </div>
            `).join('');
        } catch (error) {
            list.innerHTML = '<div class="empty-state"><p>Failed to load</p><button class="btn btn-primary" onclick="router.navigate(\'/admin/withdrawals\')">Retry</button></div>';
        }
    }

    static switchFilter(filter) {
        const instance = router.currentAdminPage;
        instance.currentFilter = filter;
        instance.render();
    }

    static async approve(id) {
        const confirmed = await Dialog.confirm(
            'This will mark the withdrawal as paid. The amount has already been deducted.',
            'Confirm Payment',
            '✅ Yes, Approve',
            'Cancel'
        );
        if (!confirmed) return;

        const token = localStorage.getItem('admin_token');
        const apiUrl = APP_CONFIG.apiUrl;
        try {
            await fetch(`${apiUrl}/withdrawals/${id}/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: 'completed' })
            });
            await Dialog.alert('Withdrawal approved and marked as completed.', 'Payment Approved', 'success');
            router.navigate('/admin/withdrawals');
        } catch (error) {
            await Dialog.alert('Failed to process withdrawal. Please try again.', 'Error', 'error');
        }
    }

    static async reject(id) {
        const reason = await Dialog.prompt('Rejection Reason', 'Enter the reason for rejection...');
        if (!reason) return;

        const confirmed = await Dialog.confirm(
            `Reject this withdrawal? The amount of will be refunded to the user's balance.`,
            'Confirm Rejection',
            '❌ Yes, Reject',
            'Cancel',
            'danger'
        );
        if (!confirmed) return;

        const token = localStorage.getItem('admin_token');
        const apiUrl = APP_CONFIG.apiUrl;
        try {
            await fetch(`${apiUrl}/withdrawals/${id}/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: 'rejected', reason })
            });
            await Dialog.alert('Withdrawal rejected and balance has been refunded to the user.', 'Withdrawal Rejected', 'info');
            router.navigate('/admin/withdrawals');
        } catch (error) {
            await Dialog.alert('Failed to reject withdrawal. Please try again.', 'Error', 'error');
        }
    }

    unmount() {}
}