// public/js/pages/profile.js
class ProfilePage {
    constructor(container) { this.container = container; }

    async render() {
        Navbar.render('Profile', false, []);
        BottomNav.render('/profile');
        DesktopSidebar.render('/profile');
        this.container.innerHTML = `<div class="page"><div id="profileContent"><div class="loader"><div class="spinner"></div></div></div></div>`;
        router.reinjectNavigation();
        await this.loadProfile();
    }

    async loadProfile() {
        try {
            const data = await API.get('/auth/profile');
            const user = data.data;
            document.getElementById('profileContent').innerHTML = `
                <div class="profile-header card card-gradient text-center mb-4" onclick="ProfilePage.showEditProfile()" style="cursor:pointer;">
                    <div class="profile-avatar">${user.avatar_url || '👤'}</div>
                    <h3 class="mt-2">${user.full_name || 'User'}</h3>
                    <p class="text-sm text-secondary">${user.phone}</p>
                    <p class="text-sm text-secondary">Referral: <strong>${user.referral_code}</strong></p>
                    <div class="mt-2">
                        ${user.active_package ? `<span class="badge badge-success">${user.active_package} Active</span>` : '<span class="badge badge-warning">No Package</span>'}
                        <span class="badge ${user.status === 'active' ? 'badge-success' : 'badge-danger'} ml-1">${user.status}</span>
                    </div>
                    <div class="text-xs text-muted mt-2">✏️ Tap to edit profile</div>
                </div>

                <div class="card mb-4">
                    <div class="list-item" onclick="router.navigate('/team')">
                        <div class="list-item-icon" style="background: #FFF0F6;">👥</div>
                        <div class="list-item-content"><div class="list-item-title">My Team</div><div class="list-item-subtitle">View referrals & network</div></div><span>→</span>
                    </div>
                    <hr class="divider">
                    <div class="list-item" onclick="ProfilePage.showBankAccounts()">
                        <div class="list-item-icon" style="background: #F0FCFC;">🏦</div>
                        <div class="list-item-content"><div class="list-item-title">Bank Accounts</div><div class="list-item-subtitle">Manage withdrawal accounts</div></div><span>→</span>
                    </div>
                    <hr class="divider">
                    <div class="list-item" onclick="router.navigate('/giftcode')">
                        <div class="list-item-icon" style="background: #FFF8E1;">🎁</div>
                        <div class="list-item-content"><div class="list-item-title">Redeem Gift Code</div><div class="list-item-subtitle">Enter promotional code</div></div><span>→</span>
                    </div>
                    <hr class="divider">
                    <div class="list-item" onclick="router.navigate('/deposit')">
                        <div class="list-item-icon" style="background: #F4F2FF;">💳</div>
                        <div class="list-item-content"><div class="list-item-title">Deposit History</div><div class="list-item-subtitle">View your deposits</div></div><span>→</span>
                    </div>
                    <hr class="divider">
                    <div class="list-item" onclick="router.navigate('/withdraw')">
                        <div class="list-item-icon" style="background: #E6F9F4;">💸</div>
                        <div class="list-item-content"><div class="list-item-title">Withdrawal History</div><div class="list-item-subtitle">View your withdrawals</div></div><span>→</span>
                    </div>
                    <hr class="divider">
                    <div class="list-item" onclick="router.navigate('/earnings')">
                        <div class="list-item-icon" style="background: #FFF5F5;">💰</div>
                        <div class="list-item-content"><div class="list-item-title">Earnings</div><div class="list-item-subtitle">View all earnings & commissions</div></div><span>→</span>
                    </div>
                    <hr class="divider">
                    <div class="list-item" onclick="router.navigate('/leaderboard')">
                        <div class="list-item-icon" style="background: #FFF8E1;">🏆</div>
                        <div class="list-item-content"><div class="list-item-title">Leaderboard</div><div class="list-item-subtitle">Top earners & recruiters</div></div><span>→</span>
                    </div>
                    <hr class="divider">
                    <div class="list-item" onclick="router.navigate('/support')">
                        <div class="list-item-icon" style="background: #FFF0F0;">💬</div>
                        <div class="list-item-content"><div class="list-item-title">Customer Support</div><div class="list-item-subtitle">Get help via Telegram</div></div><span>→</span>
                    </div>
                </div>

                <button class="btn btn-danger btn-block" onclick="ProfilePage.logout()">🚪 Logout</button>
            `;
        } catch (error) {
            document.getElementById('profileContent').innerHTML = `<div class="empty-state"><p>Failed to load</p><button class="btn btn-primary" onclick="router.navigate('/profile')">Retry</button></div>`;
        }
    }

