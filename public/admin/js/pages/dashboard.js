// public/admin/js/pages/dashboard.js

/**
 * Admin Dashboard Page
 * Requires: dashboard.view
 * Shows platform statistics and quick action links
 * Quick actions are filtered by permissions
 */
var AdminDashboard = function(container) {
  this.container = container;
};

AdminDashboard.prototype.render = function() {
  if (!AdminPerms.requirePage('dashboard.view')) return;

  AdminSidebar.render('/admin/dashboard');

  this.container.innerHTML = `
    <div class="admin-main">
      <div class="admin-page-header">
        <h1 class="admin-page-title">Dashboard</h1>
        <p class="admin-page-subtitle">Platform overview</p>
      </div>
      <div id="dashboardContent">
        <div class="loader"><div class="spinner"></div></div>
      </div>
    </div>
  `;

  router.reinjectNavigation();
  this.loadDashboard();
};

AdminDashboard.prototype.loadDashboard = function() {
  var self = this;
  var content = document.getElementById('dashboardContent');
  if (!content) return;

  AdminAPI.get('/dashboard').then(function(data) {
    var s = data.data;
    var showDeposits = AdminPerms.has('deposits.view');
    var showWithdrawals = AdminPerms.has('withdrawals.view');
    var showUsers = AdminPerms.has('users.view');
    var showBroadcast = AdminPerms.has('broadcast.send');
    var showSalaries = AdminPerms.has('salaries.view');
    var showGiftCodes = AdminPerms.has('giftcodes.view');
    var showFeatures = AdminPerms.has('features.toggle');

    content.innerHTML = `
      <div class="admin-stats animate-fadeInUp">
        <div class="admin-stat-card"><div class="admin-stat-icon">👥</div><div class="admin-stat-value">${s.total_users || 0}</div><div class="admin-stat-label">Total Users</div></div>
        <div class="admin-stat-card"><div class="admin-stat-icon">🆕</div><div class="admin-stat-value">${s.new_users_24h || 0}</div><div class="admin-stat-label">New Today</div></div>
        <div class="admin-stat-card"><div class="admin-stat-icon">💰</div><div class="admin-stat-value">${Number(s.total_deposits || 0).toLocaleString()}</div><div class="admin-stat-label">Total Deposits (ETB)</div></div>
        <div class="admin-stat-card"><div class="admin-stat-icon">⏳</div><div class="admin-stat-value">${s.pending_deposits || 0}</div><div class="admin-stat-label">Pending Deposits</div></div>
        <div class="admin-stat-card"><div class="admin-stat-icon">💸</div><div class="admin-stat-value">${Number(s.total_withdrawn || 0).toLocaleString()}</div><div class="admin-stat-label">Total Withdrawn (ETB)</div></div>
        <div class="admin-stat-card"><div class="admin-stat-icon">📤</div><div class="admin-stat-value">${s.pending_withdrawals || 0}</div><div class="admin-stat-label">Pending Withdrawals</div></div>
      </div>

      <div class="admin-actions animate-fadeInUp stagger-2">
        ${showDeposits ? '<div class="admin-action-btn" onclick="router.navigate(\'/admin/deposits\')"><div class="admin-action-icon">💳</div><div class="admin-action-label">Verify Deposits</div></div>' : ''}
        ${showWithdrawals ? '<div class="admin-action-btn" onclick="router.navigate(\'/admin/withdrawals\')"><div class="admin-action-icon">💸</div><div class="admin-action-label">Process Withdrawals</div></div>' : ''}
        ${showUsers ? '<div class="admin-action-btn" onclick="router.navigate(\'/admin/users\')"><div class="admin-action-icon">👥</div><div class="admin-action-label">Manage Users</div></div>' : ''}
        ${showBroadcast ? '<div class="admin-action-btn" onclick="router.navigate(\'/admin/broadcast\')"><div class="admin-action-icon">📢</div><div class="admin-action-label">Send Broadcast</div></div>' : ''}
        ${showSalaries ? '<div class="admin-action-btn" onclick="router.navigate(\'/admin/salaries\')"><div class="admin-action-icon">💼</div><div class="admin-action-label">Process Salaries</div></div>' : ''}
        ${showGiftCodes ? '<div class="admin-action-btn" onclick="router.navigate(\'/admin/giftcodes\')"><div class="admin-action-icon">🎁</div><div class="admin-action-label">Gift Codes</div></div>' : ''}
        ${showFeatures ? '<div class="admin-action-btn" onclick="router.navigate(\'/admin/features\')"><div class="admin-action-icon">⚙️</div><div class="admin-action-label">Features</div></div>' : ''}
      </div>
    `;
  }).catch(function() {
    content.innerHTML = '<div class="empty-state"><p>Failed to load dashboard</p></div>';
  });
};

AdminDashboard.prototype.unmount = function() {};