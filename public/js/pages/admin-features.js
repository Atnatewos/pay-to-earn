// public/js/pages/admin-features.js
class AdminFeaturesPage {
    constructor(container) { this.container = container; }
    async render() {
        document.querySelector('.bottom-nav')?.remove();
        Navbar.render('Features', true, [
            { icon: '🏠', title: 'Dashboard', onclick: 'router.navigate("/admin/dashboard")' }
        ]);
        this.container.innerHTML = `<div class="page"><div class="page-header"><h2>System Features</h2></div><p class="text-secondary">Feature toggles coming soon.</p></div>`;
    }
    unmount() {}
}