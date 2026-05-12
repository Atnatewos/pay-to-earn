// public/admin/js/components/sidebar.js

/**
 * Admin Sidebar Component
 * Auto-hides links based on admin permissions
 * Only super_admin sees all links including Admins
 */
var AdminSidebar = {
  render: function(currentPath) {
    var existing = document.getElementById('adminSidebar');
    if (existing) existing.remove();

    var adminData = JSON.parse(localStorage.getItem('admin_data') || '{}');
    var adminPermissions = JSON.parse(localStorage.getItem('admin_permissions') || '[]');
    var isSuperAdmin = adminData.role === 'super_admin';

    // Define all sidebar links with their required permissions
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
      { path: '/admin/admins', icon: '🛡️', label: 'Admins', permission: 'admins.view', superOnly: true }
    ];

    // Filter links based on permissions (super admin sees everything)
    var visibleLinks = allLinks.filter(function(link) {
      if (isSuperAdmin) return true;
      if (link.superOnly) return false;
      if (!link.permission) return true;
      return adminPermissions.indexOf(link.permission) !== -1;
    });

    var sidebar = document.createElement('aside');
    sidebar.id = 'adminSidebar';
    sidebar.className = 'admin-sidebar';

    sidebar.innerHTML = '<div class="sidebar-header"><div class="sidebar-logo">' + APP_CONFIG.adminName + '</div><div class="sidebar-subtitle">' + adminData.role + '</div></div>' +
      '<nav class="sidebar-nav">' +
        visibleLinks.map(function(link) {
          return '<a class="sidebar-link ' + (currentPath === link.path ? 'active' : '') + '" onclick="router.navigate(\'' + link.path + '\')"><span class="link-icon">' + link.icon + '</span>' + link.label + '</a>';
        }).join('') +
      '</nav>' +
      '<div class="sidebar-footer">' +
        '<div class="sidebar-user">' +
          '<div class="sidebar-avatar">🛡️</div>' +
          '<div class="sidebar-user-info">' +
            '<div class="sidebar-user-name">' + (adminData.username || 'Admin') + '</div>' +
            '<div class="sidebar-user-role">' + (adminData.role || 'Staff') + '</div>' +
          '</div>' +
        '</div>' +
        '<button class="btn btn-danger btn-sm btn-block" onclick="AdminAPI.logout()">🚪 Logout</button>' +
      '</div>';

    document.getElementById('adminApp').insertBefore(sidebar, document.getElementById('adminContent'));
  }
};