// public/admin/js/pages/alerts.js
class AdminAlerts {
    constructor(container) { this.container = container; this.templates = []; this.selectedUsers = []; }

    render() {
        AdminSidebar.render('/admin/alerts');
        this.container.innerHTML = `
            <div class="admin-main">
                <div class="admin-page-header">
                    <h1 class="admin-page-title">Send Alerts</h1>
                    <p class="admin-page-subtitle">Send popup alerts to users</p>
                </div>
                <div id="alertsContent"><div class="loader"><div class="spinner"></div></div></div>
            </div>
        `;
        router.reinjectNavigation();
        setTimeout(() => this.loadPage(), 100);
    }

    async loadPage() {
        try {
            const token = localStorage.getItem('admin_token');
            const apiUrl = APP_CONFIG.apiUrl;
            const response = await fetch(`${apiUrl}/admin/alerts/templates`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            this.templates = result.data || [];

            const content = document.getElementById('alertsContent');
            content.innerHTML = `
                <div class="card mb-4">
                    <h4 class="mb-3">📢 Choose Alert Template</h4>
                    <div class="grid grid-cols-2 gap-2" id="templateGrid">
                        ${this.templates.map(t => `
                            <button class="card text-center p-3 cursor-pointer template-card" 
                                    style="border:2px solid var(--color-border-light);"
                                    onclick="AdminAlerts.selectTemplate('${t.id}')" data-id="${t.id}">
                                <div class="text-2xl mb-1">${t.icon}</div>
                                <div class="text-sm font-semibold">${t.name}</div>
                                <div class="text-xs text-secondary">${t.type}</div>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="card mb-4" id="alertForm" style="display:none;">
                    <h4 class="mb-3">✏️ Customize Alert</h4>
                    <form id="sendAlertForm">
                        <input type="hidden" id="selectedTemplate">
                        <div class="form-group">
                            <label class="form-label">Title</label>
                            <input type="text" class="form-input" id="alertTitle" placeholder="Alert title">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Message</label>
                            <textarea class="form-textarea" id="alertMessage" rows="3" placeholder="Alert message"></textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Send To</label>
                            <select class="form-select" id="alertTarget" onchange="AdminAlerts.toggleUserSelect()">
                                <option value="single">Single User</option>
                                <option value="all">All Active Users</option>
                            </select>
                        </div>
                        <div class="form-group" id="userSelectGroup">
                            <label class="form-label">User ID</label>
                            <input type="number" class="form-input" id="singleUserId" placeholder="Enter user ID">
                        </div>
                        <button type="submit" class="btn btn-primary btn-block">📢 Send Alert</button>
                    </form>
                </div>
            `;

            document.getElementById('sendAlertForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.sendAlert();
            });
        } catch (error) {
            document.getElementById('alertsContent').innerHTML = '<div class="empty-state"><p>Failed to load</p></div>';
        }
    }

    static selectTemplate(id) {
        document.querySelectorAll('.template-card').forEach(c => c.style.border = '2px solid var(--color-border-light)');
        document.querySelector(`[data-id="${id}"]`).style.border = '2px solid var(--color-primary)';
        
        document.getElementById('selectedTemplate').value = id;
        document.getElementById('alertForm').style.display = 'block';
        
        const instance = router.currentAdminPage;
        const template = instance.templates.find(t => t.id == id);
        if (template) {
            document.getElementById('alertTitle').value = '';
            document.getElementById('alertMessage').value = '';
        }
    }

    static toggleUserSelect() {
        const target = document.getElementById('alertTarget').value;
        document.getElementById('userSelectGroup').style.display = target === 'single' ? 'block' : 'none';
    }

    async sendAlert() {
        const templateId = document.getElementById('selectedTemplate').value;
        const title = document.getElementById('alertTitle').value;
        const message = document.getElementById('alertMessage').value;
        const target = document.getElementById('alertTarget').value;
        const userId = document.getElementById('singleUserId').value;

        if (!templateId) {
            await Dialog.alert('Please select a template', 'No Template', 'warning');
            return;
        }

        const token = localStorage.getItem('admin_token');
        const apiUrl = APP_CONFIG.apiUrl;
        let url, body;

        if (target === 'single') {
            if (!userId) {
                await Dialog.alert('Please enter a user ID', 'Missing User', 'warning');
                return;
            }
            url = `${apiUrl}/admin/users/${userId}/alert`;
            body = { templateId: parseInt(templateId), customTitle: title, customMessage: message };
        } else {
            url = `${apiUrl}/admin/alerts/all`;
            body = { templateId: parseInt(templateId), customTitle: title, customMessage: message };
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body)
            });
            const result = await response.json();
            if (result.success) {
                await Dialog.alert(result.message, 'Alert Sent', 'success');
                document.getElementById('sendAlertForm').reset();
            } else {
                await Dialog.alert(result.message, 'Error', 'error');
            }
        } catch (error) {
            await Dialog.alert('Failed to send alert', 'Error', 'error');
        }
    }

    unmount() {}
}