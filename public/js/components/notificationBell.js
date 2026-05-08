class NotificationBell {
    // public/js/components/notificationBell.js - Update updateCount
    static async updateCount() {
        try {
            const token = localStorage.getItem('token');
            const apiUrl = APP_CONFIG.apiUrl;
            const response = await fetch(`${apiUrl}/notifications/unread-count`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            const count = result.data?.count || 0;
            
            // Update all notification badges
            const badges = document.querySelectorAll('.notification-badge');
            badges.forEach(badge => {
                if (count > 0) {
                    badge.textContent = count > 99 ? '99+' : count;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            });
        } catch (e) {}
    }

    static async showNotifications() {
        try {
            const data = await API.get('/notifications?limit=30');
            const notifications = data.data || [];
            const unread = data.unreadCount || 0;

            Modal.show(`
                <div class="modal-header">
                    <h3 class="modal-title">🔔 Notifications</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                ${unread > 0 ? `
                    <button class="btn btn-ghost btn-sm btn-block mb-3" 
                            onclick="NotificationBell.markAllRead()">
                        Mark all as read (${unread})
                    </button>
                ` : ''}
                <div id="notificationsList">
                    ${notifications.length > 0 ? notifications.map(n => `
                        <div class="list-item ${!n.is_read ? 'card-primary' : ''}" 
                             onclick="NotificationBell.readOne(${n.id})">
                            <div class="list-item-icon">
                                ${n.type === 'deposit' ? '💳' : n.type === 'commission' ? '💰' : n.type === 'withdrawal' ? '💸' : n.type === 'task' ? '✅' : '📢'}
                            </div>
                            <div class="list-item-content">
                                <div class="list-item-title">${n.title}</div>
                                <div class="list-item-subtitle">${n.message}</div>
                                <div class="text-xs text-muted mt-1">${new Date(n.created_at).toLocaleString()}</div>
                            </div>
                            ${!n.is_read ? '<span class="badge badge-primary">New</span>' : ''}
                        </div>
                    `).join('') : '<p class="text-center text-secondary py-4">No notifications</p>'}
                </div>
            `);
        } catch (error) {
            Toast.show('Failed to load notifications', 'error');
        }
    }

    static async readOne(id) {
        await API.post(`/notifications/${id}/read`);
        document.querySelector('.modal-overlay')?.remove();
        NotificationBell.showNotifications();
        NotificationBell.updateCount();
    }

    static async markAllRead() {
        await API.post('/notifications/read-all');
        document.querySelector('.modal-overlay')?.remove();
        NotificationBell.updateCount();
    }
}
