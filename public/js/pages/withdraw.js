class WithdrawPage {
    constructor(container) { this.container = container; }

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
            const [profile, banks, historyData] = await Promise.all([
                API.get('/auth/profile'), API.get('/bank'), API.get('/withdrawals/history?limit=10')
            ]);
            const user = profile.data;
            const accounts = banks.data;
            const history = historyData.data;

            document.getElementById('withdrawContent').innerHTML = `
                <div class="card card-gradient p-4 mb-4 text-center">
                    <div class="text-sm text-secondary mb-1">Available Balance</div>
                    <div class="text-4xl font-extrabold">${this.formatETB(user.balance)} ETB</div>
                </div>
                ${accounts.length > 0 ? `
                    <div class="card p-4 mb-4">
                        <h4 class="mb-3">💸 Request Withdrawal</h4>
                        <form id="withdrawForm">
                            <div class="form-group"><label class="form-label">Bank Account</label><select class="form-select" id="bankAccountId" required>${accounts.map(a => `<option value="${a.id}">${a.bank_name} - ${a.account_number}</option>`).join('')}</select></div>
                            <div class="form-group"><label class="form-label">Amount (ETB)</label><input type="number" class="form-input" id="amount" placeholder="Min 100 ETB" min="100" max="${user.balance}" required></div>
                            <button type="submit" class="btn btn-primary btn-block btn-lg">📤 Submit Withdrawal</button>
                        </form>
                    </div>
                ` : `<div class="card p-4 mb-4 text-center"><div class="text-4xl mb-3">🏦</div><p class="text-secondary mb-3">No bank account added</p><button class="btn btn-primary" onclick="router.navigate('/profile'); setTimeout(() => ProfilePage.showBankAccounts(), 300)">Add Bank Account</button></div>`}
                <div class="card"><h4 class="mb-3">📋 Withdrawal History</h4><div id="historyList">${history.withdrawals?.length > 0 ? history.withdrawals.map(w => `
                    <div class="list-item">
                        <div class="list-item-icon">💸</div><div class="list-item-content"><div class="list-item-title">${this.formatETB(w.amount)} ETB</div><div class="list-item-subtitle">${new Date(w.created_at).toLocaleDateString()}</div></div>
                        <span class="badge ${w.status === 'completed' ? 'badge-success' : w.status === 'rejected' ? 'badge-danger' : 'badge-warning'}">${w.status}</span>
                    </div>
                `).join('') : '<p class="text-center text-secondary py-3">No withdrawals yet</p>'}</div></div>
            `;

            const form = document.getElementById('withdrawForm');
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const amount = parseFloat(document.getElementById('amount').value);
                    const bankAccountId = document.getElementById('bankAccountId').value;
                    if (!amount || amount < 100) { Toast.show('Minimum 100 ETB', 'error'); return; }
                    if (amount > user.balance) { Toast.show('Insufficient balance', 'error'); return; }
                    try {
                        await API.post('/withdrawals', { amount, bankAccountId });
                        SuccessModal.show('Withdrawal Requested!', 'Your request is being processed. You will receive your funds within 24-48 hours.', [
                            { label: 'Amount', value: `${amount.toLocaleString()} ETB` },
                            { label: 'Status', value: '⏳ Pending' }
                        ], 'Done', () => this.loadForm());
                    } catch (error) { Toast.show(error.message, 'error'); }
                });
            }
        } catch (error) {
            document.getElementById('withdrawContent').innerHTML = `<div class="empty-state"><p>Failed to load</p><button class="btn btn-primary" onclick="router.navigate('/withdraw')">Retry</button></div>`;
        }
    }

    formatETB(amount) { return Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    unmount() {}
}
