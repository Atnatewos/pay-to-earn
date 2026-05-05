// public/admin/js/pages/broadcast.js
class AdminBroadcast {
    constructor(container) { this.container = container; }

    render() {
        AdminSidebar.render('/admin/broadcast');
        this.container.innerHTML = `
            <div class="admin-main">
                <div class="admin-page-header">
                    <h1 class="admin-page-title">Broadcast Messages</h1>
                    <p class="admin-page-subtitle">Send announcements to users</p>
                </div>

                <div class="card mb-4">
                    <h4 class="mb-3">📢 New Broadcast</h4>
                    <form id="broadcastForm">
                        <div class="form-group">
                            <label class="form-label">Title</label>
                            <input type="text" class="form-input" id="broadcastTitle" placeholder="Announcement title" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Message</label>
                            <textarea class="form-textarea" id="broadcastMessage" rows="4" placeholder="Write your message here..." required></textarea>
                        </div>
                        <div class="grid grid-cols-2 gap-3 mb-3">
                            <div class="form-group">
                                <label class="form-label">Target</label>
                                <select class="form-select" id="broadcastTarget">
                                    <option value="all">All Users</option>
                                    <option value="users">Users Only</option>
                                    <option value="admins">Admins Only</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Priority</label>
                                <select class="form-select" id="broadcastPriority">
                                    <option value="normal">Normal</option>
                                    <option value="high">High</option>
                                    <option value="urgent">🔴 Urgent</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block">📢 Send Broadcast</button>
                    </form>
                </div>

                <div class="card">
                    <h4 class="mb-3">📋 Previous Broadcasts</h4>
                    <div id="broadcastHistory"><div class="loader"><div class="spinner"></div></div></div>
                </div>
            </div>
        `;

        document.getElementById('broadcastForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.sendBroadcast();
        });

        router.reinjectNavigation();
        setTimeout(() => this.loadHistory(), 100);
    }

    async sendBroadcast() {
        const title = document.getElementById('broadcastTitle').value;
        const message = document.getElementById('broadcastMessage').value;
        const target = document.getElementById('broadcastTarget').value;
        const priority = document.getElementById('broadcastPriority').value;

        const token = localStorage.getItem('admin_token');
        const apiUrl = APP_CONFIG.apiUrl;
        try {
            const response = await fetch(`${apiUrl}/admin/broadcast`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ title, message, target, priority })
            });
            const result = await response.json();
            if (result.success) {
                await Dialog.alert(`Broadcast sent successfully to ${target}!`, 'Broadcast Sent', 'success');
                document.getElementById('broadcastForm').reset();
                this.loadHistory();
            } else {
                await Dialog.alert(result.message || 'Failed to send broadcast', 'Error', 'error');
            }
        } catch (error) {
            await Dialog.alert('Failed to send broadcast', 'Error', 'error');
        }
    }

    async loadHistory() {
        const container = document.getElementById('broadcastHistory');
        if (!container) return;

        try {
            const token = localStorage.getItem('admin_token');
            const apiUrl = APP_CONFIG.apiUrl;
            const response = await fetch(`${apiUrl}/admin/broadcasts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            const broadcasts = result.data || [];

            if (broadcasts.length === 0) {
                container.innerHTML = '<p class="text-center text-secondary py-4">No broadcasts sent yet</p>';
                return;
            }

            container.innerHTML = broadcasts.map(b => `
                <div class="list-item">
                    <div class="list-item-icon">${b.priority==='urgent'?'🔴':b.priority==='high'?'🟡':'🔵'}</div>
                    <div class="list-item-content">
                        <div class="list-item-title">${b.title}</div>
                        <div class="list-item-subtitle">To: ${b.target} | By: ${b.username} | ${new Date(b.created_at).toLocaleString()}</div>
                    </div>
                    <span class="badge ${b.is_active?'badge-success':'badge-danger'}">${b.is_active?'Active':'Disabled'}</span>
                </div>
            `).join('');
        } catch (error) {
            container.innerHTML = '<p class="text-center text-secondary">Failed to load history</p>';
        }
    }

    unmount() {}
}