    static async showEditProfile() {
        const data = await API.get('/auth/profile');
        const user = data.data;
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal animate-slideUp" style="max-width:420px;">
                <div class="modal-header"><h3 class="modal-title">Edit Profile</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button></div>
                <form id="editProfileForm">
                    <div class="form-group"><label class="form-label">Full Name</label><input type="text" class="form-input" id="editFullName" value="${user.full_name || ''}" placeholder="Your full name"></div>
                    <div class="form-group"><label class="form-label">Phone Number</label><input type="text" class="form-input" value="${user.phone}" readonly style="opacity:0.7;"></div>
                    <div class="form-group"><label class="form-label">Choose Avatar</label>
                        <div class="grid grid-cols-5 gap-2" id="avatarGrid">
                            ${['👤','👨','👩','🦸','🧑‍💼','👨‍💼','👩‍💼','💎','🚀','⭐','🦊','🐱','🦁','🐼','🎯'].map(a => `<button type="button" class="btn btn-outline btn-sm avatar-option ${user.avatar_url === a ? 'btn-primary' : ''}" data-avatar="${a}">${a}</button>`).join('')}
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">💾 Save Changes</button>
                </form>
            </div>
        `;
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        document.body.appendChild(overlay);
        document.querySelectorAll('.avatar-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('btn-primary'));
                btn.classList.add('btn-primary');
            });
        });
        document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullName = document.getElementById('editFullName').value;
            const selectedAvatar = document.querySelector('.avatar-option.btn-primary');
            const avatarUrl = selectedAvatar ? selectedAvatar.dataset.avatar : user.avatar_url;
            try {
                await fetch('/api/auth/profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                    body: JSON.stringify({ fullName, avatarUrl })
                });
                overlay.remove();
                Toast.show('Profile updated!');
                router.navigate('/profile');
            } catch (error) { Toast.show('Failed to update', 'error'); }
        });
    }

    static async showBankAccounts() {
        Modal.show(`
            <div class="modal-header"><h3 class="modal-title">🏦 Bank Accounts</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button></div>
            <div id="bankContent"><div class="loader"><div class="spinner"></div></div></div>
            <form id="addBankForm" class="mt-4">
                <div class="form-group"><label class="form-label">Bank Name</label><select class="form-select" id="bankName"><option value="CBE">CBE</option><option value="Awash">Awash</option><option value="Dashen">Dashen</option><option value="Abyssinia">Abyssinia</option><option value="Wegagen">Wegagen</option></select></div>
                <div class="form-group"><label class="form-label">Account Number</label><input type="text" class="form-input" id="accountNumber" required></div>
                <button type="submit" class="btn btn-primary btn-block">Add Account</button>
            </form>
        `);
        document.getElementById('addBankForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            try { await API.post('/bank', { bankName: document.getElementById('bankName').value, accountNumber: document.getElementById('accountNumber').value }); document.querySelector('.modal-overlay').remove(); ProfilePage.showBankAccounts(); }
            catch (error) { Toast.show(error.message, 'error'); }
        });
        try {
            const data = await API.get('/bank');
            document.getElementById('bankContent').innerHTML = data.data.length > 0 ? data.data.map(a => `<div class="list-item"><div class="list-item-icon">🏦</div><div class="list-item-content"><div class="list-item-title">${a.bank_name}</div><div class="list-item-subtitle">${a.account_number}</div></div></div>`).join('') : '<p class="text-center text-secondary py-4">No accounts</p>';
        } catch (error) { document.getElementById('bankContent').innerHTML = '<p class="text-center text-secondary">Failed to load</p>'; }
    }

    static logout() { store.logout(); router.navigate('/login'); }
    unmount() {}
}