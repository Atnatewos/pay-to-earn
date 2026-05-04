// public/js/pages/admin-users.js
class AdminUsersPage {
    constructor(container) { this.container = container; }
    async render() {
        document.querySelector('.bottom-nav')?.remove();
        Navbar.render('Users', true, [
            { icon: '🏠', title: 'Dashboard', onclick: 'router.navigate("/admin/dashboard")' }
        ]);
        this.container.innerHTML = `<div class="page"><div class="page-header"><h2>Users</h2></div><p class="text-secondary">User management coming soon.</p></div>`;
    }
    unmount() {}
}