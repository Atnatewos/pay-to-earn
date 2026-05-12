// public/admin/js/pages/deposits.js

/**
 * Admin Deposits Page
 * Handles deposit verification, rejection, and transaction ID unblocking
 * All loading states use centralized Loader component
 * All dialogs use custom Dialog component
 */
class AdminDeposits {
  constructor(container) {
    this.container = container;
  }

  render() {
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
    setTimeout(() => this.loadDeposits(), 100);
  }

  async loadDeposits() {
    const list = document.getElementById('depositsList');
    if (!list) return;

    Loader.auto('depositsList');

    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = APP_CONFIG.apiUrl;
      const response = await fetch(`${apiUrl}/deposits/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      const deposits = result.data?.deposits || result.data || [];

      document.querySelector('.admin-page-subtitle').textContent =
        `${deposits.length} deposits awaiting verification`;

      if (deposits.length === 0) {
        list.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">✅</div>
            <h3 class="empty-state-title">All Clear</h3>
            <p class="empty-state-description">No pending deposits to review</p>
          </div>
        `;
        return;
      }

      list.innerHTML = deposits.map((d, i) => `
        <div class="card mb-4 animate-fadeInUp" style="animation-delay:${i * 0.05}s">
          <div class="flex justify-between items-start mb-3">
            <div>
              <div class="font-bold text-lg">${d.full_name || d.phone || 'Unknown'}</div>
              <div class="text-sm text-secondary">
                ${d.phone || ''} • User #${d.user_id}
              </div>
            </div>
            <span class="badge badge-warning badge-lg">Pending</span>
          </div>

          <div class="bank-info-card mb-3">
            <div class="bank-info-row">
              <span class="bank-info-label">Amount</span>
              <span class="bank-info-value text-xl font-bold">${Number(d.amount || 0).toLocaleString()} ETB</span>
            </div>
            <div class="bank-info-row">
              <span class="bank-info-label">Bank</span>
              <span class="bank-info-value">${d.bank_name || 'N/A'}</span>
            </div>
            <div class="bank-info-row">
              <span class="bank-info-label">Transaction ID</span>
              <div class="flex items-center gap-2">
                <span class="bank-info-value">${d.transaction_id || 'N/A'}</span>
                <button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText('${d.transaction_id}'); Toast.show('Transaction ID copied!')" title="Copy transaction ID">📋</button>
              </div>
            </div>
            <div class="bank-info-row">
              <span class="bank-info-label">Date</span>
              <span class="bank-info-value">${new Date(d.created_at).toLocaleString()}</span>
            </div>
          </div>

          <div class="flex gap-3">
            <button id="verifyBtn_${d.id}" class="btn btn-success btn-block" onclick="AdminDeposits.verifyDeposit(${d.id})">
              ✓ Verify
            </button>
            <button id="rejectBtn_${d.id}" class="btn btn-danger btn-block" onclick="AdminDeposits.rejectDeposit(${d.id})">
              ✕ Reject
            </button>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Deposits error:', error);
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h3 class="empty-state-title">Failed to load deposits</h3>
          <p class="empty-state-description">${error.message}</p>
          <button class="btn btn-primary" onclick="router.navigate('/admin/deposits')">Retry</button>
        </div>
      `;
    }
  }

