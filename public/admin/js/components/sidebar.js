// public/admin/js/components/sidebar.js

/**
 * Admin Sidebar Component
 * ALL permission and admin data reads use Session controller
 * Session is the SINGLE source of truth
 */
var AdminSidebar = {
  render: function(currentPath) {
    var existing = document.getElementById('adminSidebar');
    if (existing) existing.remove();

    var adminData = Session.getAdminData() || {};
    var adminPermissions = Session.getAdminPermissions();
    var isSuperAdmin = adminData.role === 'super_admin';

    var allLinks = [
      { path: '/admin/dashboard', icon: '📊', label: 'Dashboard', permission: 'dashboard.view' },
      { path: '/admin/deposits', icon: '💳', label: 'Deposits', permission: 'deposits.view' },
      { path: '/admin/withdrawals', icon: '💸', label: 'Withdrawals', permission: 'withdrawals.view' },
      { path: '/admin/users', icon: '👥', label: 'Users', permission: 'users.view' },
      { path: '/admin/giftcodes', icon: '🎁', label: 'Gift Codes', permission: 'giftcodes.view' },
      { path: '/admin/salaries', icon: '💼', label: 'Salaries', permission: 'salaries.view' },
      { path: '/admin/features', icon: '⚙️', label: 'Features', permission: 'features.toggle' },
      { path: '/admin/broadcast', icon: '📢', label: 'Broadcast', permission: 'broadcast.send' },
      { path: '/admin/alerts', icon: '🔔', label: 'Alerts', permission: 'users.alert' },
      { path: '/admin/logs', icon: '📝', label: 'Logs', permission: 'logs.view' },
      { path: '/admin/admins', icon: '🛡️', label: 'Admins', permission: 'admins.view' }
    ];

    var visibleLinks;
    if (isSuperAdmin || (adminPermissions.length === 1 && adminPermissions[0] === '*')) {
      visibleLinks = allLinks;
    } else {
      visibleLinks = allLinks.filter(function(link) {
        return adminPermissions.indexOf(link.permission) !== -1;
      });
    }

    var sidebar = document.createElement('aside');
    sidebar.id = 'adminSidebar';
    sidebar.className = 'admin-sidebar';

    var linksHtml = visibleLinks.map(function(link) {
      var isActive = currentPath === link.path ? ' active' : '';
      return '<a class="sidebar-link' + isActive + '" onclick="router.navigate(\'' + link.path + '\')"><span class="link-icon">' + link.icon + '</span>' + link.label + '</a>';
    }).join('');

    var username = adminData.username || 'Admin';
    var role = adminData.role || 'Staff';

    sidebar.innerHTML =
      '<div class="sidebar-header">' +
        '<div class="sidebar-logo">' + APP_CONFIG.adminName + '</div>' +
        '<div class="sidebar-subtitle">' + role + '</div>' +
      '</div>' +
      '<nav class="sidebar-nav">' + linksHtml + '</nav>' +
      '<div class="sidebar-footer">' +
        '<div class="sidebar-user">' +
          '<div class="sidebar-avatar">🛡️</div>' +
          '<div class="sidebar-user-info">' +
            '<div class="sidebar-user-name">' + username + '</div>' +
            '<div class="sidebar-user-role">' + role + '</div>' +
          '</div>' +
        '</div>' +
        '<button class="btn btn-danger btn-sm btn-block" onclick="AdminAPI.logout()">🚪 Logout</button>' +
      '</div>';

    document.getElementById('adminApp').insertBefore(sidebar, document.getElementById('adminContent'));
  }
};