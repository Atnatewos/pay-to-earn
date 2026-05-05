// public/admin/js/pages/deposits.js
class AdminDeposits {
    constructor(container) { this.container = container; }

    async render() {
        AdminSidebar.render('/admin/deposits');
        this.container.innerHTML = `<div class="admin-main"><div class="admin-page-header"><h1 class="admin-page-title">Pending Deposits</h1><p class="admin-page-subtitle">Loading...</p></div><div id="depositsList"><div class="loader"><div class="spinner"></div></div></div></div>`;
        router.reinjectNavigation();
        await this.loadDeposits();
    }

    async loadDeposits() {
        try {
            const token = localStorage.getItem('admin_token');
            const apiUrl = APP_CONFIG.apiUrl;
            
            const response = await fetch(`${apiUrl}/deposits/pending`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const result = await response.json();
            const deposits = result.data || result || [];
            
            const list = document.getElementById('depositsList');
            
            if (!deposits || deposits.length === 0) {
                list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">✅</div><h3 class="empty-state-title">All Clear</h3><p class="empty-state-description">No pending deposits to review</p></div>`;
                document.querySelector('.admin-page-subtitle').textContent = '0 deposits awaiting verification';
                return;
            }

            document.querySelector('.admin-page-subtitle').textContent = `${deposits.length} deposits awaiting verification`;

            list.innerHTML = deposits.map((d, i) => `
                <div class="card mb-4 animate-fadeInUp" style="animation-delay:${i * 0.05}s">
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <div class="font-bold text-lg">${d.full_name || d.phone || 'Unknown'}</div>
                            <div class="text-sm text-secondary">${d.phone || ''} • User #${d.user_id}</div>
                        </div>
                        <span class="badge badge-warning badge-lg">Pending</span>
                    </div>
                    <div class="bank-info-card mb-3">
                        <div class="bank-info-row"><span class="bank-info-label">Amount</span><span class="bank-info-value text-xl font-bold">${Number(d.amount || 0).toLocaleString()} ETB</span></div>
                        <div class="bank-info-row"><span class="bank-info-label">Bank</span><span class="bank-info-value">${d.bank_name || 'N/A'}</span></div>
                        <div class="bank-info-row"><span class="bank-info-label">Transaction ID</span><span class="bank-info-value">${d.transaction_id || 'N/A'}</span></div>
                        <div class="bank-info-row"><span class="bank-info-label">Date</span><span class="bank-info-value">${new Date(d.created_at).toLocaleString()}</span></div>
                    </div>
                    <div class="flex gap-3">
                        <button class="btn btn-success btn-block" onclick="AdminDeposits.verifyDeposit(${d.id})">✅ Verify</button>
                        <button class="btn btn-danger btn-block" onclick="AdminDeposits.rejectDeposit(${d.id})">❌ Reject</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Deposits error:', error);
            document.getElementById('depositsList').innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3 class="empty-state-title">Failed to load deposits</h3><p class="empty-state-description">${error.message}</p><button class="btn btn-primary" onclick="router.navigate('/admin/deposits')">Retry</button></div>`;
        }
    }

    static async verifyDeposit(id) {
        const confirmed = await Dialog.confirm('Verify this deposit? Package will be activated and commissions distributed.', 'Verify Deposit', '✅ Verify', 'Cancel');
        if (!confirmed) return;
        
        const token = localStorage.getItem('admin_token');
        const apiUrl = APP_CONFIG.apiUrl;
        
        try {
            const response = await fetch(`${apiUrl}/deposits/${id}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                await Dialog.alert('Deposit verified successfully!', 'Success', 'success');
                router.navigate('/admin/deposits');
            } else {
                await Dialog.alert(data.message || 'Failed to verify', 'Error', 'error');
            }
        } catch (error) {
            await Dialog.alert('Failed to verify deposit', 'Error', 'error');
        }
    }

    static async rejectDeposit(id) {
        const reason = await Dialog.prompt('Rejection Reason', 'Enter reason for rejection...');
        if (!reason) return;
        
        const confirmed = await Dialog.confirm('Reject this deposit?', 'Confirm Rejection', '❌ Reject', 'Cancel', 'danger');
        if (!confirmed) return;
        
        const token = localStorage.getItem('admin_token');
        const apiUrl = APP_CONFIG.apiUrl;
        
        try {
            const response = await fetch(`${apiUrl}/deposits/${id}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ reason })
            });
            const data = await response.json();
            if (data.success) {
                await Dialog.alert('Deposit rejected.', 'Done', 'info');
                router.navigate('/admin/deposits');
            } else {
                await Dialog.alert(data.message || 'Failed to reject', 'Error', 'error');
            }
        } catch (error) {
            await Dialog.alert('Failed to reject deposit', 'Error', 'error');
        }
    }

    unmount() {}
}