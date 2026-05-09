// public/js/pages/deposit.js
class DepositPage {
    constructor(container) { this.container = container; this.historyFilter = 'all'; }

    render() {
        Navbar.render('Deposit', true);
        document.querySelector('.bottom-nav')?.remove();
        DesktopSidebar.render('/deposit');

        const params = new URLSearchParams(window.location.search);
        const presetAmount = params.get('amount') || '';
        const presetPackage = params.get('package') || '';

        this.container.innerHTML = `
            <div class="page animate-fadeInUp">
                <div class="card-glass p-6">
                    <h3 class="mb-4">💳 Deposit Funds</h3>
                    ${presetPackage ? `
                        <div class="card card-accent mb-4 p-3">
                            <div class="flex items-center gap-2">
                                <span class="text-xl">💎</span><div><div class="font-semibold">Activating: ${presetPackage}</div><div class="text-sm text-secondary">Amount: ${Number(presetAmount).toLocaleString()} ETB</div></div>
                            </div>
                        </div>
                    ` : ''}
                    <div class="card p-4 mb-4" style="background:rgba(16,185,129,0.08); border:2px solid rgba(16,185,129,0.2);">
                        <p class="text-sm font-semibold mb-2">📋 Transfer to:</p>
                        <p class="font-bold">Bank: <strong>${APP_CONFIG.bankName}</strong></p>
                        <p class="font-bold">Account: <strong>${APP_CONFIG.bankAccount}</strong> <button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText('${APP_CONFIG.bankAccount}'); Toast.show('Copied!')" title="Copy">📋 Copy</button></p>
                        <p class="font-bold">Name: <strong>${APP_CONFIG.bankHolder}</strong></p>
                    </div>
                    <form id="depositForm">
                        <div class="form-group">
                            <label class="form-label">Amount (ETB)</label>
                            <div class="quick-amounts">
                                ${[1600, 4000, 7200, 16000, 36000, 90000, 140000, 330000].map(a => `<button type="button" class="amount-chip ${presetAmount == a ? 'selected' : ''}" data-amount="${a}">${a.toLocaleString()}</button>`).join('')}
                            </div>
                            <input type="number" class="form-input mt-2" id="amount" value="${presetAmount}" placeholder="Enter amount" required>
                        </div>
                        <div class="form-group"><label class="form-label">Bank Name</label><select class="form-select" id="bankName"><option value="CBE">CBE</option><option value="Awash">Awash</option><option value="Dashen">Dashen</option></select></div>
                        <div class="form-group"><label class="form-label">Transaction ID</label><input type="text" class="form-input" id="transactionId" placeholder="Reference number" required></div>
                        <button type="submit" class="btn btn-primary btn-block btn-lg">📤 Submit Deposit</button>
                    </form>
                    <p class="text-xs text-secondary text-center mt-4">Min: 1,600 ETB | Max: 330,000 ETB | Verified within 24h</p>
                </div>

                <div class="card mt-4">
                    <h4 class="mb-3">📋 Deposit History</h4>
                    <div class="filter-tabs mb-3">
                        <button class="filter-tab ${this.historyFilter==='all'?'active':''}" onclick="this.closest('.page').querySelectorAll('.filter-tab').forEach(b=>b.classList.remove('active'));this.classList.add('active');DepositPage.filterHistory('all')">All</button>
                        <button class="filter-tab ${this.historyFilter==='pending'?'active':''}" onclick="this.closest('.page').querySelectorAll('.filter-tab').forEach(b=>b.classList.remove('active'));this.classList.add('active');DepositPage.filterHistory('pending')">⏳ Pending</button>
                        <button class="filter-tab ${this.historyFilter==='verified'?'active':''}" onclick="this.closest('.page').querySelectorAll('.filter-tab').forEach(b=>b.classList.remove('active'));this.classList.add('active');DepositPage.filterHistory('verified')">✅ Approved</button>
                        <button class="filter-tab ${this.historyFilter==='rejected'?'active':''}" onclick="this.closest('.page').querySelectorAll('.filter-tab').forEach(b=>b.classList.remove('active'));this.classList.add('active');DepositPage.filterHistory('rejected')">❌ Rejected</button>
                    </div>
                    <div id="depositHistory"><div class="loader"><div class="spinner"></div></div></div>
                </div>
            </div>
        `;

        document.querySelectorAll('.amount-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('amount').value = btn.dataset.amount;
                document.querySelectorAll('.amount-chip').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });

        document.getElementById('depositForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const amount = parseFloat(document.getElementById('amount').value);
            const bankName = document.getElementById('bankName').value;
            const transactionId = document.getElementById('transactionId').value;
            if (!amount || amount < 1600 || amount > 330000) { Toast.show('Amount must be 1,600-330,000 ETB', 'error'); return; }
            try {
                await API.post('/deposits', { amount, bankName, transactionId });
                SuccessModal.show('Deposit Submitted!', 'Your deposit is pending verification. We will review it within 24 hours.', [
                    { label: 'Amount', value: `${amount.toLocaleString()} ETB` },
                    { label: 'Status', value: '⏳ Pending Verification' }
                ], 'Go to Home', () => router.navigate('/home'));
            } catch (error) { Toast.show(error.message, 'error'); }
        });

        this.loadHistory();
    }

    async loadHistory() {
        try {
            const data = await API.get('/deposits/history');
            const deposits = data.data || [];
            this.renderHistory(deposits);
        } catch (error) {
            document.getElementById('depositHistory').innerHTML = '<p class="text-center text-secondary py-3">Failed to load history</p>';
        }
    }

    renderHistory(deposits) {
        const filtered = this.historyFilter === 'all' ? deposits : deposits.filter(d => d.status === this.historyFilter);
        const container = document.getElementById('depositHistory');
        
        if (filtered.length === 0) {
            container.innerHTML = '<p class="text-center text-secondary py-4">No deposits found</p>';
            return;
        }

        container.innerHTML = filtered.map(d => `
            <div class="list-item">
                <div class="list-item-icon">💳</div>
                <div class="list-item-content">
                    <div class="list-item-title">${Number(d.amount).toLocaleString()} ETB</div>
                    <div class="list-item-subtitle">${d.bank_name} | ${new Date(d.created_at).toLocaleString()}</div>
                    ${d.transaction_id ? `<div class="text-xs text-muted">Ref: ${d.transaction_id}</div>` : ''}
                </div>
                <span class="badge ${d.status==='verified'?'badge-success':d.status==='rejected'?'badge-danger':'badge-warning'}">${d.status}</span>
            </div>
        `).join('');
    }

    static filterHistory(filter) {
        const instance = router.currentPage;
        instance.historyFilter = filter;
        instance.loadHistory();
    }

    unmount() {}
}