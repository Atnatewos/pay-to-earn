// public/js/pages/admin-withdrawals.js
class AdminWithdrawalsPage {
    constructor(container) { this.container = container; }
    async render() {
        document.querySelector('.bottom-nav')?.remove();
        Navbar.render('Withdrawals', true, [
            { icon: '🏠', title: 'Dashboard', onclick: 'router.navigate("/admin/dashboard")' }
        ]);
        this.container.innerHTML = `<div class="page"><div class="page-header"><h2>Withdrawals</h2></div><p class="text-secondary">Withdrawal processing coming soon.</p></div>`;
    }
    unmount() {}
}