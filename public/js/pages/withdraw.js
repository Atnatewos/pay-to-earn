// public/js/pages/withdraw.js
class WithdrawPage {
    constructor(container) { this.container = container; this.historyFilter = 'all'; }

    async render() {
        Navbar.render('Withdraw', true);
        document.querySelector('.bottom-nav')?.remove();
        DesktopSidebar.render('/withdraw');
        this.container.innerHTML = `<div class="page animate-fadeInUp"><div id="withdrawContent"><div class="loader"><div class="spinner"></div></div></div></div>`;
        router.reinjectNavigation();
        await this.loadForm();
    }

    async loadForm() {
        try {
            const [profile, banks, historyData, configData] = await Promise.all([
                API.get('/auth/profile'),
                API.get('/bank'),
                API.get('/withdrawals/history?limit=50'),
                fetch(`${APP_CONFIG.apiUrl}/config/withdrawal-amounts`).then(r => r.json())
            ]);

            const user = profile.data;
            const accounts = banks.data;
            const allHistory = historyData.withdrawals || historyData.data || [];
            const amounts = configData.data || [300, 1000, 4000, 10000, 25000, 50000, 100000];
            const earningsBal = parseFloat(user.earnings_balance || 0);

            document.getElementById('withdrawContent').innerHTML = `
                <div class="card card-gradient p-4 mb-4 text-center">
                    <div class="text-sm text-secondary mb-1">Available Earnings</div>
                    <div class="text-4xl font-extrabold">${this.formatETB(earningsBal)} ETB</div>
                    <div class="text-xs text-secondary mt-1">Capital: ${this.formatETB(user.capital || 0)} ETB (Locked)</div>
                </div>

                ${accounts.length > 0 ? `
                    <div class="card p-4 mb-4">
                        <h4 class="mb-3">💸 Request Withdrawal</h4>
                        <form id="withdrawForm">
                            <div class="form-group"><label class="form-label">Select Bank Account</label><select class="form-select" id="bankAccountId" required>${accounts.map(a => `<option value="${a.id}">${a.bank_name} - ${a.account_number}</option>`).join('')}</select></div>
                            <div class="form-group"><label class="form-label">Amount (ETB)</label>
                                <div class="grid grid-cols-3 gap-2 mb-2" id="quickAmounts">${amounts.map(a => `<button type="button" class="amount-chip" data-amount="${a}">${a.toLocaleString()}</button>`).join('')}</div>
                                <input type="number" class="form-input" id="amount" placeholder="Select an amount above" required readonly>
                            </div>
                            <div class="form-group"><label class="form-label">🔒 Password (Required)</label><input type="password" class="form-input" id="withdrawPassword" placeholder="Enter your password" required autocomplete="off"></div>
                            <button type="submit" class="btn btn-primary btn-block btn-lg">📤 Submit Withdrawal</button>
                        </form>
                    </div>
                ` : `
                    <div class="card p-4 mb-4 text-center"><div class="text-4xl mb-3">🏦</div><p class="text-secondary mb-3">No bank account added yet</p><button class="btn btn-primary" onclick="router.navigate('/profile'); setTimeout(() => ProfilePage.showBankAccounts(), 300)">Add Bank Account</button></div>
                `}

                <div class="card">
                    <h4 class="mb-3">📋 Withdrawal History</h4>
                    <div class="filter-tabs mb-3">
                        <button class="filter-tab ${this.historyFilter==='all'?'active':''}" onclick="WithdrawPage.filterHistory('all')">All</button>
                        <button class="filter-tab ${this.historyFilter==='pending'?'active':''}" onclick="WithdrawPage.filterHistory('pending')">⏳ Pending</button>
                        <button class="filter-tab ${this.historyFilter==='completed'?'active':''}" onclick="WithdrawPage.filterHistory('completed')">✅ Completed</button>
                        <button class="filter-tab ${this.historyFilter==='rejected'?'active':''}" onclick="WithdrawPage.filterHistory('rejected')">❌ Rejected</button>
                    </div>
                    <div id="historyList">${this.renderHistory(allHistory)}</div>
                </div>
            `;

            document.querySelectorAll('.amount-chip').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.getElementById('amount').value = btn.dataset.amount;
                    document.querySelectorAll('.amount-chip').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                });
            });

            const form = document.getElementById('withdrawForm');
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const amount = parseFloat(document.getElementById('amount').value);
                    const bankAccountId = document.getElementById('bankAccountId').value;
                    const passwordInput = document.getElementById('withdrawPassword');
                    const password = passwordInput ? passwordInput.value : '';
                    if (!amount) { Toast.show('Please select an amount', 'error'); return; }
                    if (!password || password.trim() === '') { Toast.show('Password is required', 'error'); return; }
                    if (amount > earningsBal) { Toast.show(`Insufficient earnings. ${this.formatETB(earningsBal)} ETB available.`, 'error'); return; }
                    try {
                        const body = { amount, bankAccountId, password: password.trim(), fullName: user.full_name || '', phoneNumber: user.phone || '' };
                        await API.post('/withdrawals', body);
                        SuccessModal.show('Withdrawal Requested! 🎉', 'Processing within 24-48 hours.', [{ label: 'Amount', value: `${amount.toLocaleString()} ETB` }, { label: 'Status', value: '⏳ Pending' }], 'Done', () => this.loadForm());
                    } catch (error) {  }
                });
            }
        } catch (error) {
            document.getElementById('withdrawContent').innerHTML = `<div class="empty-state"><p>Failed to load</p><button class="btn btn-primary" onclick="router.navigate('/withdraw')">Retry</button></div>`;
        }
    }

    renderHistory(allHistory) {
        const filtered = this.historyFilter === 'all' ? allHistory : allHistory.filter(w => w.status === this.historyFilter);
        if (filtered.length === 0) return '<p class="text-center text-secondary py-4">No withdrawals found</p>';
        return filtered.map(w => `
            <div class="list-item">
                <div class="list-item-icon">💸</div>
                <div class="list-item-content">
                    <div class="list-item-title">${this.formatETB(w.amount)} ETB</div>
                    <div class="list-item-subtitle">${w.bank_name || ''} ${w.account_number || ''} | ${new Date(w.created_at).toLocaleDateString()}</div>
                    ${w.reason ? `<div class="text-xs text-danger">${w.reason}</div>` : ''}
                </div>
                <span class="badge ${w.status==='completed'?'badge-success':w.status==='rejected'?'badge-danger':'badge-warning'}">${w.status}</span>
            </div>
        `).join('');
    }

    static filterHistory(filter) {
        const instance = router.currentPage;
        instance.historyFilter = filter;
        instance.loadForm();
    }

    formatETB(amount) { return Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    unmount() {}
}