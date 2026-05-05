// public/admin/js/pages/features.js
class AdminFeatures {
    constructor(container) { this.container = container; }

    render() {
        AdminSidebar.render('/admin/features');
        this.container.innerHTML = `
            <div class="admin-main">
                <div class="admin-page-header"><h1 class="admin-page-title">System Features</h1><p class="admin-page-subtitle">Toggle platform features</p></div>
                <div id="featuresList"></div>
            </div>
        `;
        router.reinjectNavigation();
        setTimeout(() => this.loadFeatures(), 100);
    }

    async loadFeatures() {
        const list = document.getElementById('featuresList');
        if (!list) return;
        list.innerHTML = '<div class="loader"><div class="spinner"></div></div>';

        try {
            const token = localStorage.getItem('admin_token');
            const apiUrl = APP_CONFIG.apiUrl;
            const response = await fetch(`${apiUrl}/admin/features`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            const features = result.data || [];

            list.innerHTML = `
                <div class="card card-accent mb-4"><div class="flex justify-between items-center"><div><div class="font-bold">System Status</div><div class="text-sm text-secondary">Running</div></div><span class="badge badge-success">Online</span></div></div>
                ${features.map(f => `
                    <div class="card mb-3">
                        <div class="flex justify-between items-center">
                            <div><div class="font-semibold">${f.feature_name}</div><div class="text-xs text-secondary">${f.feature_key}</div></div>
                            <label class="toggle-switch">
                                <input type="checkbox" ${f.is_enabled?'checked':''} onchange="AdminFeatures.toggle('${f.feature_key}',this.checked)">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                `).join('')}
            `;
        } catch (error) {
            list.innerHTML = '<div class="empty-state"><p>Failed to load</p><button class="btn btn-primary" onclick="AdminFeatures.prototype.loadFeatures()">Retry</button></div>';
        }
    }

    static async toggle(key, enabled) {
        const token = localStorage.getItem('admin_token');
        const apiUrl = APP_CONFIG.apiUrl;
        await fetch(`${apiUrl}/admin/features/${key}/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ isEnabled: enabled })
        });
    }

    unmount() {}
}