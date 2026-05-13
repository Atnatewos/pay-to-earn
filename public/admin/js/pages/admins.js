// public/admin/js/pages/admins.js

/**
 * Admin Management Page
 * Requires: admins.view
 * Sub-actions: admins.create, admins.edit, admins.delete, admins.permissions
 * Only super_admin or admins with explicit permissions can access
 * All buttons filtered by AdminPerms
 */
var AdminAdmins = function(container) {
  this.container = container;
};

AdminAdmins.prototype.render = function() {
  if (!AdminPerms.requirePage('admins.view')) return;

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
  setTimeout(this.loadAdmins.bind(this), 100);
};

AdminAdmins.prototype.loadAdmins = function() {
  var self = this;
  var content = document.getElementById('adminsContent');
  if (!content) return;

  Loader.auto('adminsContent');

  var token = localStorage.getItem('admin_token');
  var apiUrl = APP_CONFIG.apiUrl;
  var canCreate = AdminPerms.has('admins.create');
  var canEdit = AdminPerms.has('admins.edit');
  var canDelete = AdminPerms.has('admins.delete');
  var canPermissions = AdminPerms.has('admins.permissions');

  fetch(apiUrl + '/admin/admins', {
    headers: { 'Authorization': 'Bearer ' + token }
  }).then(function(r) { return r.json(); }).then(function(result) {
    if (!result.success) {
      content.innerHTML = '<div class="empty-state"><p>Failed to load admins</p></div>';
      return;
    }

    var admins = result.data.admins || [];
    var allPermissions = result.data.allPermissions || [];
    window._adminPermissions = allPermissions;

    var createButton = canCreate ? '<button class="btn btn-primary mb-4" onclick="AdminAdmins.showCreateModal()">+ Create New Admin</button>' : '';

    content.innerHTML = createButton + `
      <div class="admin-table">
        <div class="admin-table-header" style="grid-template-columns:1fr 120px 100px 120px 120px;">
          <span>Username</span><span>Role</span><span>Status</span><span>Last Login</span><span></span>
        </div>
        ${admins.map(function(a) {
          var actionButtons = '';
          if (canPermissions) actionButtons += '<button class="btn btn-ghost btn-sm" onclick="AdminAdmins.showPermissionsModal(' + a.id + ',\'' + (a.username || '') + '\')" title="Permissions">🔑</button>';
          if (canEdit) actionButtons += '<button class="btn btn-ghost btn-sm" onclick="AdminAdmins.showEditModal(' + a.id + ',\'' + (a.username || '') + '\',\'' + (a.role || '') + '\')" title="Edit">✏️</button>';
          if (canDelete) actionButtons += '<button class="btn btn-ghost btn-sm" onclick="AdminAdmins.deleteAdmin(' + a.id + ',\'' + (a.username || '') + '\')" title="Delete">🗑️</button>';

          return '<div class="admin-table-row" style="grid-template-columns:1fr 120px 100px 120px 120px;">' +
            '<span class="font-medium">' + (a.username || '') + '</span>' +
            '<span class="badge badge-primary">' + (a.role || '') + '</span>' +
            '<span class="badge ' + (a.status === 'active' ? 'badge-success' : 'badge-danger') + '">' + (a.status || '') + '</span>' +
            '<span class="text-sm text-secondary">' + (a.last_login ? new Date(a.last_login).toLocaleDateString() : 'Never') + '</span>' +
            '<div class="flex gap-1">' + (actionButtons || '<span class="text-xs text-muted">No actions</span>') + '</div>' +
          '</div>';
        }).join('')}
      </div>
    `;
  }).catch(function() {
    content.innerHTML = '<div class="empty-state"><p>Failed to load admins</p></div>';
  });
};

/**
 * Show modal for creating a new admin
 * Requires: admins.create
 */
AdminAdmins.showCreateModal = function() {
  if (!AdminPerms.has('admins.create')) return;

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

  document.getElementById('createAdminForm').addEventListener('submit', function(e) {
    e.preventDefault();
    var username = document.getElementById('newUsername').value.trim();
    var password = document.getElementById('newPassword').value.trim();
    var role = document.getElementById('newRole').value;

    if (password.length < 6) { Dialog.alert('Password must be at least 6 characters', 'Invalid', 'warning'); return; }

    var token = localStorage.getItem('admin_token');
    var apiUrl = APP_CONFIG.apiUrl;
    fetch(apiUrl + '/admin/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ username: username, password: password, role: role })
    }).then(function(r) { return r.json(); }).then(function(data) {
      if (data.success) { Dialog.alert('Admin created!', 'Success', 'success'); overlay.remove(); router.navigate('/admin/admins'); }
      else { Dialog.alert(data.message, 'Error', 'error'); }
    });
  });
};

/**
 * Show modal for editing an admin
 * Requires: admins.edit
 */
