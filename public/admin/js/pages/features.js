class AdminFeatures {
    constructor(container) { this.container = container; }
    render() {
        AdminSidebar.render('/admin/features');
        this.container.innerHTML = '<div class="admin-main"><div class="admin-page-header"><h1 class="admin-page-title">Features</h1></div><p class="text-secondary">under maintenance</p></div>';
    }
    unmount() {}
}