  /**
   * Verify a pending deposit
   * Shows loading state on button, uses custom dialog for confirmation and success
   */
  static async verifyDeposit(id) {
    const confirmed = await Dialog.confirm(
      'Verify this deposit? Package will be activated and commissions distributed.',
      'Verify Deposit',
      '✓ Verify',
      'Cancel'
    );
    if (!confirmed) return;

    Loader.button(`verifyBtn_${id}`, LOADER_CONFIG.texts.verifying);

    const token = localStorage.getItem('admin_token');
    const apiUrl = APP_CONFIG.apiUrl;
    try {
      const response = await fetch(`${apiUrl}/deposits/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        await Dialog.alert('Deposit verified successfully! Package activated.', 'Deposit Verified', 'success');
        router.navigate('/admin/deposits');
      } else {
        await Dialog.alert(data.message || 'Failed to verify', 'Error', 'error');
      }
    } catch (error) {
      await Dialog.alert('Failed to verify deposit', 'Error', 'error');
    }

    Loader.buttonRestore(`verifyBtn_${id}`, '✓ Verify');
  }

  /**
   * Reject a pending deposit
   * Asks for rejection reason, shows loading, uses custom dialogs
   */
  static async rejectDeposit(id) {
    const reason = await Dialog.prompt('Rejection Reason', 'Enter reason for rejection...');
    if (!reason) return;

    const confirmed = await Dialog.confirm(
      'Reject this deposit?',
      'Confirm Rejection',
      '✕ Reject',
      'Cancel',
      'danger'
    );
    if (!confirmed) return;

    Loader.button(`rejectBtn_${id}`, LOADER_CONFIG.texts.rejecting);

    const token = localStorage.getItem('admin_token');
    const apiUrl = APP_CONFIG.apiUrl;
    try {
      const response = await fetch(`${apiUrl}/deposits/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ reason })
      });
      const data = await response.json();
      if (data.success) {
        await Dialog.alert('Deposit rejected.', 'Done', 'info');
        router.navigate('/admin/deposits');
      } else {
        await Dialog.alert(data.message || 'Failed to reject', 'Error', 'error');
      }
    } catch (error) {
      await Dialog.alert('Failed to reject deposit', 'Error', 'error');
    }

    Loader.buttonRestore(`rejectBtn_${id}`, '✕ Reject');
  }

  /**
   * View a specific deposit's details in a modal
   * Shows full deposit info with copy buttons
   */
  static async viewDeposit(id) {
    const token = localStorage.getItem('admin_token');
    const apiUrl = APP_CONFIG.apiUrl;
    try {
      // Fetch deposit details from admin endpoint
      const response = await fetch(`${apiUrl}/deposits/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      const deposits = result.data?.deposits || result.data || [];
      const d = deposits.find(dep => dep.id == id);

      if (!d) {
        await Dialog.alert('Deposit not found', 'Error', 'error');
        return;
      }

      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal animate-scaleIn" style="max-width:450px;">
          <div class="modal-header">
            <h3 class="modal-title">Deposit Details</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
          </div>
          <div class="bank-info-card mb-3">
            <div class="bank-info-row">
              <span class="bank-info-label">Amount</span>
              <span class="bank-info-value font-bold">${Number(d.amount).toLocaleString()} ETB</span>
            </div>
            <div class="bank-info-row">
              <span class="bank-info-label">Bank</span>
              <div class="flex items-center gap-2">
                <span class="bank-info-value">${d.bank_name}</span>
                <button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText('${d.bank_name}'); Toast.show('Copied!')">📋</button>
              </div>
            </div>
            <div class="bank-info-row">
              <span class="bank-info-label">Transaction ID</span>
              <div class="flex items-center gap-2">
                <span class="bank-info-value">${d.transaction_id}</span>
                <button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText('${d.transaction_id}'); Toast.show('Copied!')">📋</button>
              </div>
            </div>
            <div class="bank-info-row">
              <span class="bank-info-label">User</span>
              <div class="flex items-center gap-2">
                <span class="bank-info-value">${d.phone}</span>
                <button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText('${d.phone}'); Toast.show('Copied!')">📋</button>
              </div>
            </div>
            <div class="bank-info-row">
              <span class="bank-info-label">Status</span>
              <span class="bank-info-value"><span class="badge badge-warning">${d.status}</span></span>
            </div>
          </div>
        </div>
      `;
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
      document.body.appendChild(overlay);
    } catch (error) {
      await Dialog.alert('Failed to load deposit details', 'Error', 'error');
    }
  }

  unmount() {}
}