AdminAdmins.showEditModal = function(id, username, role) {
  if (!AdminPerms.has('admins.edit')) return;

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal animate-scaleIn" style="max-width:420px;">
      <div class="modal-header"><h3 class="modal-title">Edit Admin</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button></div>
      <form id="editAdminForm">
        <div class="form-group"><label class="form-label">Username</label><input type="text" class="form-input" id="editUsername" value="${username || ''}"></div>
        <div class="form-group"><label class="form-label">New Password (leave blank to keep)</label><input type="password" class="form-input" id="editPassword" placeholder="New password"></div>
        <div class="form-group"><label class="form-label">Role</label>
          <select class="form-select" id="editRole">
            <option value="senior_admin" ${role === 'senior_admin' ? 'selected' : ''}>Senior Admin</option>
            <option value="admin" ${role === 'admin' ? 'selected' : ''}>Admin</option>
            <option value="moderator" ${role === 'moderator' ? 'selected' : ''}>Moderator</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Save Changes</button>
      </form>
    </div>
  `;
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  document.getElementById('editAdminForm').addEventListener('submit', function(e) {
    e.preventDefault();
    var newUsername = document.getElementById('editUsername').value.trim();
    var newPassword = document.getElementById('editPassword').value.trim();
    var newRole = document.getElementById('editRole').value;
    var body = {};
    if (newUsername && newUsername !== username) body.username = newUsername;
    if (newPassword && newPassword.length >= 6) body.password = newPassword;
    else if (newPassword && newPassword.length < 6) { Dialog.alert('Password must be at least 6 characters', 'Invalid', 'warning'); return; }
    if (newRole && newRole !== role) body.role = newRole;
    if (Object.keys(body).length === 0) { Dialog.alert('No changes made', 'Info', 'info'); return; }
    var token = localStorage.getItem('admin_token');
    var apiUrl = APP_CONFIG.apiUrl;
    fetch(apiUrl + '/admin/admins/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(body)
    }).then(function(r) { return r.json(); }).then(function(data) {
      if (data.success) { Dialog.alert('Admin updated!', 'Success', 'success'); overlay.remove(); router.navigate('/admin/admins'); }
      else { Dialog.alert(data.message, 'Error', 'error'); }
    });
  });
};

/**
 * Show modal for managing admin permissions
 * Requires: admins.permissions
 */
AdminAdmins.showPermissionsModal = function(id, username) {
  if (!AdminPerms.has('admins.permissions')) return;

  var token = localStorage.getItem('admin_token');
  var apiUrl = APP_CONFIG.apiUrl;

  fetch(apiUrl + '/admin/admins', {
    headers: { 'Authorization': 'Bearer ' + token }
  }).then(function(r) { return r.json(); }).then(function(data) {
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
      checkboxesHtml += '<h5 class="mb-2 mt-3" style="color:var(--color-primary);font-weight:600;">' + cat + '</h5>';
      categories[cat].forEach(function(p) {
        var checked = currentPerms.indexOf(p.code) !== -1 ? 'checked' : '';
        checkboxesHtml += '<div class="list-item"><div class="list-item-content"><div class="list-item-title" style="font-size:14px;">' + p.description + '</div><div class="list-item-subtitle text-xs text-muted">' + p.code + '</div></div><label class="toggle-switch"><input type="checkbox" ' + checked + ' value="' + p.code + '" class="perm-checkbox"><span class="toggle-slider"></span></label></div>';
      });
    });

    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal animate-slideUp" style="max-width:550px;max-height:85vh;">
        <div class="modal-header"><h3 class="modal-title">🔑 Permissions: ${username}</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button></div>
        <div id="permissionsList" style="max-height:55vh;overflow-y:auto;">${checkboxesHtml}</div>
        <button class="btn btn-primary btn-block mt-4" id="savePermsBtn">💾 Save Permissions</button>
      </div>
    `;
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);

    document.getElementById('savePermsBtn').addEventListener('click', function() {
      var selected = [];
      var checkboxes = document.querySelectorAll('.perm-checkbox:checked');
      for (var i = 0; i < checkboxes.length; i++) {
        selected.push(checkboxes[i].value);
      }

      console.log('Saving permissions for admin ' + id + ':', selected);

      fetch(apiUrl + '/admin/admins/' + id + '/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ permissions: selected })
      }).then(function(r) { return r.json(); }).then(function(result) {
        if (result.success) {
          Dialog.alert('Permissions updated!', 'Success', 'success');
          overlay.remove();
          router.navigate('/admin/admins');
        } else {
          Dialog.alert(result.message || 'Failed to update permissions', 'Error', 'error');
        }
      }).catch(function() {
        Dialog.alert('Failed to save permissions', 'Error', 'error');
      });
    });
  }).catch(function() {
    Dialog.alert('Failed to load admin data', 'Error', 'error');
  });
};

/**
 * Delete an admin account
 * Requires: admins.delete
 */
AdminAdmins.deleteAdmin = function(id, username) {
  if (!AdminPerms.has('admins.delete')) return;

  Dialog.confirm(
    'Delete admin "' + username + '"? This cannot be undone.',
    'Delete Admin',
    '🗑️ Delete',
    'Cancel',
    'danger'
  ).then(function(confirmed) {
    if (!confirmed) return;
    var token = localStorage.getItem('admin_token');
    var apiUrl = APP_CONFIG.apiUrl;
    fetch(apiUrl + '/admin/admins/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(function() {
      router.navigate('/admin/admins');
    });
  });
};

AdminAdmins.prototype.unmount = function() {};