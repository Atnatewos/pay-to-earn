// public/admin/js/pages/withdrawals.js

/**
 * Admin Withdrawals Page
 * Requires: withdrawals.view
 * Sub-actions filtered by: withdrawals.process
 * All copy buttons, loading states, and custom dialogs
 */
var AdminWithdrawals = function(container) {
  this.container = container;
  this.currentFilter = 'pending';
};

AdminWithdrawals.prototype.render = function() {
  if (!AdminPerms.requirePage('withdrawals.view')) return;

  AdminSidebar.render('/admin/withdrawals');

  var canProcess = AdminPerms.has('withdrawals.process');

  this.container.innerHTML = `
    <div class="admin-main">
      <div class="admin-page-header">
        <h1 class="admin-page-title">Withdrawals</h1>
        <p class="admin-page-subtitle">Process user withdrawal requests</p>
      </div>
      <div class="filter-tabs mb-4">
        <button class="filter-tab ${this.currentFilter === 'pending' ? 'active' : ''}" onclick="AdminWithdrawals.switchFilter('pending')">Pending</button>
        <button class="filter-tab ${this.currentFilter === 'completed' ? 'active' : ''}" onclick="AdminWithdrawals.switchFilter('completed')">Completed</button>
        <button class="filter-tab ${this.currentFilter === 'rejected' ? 'active' : ''}" onclick="AdminWithdrawals.switchFilter('rejected')">Rejected</button>
      </div>
      <div id="withdrawalsList"></div>
    </div>
  `;
  router.reinjectNavigation();
  setTimeout(this.loadWithdrawals.bind(this), 100);
};

AdminWithdrawals.prototype.loadWithdrawals = function() {
  var self = this;
  var list = document.getElementById('withdrawalsList');
  if (!list) return;

  Loader.auto('withdrawalsList');

  var canProcess = AdminPerms.has('withdrawals.process');
  var token = localStorage.getItem('admin_token');
  var apiUrl = APP_CONFIG.apiUrl;

  fetch(apiUrl + '/admin/withdrawals?status=' + this.currentFilter, {
    headers: { 'Authorization': 'Bearer ' + token }
  }).then(function(r) { return r.json(); }).then(function(result) {
    var withdrawals = result.data || [];

    if (withdrawals.length === 0) {
      list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><h3>No ' + self.currentFilter + ' withdrawals</h3></div>';
      return;
    }

    list.innerHTML = withdrawals.map(function(w, i) {
      var statusBadge = 'badge-warning';
      if (w.status === 'completed') statusBadge = 'badge-success';
      if (w.status === 'rejected') statusBadge = 'badge-danger';

      var actionButtons = '';
      if (canProcess && w.status === 'pending') {
        actionButtons = '<div class="flex gap-3"><button id="approveBtn_' + w.id + '" class="btn btn-success btn-block" onclick="AdminWithdrawals.approve(' + w.id + ')">✅ Approve</button><button id="rejectBtn_' + w.id + '" class="btn btn-danger btn-block" onclick="AdminWithdrawals.reject(' + w.id + ')">❌ Reject</button></div>';
      }

      return '<div class="card mb-4">' +
        '<div class="flex justify-between items-start mb-3">' +
          '<div>' +
            '<div class="font-bold text-lg">' + (w.full_name || w.phone) + '</div>' +
            '<div class="text-sm text-secondary">' +
              '<span>' + w.phone + '</span>' +
              '<button class="btn btn-ghost btn-sm ml-1" onclick="navigator.clipboard.writeText(\'' + (w.phone || '') + '\');Toast.show(\'Phone copied!\')" title="Copy phone">📋</button>' +
              ' • User #' + w.user_id +
            '</div>' +
          '</div>' +
          '<span class="badge badge-lg ' + statusBadge + '">' + w.status + '</span>' +
        '</div>' +
        '<div class="bank-info-card mb-3">' +
          '<div class="bank-info-row"><span class="bank-info-label">Amount</span><span class="bank-info-value text-xl font-bold text-danger">-' + Number(w.amount).toLocaleString() + ' ETB</span></div>' +
          '<div class="bank-info-row"><span class="bank-info-label">Bank</span><div class="flex items-center gap-2"><span class="bank-info-value">' + (w.bank_name || '') + '</span><button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText(\'' + (w.bank_name || '') + '\');Toast.show(\'Copied!\')">📋</button></div></div>' +
          '<div class="bank-info-row"><span class="bank-info-label">Account</span><div class="flex items-center gap-2"><span class="bank-info-value">' + (w.account_number || '') + '</span><button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText(\'' + (w.account_number || '') + '\');Toast.show(\'Account copied!\')">📋</button></div></div>' +
          '<div class="bank-info-row"><span class="bank-info-label">Requested</span><span class="bank-info-value">' + new Date(w.created_at).toLocaleString() + '</span></div>' +
        '</div>' +
        actionButtons +
      '</div>';
    }).join('');
  }).catch(function() {
    list.innerHTML = '<div class="empty-state"><p>Failed to load</p><button class="btn btn-primary" onclick="router.navigate(\'/admin/withdrawals\')">Retry</button></div>';
  });
};

AdminWithdrawals.switchFilter = function(filter) {
  var instance = router.currentAdminPage;
  instance.currentFilter = filter;
  instance.render();
};

AdminWithdrawals.approve = function(id) {
  if (!AdminPerms.has('withdrawals.process')) return;
  Dialog.confirm('Mark this withdrawal as paid?', 'Confirm Payment', '✅ Yes, Approve', 'Cancel').then(function(confirmed) {
    if (!confirmed) return;
    Loader.button('approveBtn_' + id, LOADER_CONFIG.texts.approving);
    AdminAPI.post('/withdrawals/' + id + '/process', { status: 'completed' }).then(function() {
      Dialog.alert('Withdrawal approved and marked as completed.', 'Payment Approved', 'success');
      router.navigate('/admin/withdrawals');
    }).catch(function() {
      Loader.buttonRestore('approveBtn_' + id, '✅ Approve');
    });
  });
};

AdminWithdrawals.reject = function(id) {
  if (!AdminPerms.has('withdrawals.process')) return;
  Dialog.prompt('Rejection Reason', 'Enter reason for rejection...').then(function(reason) {
    if (!reason) return;
    Dialog.confirm('Reject this withdrawal? The amount will be refunded.', 'Confirm Rejection', '❌ Yes, Reject', 'Cancel', 'danger').then(function(confirmed) {
      if (!confirmed) return;
      Loader.button('rejectBtn_' + id, LOADER_CONFIG.texts.rejecting);
      AdminAPI.post('/withdrawals/' + id + '/process', { status: 'rejected', reason: reason }).then(function() {
        Dialog.alert('Withdrawal rejected and balance refunded.', 'Withdrawal Rejected', 'info');
        router.navigate('/admin/withdrawals');
      }).catch(function() {
        Loader.buttonRestore('rejectBtn_' + id, '❌ Reject');
      });
    });
  });
};

AdminWithdrawals.prototype.unmount = function() {};