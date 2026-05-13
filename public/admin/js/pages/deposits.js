// public/admin/js/pages/deposits.js

/**
 * Admin Deposits Page
 * Requires: deposits.view
 * Sub-actions filtered by: deposits.verify, deposits.reject, deposits.unblock
 */
var AdminDeposits = function(container) {
  this.container = container;
};

AdminDeposits.prototype.render = function() {
  if (!AdminPerms.requirePage('deposits.view')) return;

  AdminSidebar.render('/admin/deposits');
  this.container.innerHTML = `
    <div class="admin-main">
      <div class="admin-page-header">
        <h1 class="admin-page-title">Pending Deposits</h1>
        <p class="admin-page-subtitle">Loading deposits...</p>
      </div>
      <div id="depositsList"></div>
    </div>
  `;
  router.reinjectNavigation();
  setTimeout(this.loadDeposits.bind(this), 100);
};

AdminDeposits.prototype.loadDeposits = function() {
  var self = this;
  var list = document.getElementById('depositsList');
  if (!list) return;

  Loader.auto('depositsList');

  var canVerify = AdminPerms.has('deposits.verify');
  var canReject = AdminPerms.has('deposits.reject');
  var canUnblock = AdminPerms.has('deposits.unblock');

  var token = localStorage.getItem('admin_token');
  var apiUrl = APP_CONFIG.apiUrl;

  fetch(apiUrl + '/deposits/pending', {
    headers: { 'Authorization': 'Bearer ' + token }
  }).then(function(r) { return r.json(); }).then(function(result) {
    var deposits = result.data?.deposits || result.data || [];

    document.querySelector('.admin-page-subtitle').textContent = deposits.length + ' deposits awaiting verification';

    if (deposits.length === 0) {
      list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✅</div><h3 class="empty-state-title">All Clear</h3><p class="empty-state-description">No pending deposits to review</p></div>';
      return;
    }

    list.innerHTML = deposits.map(function(d, i) {
      var actionButtons = '';
      if (canVerify) {
        actionButtons += '<button id="verifyBtn_' + d.id + '" class="btn btn-success btn-block" onclick="AdminDeposits.verifyDeposit(' + d.id + ')">✓ Verify</button>';
      }
      if (canReject) {
        actionButtons += '<button id="rejectBtn_' + d.id + '" class="btn btn-danger btn-block" onclick="AdminDeposits.rejectDeposit(' + d.id + ')">✕ Reject</button>';
      }

      return '<div class="card mb-4 animate-fadeInUp" style="animation-delay:' + (i * 0.05) + 's">' +
        '<div class="flex justify-between items-start mb-3">' +
          '<div>' +
            '<div class="font-bold text-lg">' + (d.full_name || d.phone || 'Unknown') + '</div>' +
            '<div class="text-sm text-secondary">' + (d.phone || '') + ' • User #' + d.user_id + '</div>' +
          '</div>' +
          '<span class="badge badge-warning badge-lg">Pending</span>' +
        '</div>' +
        '<div class="bank-info-card mb-3">' +
          '<div class="bank-info-row"><span class="bank-info-label">Amount</span><span class="bank-info-value text-xl font-bold">' + Number(d.amount || 0).toLocaleString() + ' ETB</span></div>' +
          '<div class="bank-info-row"><span class="bank-info-label">Bank</span><span class="bank-info-value">' + (d.bank_name || 'N/A') + '</span></div>' +
          '<div class="bank-info-row"><span class="bank-info-label">Transaction ID</span><div class="flex items-center gap-2"><span class="bank-info-value">' + (d.transaction_id || 'N/A') + '</span><button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText(\'' + (d.transaction_id || '') + '\');Toast.show(\'Copied!\')" title="Copy">📋</button></div></div>' +
          '<div class="bank-info-row"><span class="bank-info-label">Date</span><span class="bank-info-value">' + new Date(d.created_at).toLocaleString() + '</span></div>' +
        '</div>' +
        (actionButtons ? '<div class="flex gap-3">' + actionButtons + '</div>' : '') +
      '</div>';
    }).join('');
  }).catch(function(error) {
    list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Failed to load deposits</h3><button class="btn btn-primary" onclick="router.navigate(\'/admin/deposits\')">Retry</button></div>';
  });
};

AdminDeposits.verifyDeposit = function(id) {
  if (!AdminPerms.has('deposits.verify')) return;

  Dialog.confirm('Verify this deposit? Package will be activated and commissions distributed.', 'Verify Deposit', '✓ Verify', 'Cancel').then(function(confirmed) {
    if (!confirmed) return;
    Loader.button('verifyBtn_' + id, LOADER_CONFIG.texts.verifying);
    AdminAPI.post('/deposits/' + id + '/verify').then(function() {
      Dialog.alert('Deposit verified successfully!', 'Deposit Verified', 'success');
      router.navigate('/admin/deposits');
    }).catch(function() {
      Loader.buttonRestore('verifyBtn_' + id, '✓ Verify');
    });
  });
};

AdminDeposits.rejectDeposit = function(id) {
  if (!AdminPerms.has('deposits.reject')) return;

  Dialog.prompt('Rejection Reason', 'Enter reason for rejection...').then(function(reason) {
    if (!reason) return;
    Dialog.confirm('Reject this deposit?', 'Confirm Rejection', '✕ Reject', 'Cancel', 'danger').then(function(confirmed) {
      if (!confirmed) return;
      Loader.button('rejectBtn_' + id, LOADER_CONFIG.texts.rejecting);
      AdminAPI.post('/deposits/' + id + '/reject', { reason: reason }).then(function() {
        Dialog.alert('Deposit rejected.', 'Done', 'info');
        router.navigate('/admin/deposits');
      }).catch(function() {
        Loader.buttonRestore('rejectBtn_' + id, '✕ Reject');
      });
    });
  });
};

AdminDeposits.prototype.unmount = function() {};