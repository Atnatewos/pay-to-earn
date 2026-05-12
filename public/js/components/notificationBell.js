// public/js/components/notificationBell.js

/**
 * Notification Bell Component
 * Shows unread count badge on bell icon
 * Opens notifications modal when clicked
 */
class NotificationBell {
  /**
   * Update the notification count badge
   * Called periodically and after reading notifications
   */
  static async updateCount() {
    try {
      var token = localStorage.getItem('token');
      if (!token) return;

      var apiUrl = APP_CONFIG.apiUrl;
      var response = await fetch(apiUrl + '/notifications/unread-count', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      var result = await response.json();
      var count = (result.data && result.data.count) ? result.data.count : 0;

      // Update all notification badges on the page
      var badges = document.querySelectorAll('.notification-badge');
      badges.forEach(function(badge) {
        if (count > 0) {
          badge.textContent = count > 99 ? '99+' : count;
          badge.style.display = 'flex';
        } else {
          badge.style.display = 'none';
        }
      });
    } catch (error) {
      // Silently fail - notifications are non-critical
    }
  }

  /**
   * Show notifications modal
   */
  static async showNotifications() {
    try {
      var apiUrl = APP_CONFIG.apiUrl;
      var data = await API.get('/notifications?limit=30');
      var notifications = data.data || [];
      var unread = data.unreadCount || 0;

      var modalContent = `
        <div class="modal-header">
          <h3 class="modal-title">🔔 Notifications</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        </div>
        ${unread > 0 ? '<button class="btn btn-ghost btn-sm btn-block mb-3" onclick="NotificationBell.markAllRead()">Mark all as read (' + unread + ')</button>' : ''}
        <div id="notificationsList">
          ${notifications.length > 0 ? notifications.map(function(n) {
            var icon = '📢';
            if (n.type === 'deposit') icon = '💳';
            if (n.type === 'commission') icon = '💰';
            if (n.type === 'withdrawal') icon = '💸';
            if (n.type === 'task') icon = '✅';
            if (n.type === 'alert') icon = '🔔';
            return '<div class="list-item ' + (!n.is_read ? 'card-primary' : '') + '" onclick="NotificationBell.readOne(' + n.id + ')"><div class="list-item-icon">' + icon + '</div><div class="list-item-content"><div class="list-item-title">' + n.title + '</div><div class="list-item-subtitle">' + n.message + '</div><div class="text-xs text-muted mt-1">' + new Date(n.created_at).toLocaleString() + '</div></div>' + (!n.is_read ? '<span class="badge badge-primary">New</span>' : '') + '</div>';
          }).join('') : '<p class="text-center text-secondary py-4">No notifications</p>'}
        </div>
      `;

      Modal.show(modalContent);
    } catch (error) {
      Toast.show('Failed to load notifications', 'error');
    }
  }

  /**
   * Mark a single notification as read
   */
  static async readOne(id) {
    await API.post('/notifications/' + id + '/read');
    document.querySelector('.modal-overlay')?.remove();
    NotificationBell.showNotifications();
    NotificationBell.updateCount();
  }

  /**
   * Mark all notifications as read
   */
  static async markAllRead() {
    await API.post('/notifications/read-all');
    document.querySelector('.modal-overlay')?.remove();
    NotificationBell.updateCount();
  }
}