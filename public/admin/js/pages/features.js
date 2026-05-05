// public/admin/js/pages/features.js
class AdminFeatures {
    constructor(container) { this.container = container; }

    async render() {
        AdminSidebar.render('/admin/features');

        try {
            const data = await AdminAPI.get('/features');
            const features = data.data || [];

            this.container.innerHTML = `
                <div class="admin-main">
                    <div class="admin-page-header">
                        <h1 class="admin-page-title">System Features</h1>
                        <p class="admin-page-subtitle">Toggle platform features on/off</p>
                    </div>

                    <div class="card card-accent mb-4">
                        <div class="flex justify-between items-center">
                            <div><div class="font-bold">🟢 System Status</div><div class="text-sm text-secondary">Platform is running normally</div></div>
                            <button class="btn btn-danger btn-sm">🔧 Maintenance</button>
                        </div>
                    </div>

                    ${features.map(f => `
                        <div class="card mb-3">
                            <div class="flex justify-between items-center">
                                <div>
                                    <div class="font-semibold">${f.feature_name}</div>
                                    <div class="text-xs text-secondary">Key: ${f.feature_key}</div>
                                </div>
                                <label class="toggle-switch">
                                    <input type="checkbox" ${f.is_enabled ? 'checked' : ''} onchange="AdminFeatures.toggle('${f.feature_key}', this.checked)">
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            this.container.innerHTML = `<div class="admin-main"><p>Failed to load features</p></div>`;
        }
        router.reinjectNavigation();
    }

    static async toggle(key, enabled) {
        await AdminAPI.post(`/features/${key}/toggle`, { isEnabled: enabled });
        await Dialog.alert(`Feature ${enabled ? 'enabled' : 'disabled'}`, 'Updated', 'success');
        router.navigate('/admin/features');
    }

    unmount() {}
}