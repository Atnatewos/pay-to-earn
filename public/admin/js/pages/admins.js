// public/admin/js/pages/admins.js

/**
 * Admin Management Page
 * Only accessible by super_admin
 * Create, edit, delete admin accounts and manage their permissions
 */
class AdminAdmins {
  constructor(container) {
    this.container = container;
  }

  render() {
    AdminSidebar.render('/admin/admins');
    this.container.innerHTML = `
      <div class="admin-main">
        <div class="admin-page-header">
          <h1 class="admin-page-title">Admin Management</h1>
          <p class="admin-page-subtitle">Manage admin accounts and permissions</p>
        </div>
        <div id="adminsContent"></div>
      </div>
    `;
    router.reinjectNavigation();
    setTimeout(() => this.loadAdmins(), 100);
  }

  async loadAdmins() {
    var content = document.getElementById('adminsContent');
    if (!content) return;

    Loader.auto('adminsContent');

    try {
      var token = localStorage.getItem('admin_token');
      var apiUrl = APP_CONFIG.apiUrl;
      var response = await fetch(apiUrl + '/admin/admins', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      var result = await response.json();

      if (!result.success) {
        content.innerHTML = '<div class="empty-state"><p>Failed to load admins</p></div>';
        return;
      }

      var admins = result.data.admins || [];
      var allPermissions = result.data.allPermissions || [];

      content.innerHTML = `
        <button class="btn btn-primary mb-4" onclick="AdminAdmins.showCreateModal()">+ Create New Admin</button>

        <div class="admin-table">
          <div class="admin-table-header" style="grid-template-columns:1fr 120px 100px 120px 100px;">
            <span>Username</span><span>Role</span><span>Status</span><span>Last Login</span><span></span>
          </div>
          ${admins.map(function(a) {
            return '<div class="admin-table-row" style="grid-template-columns:1fr 120px 100px 120px 100px;">' +
              '<span class="font-medium">' + a.username + '</span>' +
              '<span class="badge badge-primary">' + a.role + '</span>' +
              '<span class="badge ' + (a.status === 'active' ? 'badge-success' : 'badge-danger') + '">' + a.status + '</span>' +
              '<span class="text-sm text-secondary">' + (a.last_login ? new Date(a.last_login).toLocaleDateString() : 'Never') + '</span>' +
              '<div class="flex gap-1">' +
                '<button class="btn btn-ghost btn-sm" onclick="AdminAdmins.showPermissionsModal(' + a.id + ',\'' + a.username + '\')" title="Permissions">🔑</button>' +
                '<button class="btn btn-ghost btn-sm" onclick="AdminAdmins.showEditModal(' + a.id + ',\'' + a.username + '\',\'' + a.role + '\')" title="Edit">✏️</button>' +
                '<button class="btn btn-ghost btn-sm" onclick="AdminAdmins.deleteAdmin(' + a.id + ',\'' + a.username + '\')" title="Delete">🗑️</button>' +
              '</div>' +
            '</div>';
          }).join('')}
        </div>
      `;

      // Store permissions for later use
      window._adminPermissions = allPermissions;

    } catch (error) {
      content.innerHTML = '<div class="empty-state"><p>Failed to load admins</p></div>';
    }
  }

  /**
   * Show modal for creating a new admin
   */
  static async showCreateModal() {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal animate-scaleIn" style="max-width:420px;">
        <div class="modal-header"><h3 class="modal-title">Create Admin</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button></div>
        <form id="createAdminForm">
          <div class="form-group"><label class="form-label">Username</label><input type="text" class="form-input" id="newUsername" required></div>
          <div class="form-group"><label class="form-label">Password</label><input type="password" class="form-input" id="newPassword" required minlength="6"></div>
          <div class="form-group"><label class="form-label">Role</label>
            <select class="form-select" id="newRole">
              <option value="senior_admin">Senior Admin</option>
              <option value="admin">Admin</option>
              <option value="moderator">Moderator</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary btn-block">Create Admin</button>
        </form>
      </div>
    `;
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);

    document.getElementById('createAdminForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      var username = document.getElementById('newUsername').value.trim();
      var password = document.getElementById('newPassword').value.trim();
      var role = document.getElementById('newRole').value;

      if (password.length < 6) { await Dialog.alert('Password must be at least 6 characters', 'Invalid', 'warning'); return; }

      var token = localStorage.getItem('admin_token');
      var apiUrl = APP_CONFIG.apiUrl;
      var res = await fetch(apiUrl + '/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ username: username, password: password, role: role })
      });
      var data = await res.json();
      if (data.success) {
        await Dialog.alert('Admin created!', 'Success', 'success');
        overlay.remove();
        router.navigate('/admin/admins');
      } else {
        await Dialog.alert(data.message, 'Error', 'error');
      }
    });
  }

  /**
   * Show modal for editing an admin
   */
  static async showEditModal(id, username, role) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal animate-scaleIn" style="max-width:420px;">
        <div class="modal-header"><h3 class="modal-title">Edit Admin</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button></div>
        <form id="editAdminForm">
          <div class="form-group"><label class="form-label">Username</label><input type="text" class="form-input" id="editUsername" value="${username}"></div>
          <div class="form-group"><label class="form-label">New Password (leave blank to keep)</label><input type="password" class="form-input" id="editPassword" placeholder="New password"></div>
          <div class="form-group"><label class="form-label">Role</label>
            <select class="form-select" id="editRole">
              <option value="senior_admin" ${role==='senior_admin'?'selected':''}>Senior Admin</option>
              <option value="admin" ${role==='admin'?'selected':''}>Admin</option>
              <option value="moderator" ${role==='moderator'?'selected':''}>Moderator</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary btn-block">Save Changes</button>
        </form>
      </div>
    `;
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);

    document.getElementById('editAdminForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      var newUsername = document.getElementById('editUsername').value.trim();
      var newPassword = document.getElementById('editPassword').value.trim();
      var newRole = document.getElementById('editRole').value;
      var body = {};
      if (newUsername && newUsername !== username) body.username = newUsername;
      if (newPassword && newPassword.length >= 6) body.password = newPassword;
      else if (newPassword && newPassword.length < 6) { await Dialog.alert('Password must be at least 6 characters', 'Invalid', 'warning'); return; }
      if (newRole && newRole !== role) body.role = newRole;
      if (Object.keys(body).length === 0) { await Dialog.alert('No changes made', 'Info', 'info'); return; }
      var token = localStorage.getItem('admin_token');
      var apiUrl = APP_CONFIG.apiUrl;
      var res = await fetch(apiUrl + '/admin/admins/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(body)
      });
      var data = await res.json();
      if (data.success) { await Dialog.alert('Admin updated!', 'Success', 'success'); overlay.remove(); router.navigate('/admin/admins'); }
      else { await Dialog.alert(data.message, 'Error', 'error'); }
    });
  }

  /**
   * Show modal for managing admin permissions with checkboxes
   */
  static async showPermissionsModal(id, username) {
    var token = localStorage.getItem('admin_token');
    var apiUrl = APP_CONFIG.apiUrl;

    // Get current admin permissions
    var res = await fetch(apiUrl + '/admin/admins', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    var data = await res.json();
    var admins = data.data.admins || [];
    var allPermissions = data.data.allPermissions || [];
    var admin = admins.find(function(a) { return a.id === id; });
    var currentPerms = admin ? (admin.permissions || []) : [];

    // Group permissions by category
    var categories = {};
    allPermissions.forEach(function(p) {
      if (!categories[p.category]) categories[p.category] = [];
      categories[p.category].push(p);
    });

    var checkboxesHtml = '';
    Object.keys(categories).forEach(function(cat) {
      checkboxesHtml += '<h5 class="mb-2 mt-3">' + cat + '</h5>';
      categories[cat].forEach(function(p) {
        var checked = currentPerms.indexOf(p.code) !== -1 ? 'checked' : '';
        checkboxesHtml += '<div class="list-item"><div class="list-item-content"><div class="list-item-title">' + p.description + '</div><div class="list-item-subtitle text-xs text-muted">' + p.code + '</div></div><label class="toggle-switch"><input type="checkbox" ' + checked + ' value="' + p.code + '" class="perm-checkbox"><span class="toggle-slider"></span></label></div>';
      });
    });

    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal animate-slideUp" style="max-width:550px;max-height:85vh;">
        <div class="modal-header"><h3 class="modal-title">🔑 Permissions: ${username}</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button></div>
        <div id="permissionsList">${checkboxesHtml}</div>
        <button class="btn btn-primary btn-block mt-4" id="savePermsBtn">💾 Save Permissions</button>
      </div>
    `;
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);

    document.getElementById('savePermsBtn').addEventListener('click', async function() {
      var selected = [];
      document.querySelectorAll('.perm-checkbox:checked').forEach(function(cb) {
        selected.push(cb.value);
      });

      var token = localStorage.getItem('admin_token');
      var apiUrl = APP_CONFIG.apiUrl;
      await fetch(apiUrl + '/admin/admins/' + id + '/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ permissions: selected })
      });

      await Dialog.alert('Permissions updated!', 'Success', 'success');
      overlay.remove();
      router.navigate('/admin/admins');
    });
  }

  /**
   * Delete an admin account
   */
  static async deleteAdmin(id, username) {
    var confirmed = await Dialog.confirm(
      'Delete admin "' + username + '"? This cannot be undone.',
      'Delete Admin',
      '🗑️ Delete',
      'Cancel',
      'danger'
    );
    if (!confirmed) return;

    var token = localStorage.getItem('admin_token');
    var apiUrl = APP_CONFIG.apiUrl;
    await fetch(apiUrl + '/admin/admins/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    router.navigate('/admin/admins');
  }

  unmount() {}
}