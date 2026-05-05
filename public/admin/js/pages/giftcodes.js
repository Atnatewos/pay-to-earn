// public/admin/js/pages/giftcodes.js
class AdminGiftCodes {
    constructor(container) { this.container = container; }

    render() {
        AdminSidebar.render('/admin/giftcodes');
        this.container.innerHTML = `
            <div class="admin-main">
                <div class="admin-page-header">
                    <h1 class="admin-page-title">Gift Codes</h1>
                    <p class="admin-page-subtitle">Create and manage promotional codes</p>
                </div>

                <div class="card mb-4">
                    <h4 class="mb-3">🎁 Create New Code</h4>
                    <form id="createCodeForm">
                        <div class="grid grid-cols-2 gap-3 mb-3">
                            <div class="form-group">
                                <label class="form-label">Amount (ETB)</label>
                                <input type="number" class="form-input" id="codeAmount" placeholder="e.g., 100" required min="1">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Max Uses</label>
                                <input type="number" class="form-input" id="maxUses" value="1" required min="1">
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Expiry Date (Optional)</label>
                            <input type="date" class="form-input" id="expiryDate">
                        </div>
                        <button type="submit" class="btn btn-primary btn-block">Generate Code</button>
                    </form>
                </div>

                <div class="card">
                    <h4 class="mb-3">📋 Existing Codes</h4>
                    <div id="codesList"><div class="loader"><div class="spinner"></div></div></div>
                </div>
            </div>
        `;

        document.getElementById('createCodeForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createCode();
        });

        router.reinjectNavigation();
        setTimeout(() => this.loadCodes(), 100);
    }

    async createCode() {
        const amount = parseFloat(document.getElementById('codeAmount').value);
        const maxUses = parseInt(document.getElementById('maxUses').value);
        const expiresAt = document.getElementById('expiryDate').value || null;

        if (!amount || amount <= 0) {
            await Dialog.alert('Please enter a valid amount greater than 0.', 'Invalid Amount', 'warning');
            return;
        }

        const token = localStorage.getItem('admin_token');
        const apiUrl = APP_CONFIG.apiUrl;
        try {
            const response = await fetch(`${apiUrl}/giftcodes/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ amount, maxUses, expiresAt })
            });
            const result = await response.json();

            if (result.success) {
                const code = result.data.code;
                const overlay = document.createElement('div');
                overlay.className = 'modal-overlay';
                overlay.innerHTML = `
                    <div class="modal animate-scaleIn" style="max-width:420px; text-align:center;">
                        <div class="text-5xl mb-4">🎁</div>
                        <h3 class="mb-2">Code Generated!</h3>
                        <p class="text-secondary mb-4">Share this code with users</p>
                        <div class="referral-link-box mb-3">
                            <input type="text" value="${code}" readonly id="generatedCode" style="font-size:1.3rem; text-align:center; letter-spacing:2px; font-weight:bold;">
                            <button class="btn btn-primary btn-sm" onclick="navigator.clipboard.writeText('${code}'); Toast.show('Copied!')">📋</button>
                        </div>
                        <div class="card mb-4" style="background:var(--color-success-bg);">
                            <div class="flex justify-between py-2"><span class="text-sm">Amount</span><span class="font-bold">${amount} ETB</span></div>
                            <div class="flex justify-between py-2"><span class="text-sm">Max Uses</span><span class="font-bold">${maxUses}</span></div>
                        </div>
                        <button class="btn btn-success btn-block" onclick="this.closest('.modal-overlay').remove(); router.navigate('/admin/giftcodes')">Done</button>
                    </div>
                `;
                overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
                document.body.appendChild(overlay);
            } else {
                await Dialog.alert(result.message || 'Failed to create code', 'Error', 'error');
            }
        } catch (error) {
            await Dialog.alert('Failed to create gift code', 'Error', 'error');
        }
    }

    async loadCodes() {
        const container = document.getElementById('codesList');
        if (!container) return;

        try {
            const token = localStorage.getItem('admin_token');
            const apiUrl = APP_CONFIG.apiUrl;
            const response = await fetch(`${apiUrl}/giftcodes/admin/list`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            const codes = result.data || [];

            if (codes.length === 0) {
                container.innerHTML = '<p class="text-center text-secondary py-4">No gift codes created yet</p>';
                return;
            }

            container.innerHTML = codes.map(c => `
                <div class="list-item">
                    <div class="list-item-icon">🎁</div>
                    <div class="list-item-content">
                        <div class="list-item-title" style="font-family:monospace;letter-spacing:1px;">${c.code}</div>
                        <div class="list-item-subtitle">
                            ${c.amount} ETB | Used: ${c.times_used}/${c.max_uses} | ${c.expires_at ? 'Expires: ' + new Date(c.expires_at).toLocaleDateString() : 'No expiry'}
                        </div>
                    </div>
                    <button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText('${c.code}'); Toast.show('Copied!')">📋</button>
                </div>
            `).join('');
        } catch (error) {
            container.innerHTML = '<p class="text-center text-secondary">Failed to load codes</p>';
        }
    }

    unmount() {}
}