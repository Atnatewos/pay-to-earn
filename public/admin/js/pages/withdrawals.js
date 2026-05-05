// public/admin/js/pages/withdrawals.js
class AdminWithdrawals {
    constructor(container) {
        this.container = container;
        this.currentFilter = 'pending';
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
                    <button class="filter-tab ${this.currentFilter === 'pending' ? 'active' : ''}" onclick="AdminWithdrawals.switchFilter('pending')">⏳ Pending</button>
                    <button class="filter-tab ${this.currentFilter === 'completed' ? 'active' : ''}" onclick="AdminWithdrawals.switchFilter('completed')">✅ Completed</button>
                    <button class="filter-tab ${this.currentFilter === 'rejected' ? 'active' : ''}" onclick="AdminWithdrawals.switchFilter('rejected')">❌ Rejected</button>
                </div>
                <div id="withdrawalsList"><div class="loader"><div class="spinner"></div></div></div>
            </div>
        `;
        router.reinjectNavigation();
        this.loadWithdrawals();
    }

    async loadWithdrawals() {
        try {
            const data = await AdminAPI.get(`/withdrawals?status=${this.currentFilter}`);
            const withdrawals = data.data || [];
            const list = document.getElementById('withdrawalsList');

            if (withdrawals.length === 0) {
                list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><h3>No ${this.currentFilter} withdrawals</h3></div>`;
                return;
            }

            list.innerHTML = withdrawals.map((w, i) => `
                <div class="card mb-4 animate-fadeInUp" style="animation-delay:${i * 0.04}s">
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <div class="font-bold text-lg">${w.full_name || w.phone}</div>
                            <div class="text-sm text-secondary">${w.full_name ? w.phone + ' • ' : ''}User #${w.user_id}</div>
                        </div>
                        <span class="badge badge-lg ${w.status === 'completed' ? 'badge-success' : w.status === 'rejected' ? 'badge-danger' : 'badge-warning'}">${w.status.toUpperCase()}</span>
                    </div>
                    <div class="bank-info-card mb-3">
                        <div class="bank-info-row"><span class="bank-info-label">Amount</span><span class="bank-info-value text-xl font-bold text-danger">-${Number(w.amount).toLocaleString()} ETB</span></div>
                        <div class="bank-info-row"><span class="bank-info-label">Bank</span><span class="bank-info-value">${w.bank_name}</span></div>
                        <div class="bank-info-row"><span class="bank-info-label">Account</span><span class="bank-info-value">${w.account_number}</span></div>
                        <div class="bank-info-row"><span class="bank-info-label">Requested</span><span class="bank-info-value">${new Date(w.created_at).toLocaleString()}</span></div>
                    </div>
                    ${w.status === 'pending' ? `
                        <div class="flex gap-3">
                            <button class="btn btn-success btn-block" onclick="AdminWithdrawals.approve(${w.id})">✅ Approve</button>
                            <button class="btn btn-danger btn-block" onclick="AdminWithdrawals.reject(${w.id})">❌ Reject</button>
                        </div>
                    ` : ''}
                </div>
            `).join('');
        } catch (error) {
            document.getElementById('withdrawalsList').innerHTML = '<div class="empty-state"><p>Failed to load</p></div>';
        }
    }

    static switchFilter(filter) {
        const instance = router.currentAdminPage;
        instance.currentFilter = filter;
        instance.render();
    }

    static async approve(id) {
        const confirmed = await Dialog.confirm('Mark this withdrawal as paid?', 'Confirm Payment', '✅ Approve', 'Cancel');
        if (!confirmed) return;
        await AdminAPI.post(`/withdrawals/${id}/process`, { status: 'completed' });
        await Dialog.alert('Withdrawal approved!', 'Success', 'success');
        router.navigate('/admin/withdrawals');
    }

    static async reject(id) {
        const reason = await Dialog.prompt('Rejection Reason', 'Enter reason...');
        if (!reason) return;
        const confirmed = await Dialog.confirm('Reject and refund?', 'Confirm', '❌ Reject', 'Cancel', 'danger');
        if (!confirmed) return;
        await AdminAPI.post(`/withdrawals/${id}/process`, { status: 'rejected', reason });
        await Dialog.alert('Withdrawal rejected. Balance refunded.', 'Done', 'info');
        router.navigate('/admin/withdrawals');
    }

    unmount() {}
}