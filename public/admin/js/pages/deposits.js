// public/admin/js/pages/deposits.js
class AdminDeposits {
    constructor(container) { this.container = container; }

    async render() {
        AdminSidebar.render('/admin/deposits');

        try {
            const data = await AdminAPI.get('/deposits/pending');
            const deposits = data.data || [];

            this.container.innerHTML = `
                <div class="admin-main">
                    <div class="admin-page-header">
                        <h1 class="admin-page-title">Pending Deposits</h1>
                        <p class="admin-page-subtitle">${deposits.length} deposits awaiting verification</p>
                    </div>
                    ${deposits.length > 0 ? deposits.map((d, i) => `
                        <div class="card mb-4 animate-fadeInUp" style="animation-delay:${i * 0.05}s">
                            <div class="flex justify-between items-start mb-3">
                                <div>
                                    <div class="font-bold text-lg">${d.full_name || '📱 ' + d.phone}</div>
                                    <div class="text-sm text-secondary">${d.full_name ? d.phone + ' • ' : ''}User #${d.user_id}</div>
                                </div>
                                <span class="badge badge-warning badge-lg">Pending</span>
                            </div>
                            <div class="bank-info-card mb-3">
                                <div class="bank-info-row"><span class="bank-info-label">Amount</span><span class="bank-info-value text-xl font-bold">${Number(d.amount).toLocaleString()} ETB</span></div>
                                <div class="bank-info-row"><span class="bank-info-label">Bank</span><span class="bank-info-value">${d.bank_name}</span></div>
                                <div class="bank-info-row"><span class="bank-info-label">Transaction ID</span><span class="bank-info-value">${d.transaction_id}</span></div>
                            </div>
                            <div class="flex gap-3">
                                <button class="btn btn-success btn-block" onclick="AdminDeposits.verify(${d.id})">✓ Verify</button>
                                <button class="btn btn-danger btn-block" onclick="AdminDeposits.reject(${d.id})">✕ Reject</button>
                            </div>
                        </div>
                    `).join('') : `<div class="empty-state"><div class="empty-state-icon">✅</div><h3>All Clear</h3><p>No pending deposits</p></div>`}
                </div>
            `;
        } catch (error) {
            this.container.innerHTML = `<div class="admin-main"><p>Failed to load deposits</p></div>`;
        }
        router.reinjectNavigation();
    }

    static async verify(id) {
        const confirmed = await Dialog.confirm('This will activate the user package and credit their balance.', 'Verify Deposit', '✅ Verify', 'Cancel');
        if (!confirmed) return;
        await AdminAPI.post(`/deposits/${id}/verify`);
        await Dialog.alert('Deposit verified! Package activated.', 'Success', 'success');
        router.navigate('/admin/deposits');
    }

    static async reject(id) {
        const reason = await Dialog.prompt('Rejection Reason', 'Enter reason...');
        if (!reason) return;
        const confirmed = await Dialog.confirm('Reject this deposit?', 'Confirm', '❌ Reject', 'Cancel', 'danger');
        if (!confirmed) return;
        await AdminAPI.post(`/deposits/${id}/reject`, { reason });
        await Dialog.alert('Deposit rejected.', 'Done', 'info');
        router.navigate('/admin/deposits');
    }

    unmount() {}
}