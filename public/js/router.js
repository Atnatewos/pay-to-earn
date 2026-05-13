// public/js/router.js

/**
 * Single Page Application Router
 * Handles ALL client-side routing for user and admin panels
 * ALL auth checks use Session controller (single source of truth)
 * Enforces suspended/banned user restrictions
 * Auto-injects breadcrumbs and admin action buttons
 */
var Router = function() {
  this.routes = {};
  this.routeMeta = {};
  this.currentPage = null;
  this.currentAdminPage = null;
  this.currentPath = '';
  this.currentQuery = {};
  this.history = [];
  this.userContainer = document.getElementById('appContent');
  this.adminContainer = document.getElementById('adminContent');
  this.navigating = false;
  this.watcherInterval = null;

  window.addEventListener('hashchange', this.handleRoute.bind(this));
  window.addEventListener('load', function() {
    this.handleRoute();
    this.startWatcher();
  }.bind(this));
};

Router.prototype.addRoute = function(path, page, meta) {
  if (!meta) meta = {};
  this.routes[path] = page;
  this.routeMeta[path] = {
    breadcrumbs: meta.breadcrumbs || [],
    back: meta.back || null,
    actions: meta.actions || [],
    isAdmin: path.startsWith('/admin')
  };
};

Router.prototype.startWatcher = function() {
  if (this.watcherInterval) clearInterval(this.watcherInterval);

  this.watcherInterval = setInterval(function() {
    var hash = window.location.hash.slice(1) || '/';
    var path = hash.split('?')[0];
    var isAdmin = path.startsWith('/admin');

    if (path === '/login' || path === '/register' || path === '/admin/login' || path === '/' || path === '/home') {
      return;
    }

    if (isAdmin) {
      var mainEl = this.adminContainer && this.adminContainer.querySelector('.admin-main');
      if (mainEl && !mainEl.querySelector('.admin-breadcrumb')) {
        this.forceInjectAdminBreadcrumb(path);
      }
    } else {
      var pageEl = this.userContainer && this.userContainer.querySelector('.page');
      if (pageEl && !pageEl.querySelector('.breadcrumb')) {
        this.forceInjectUserBreadcrumb(path);
      }
    }
  }.bind(this), 300);
};

Router.prototype.reinjectNavigation = function() {
  var hash = window.location.hash.slice(1) || '/';
  var path = hash.split('?')[0];
  var isAdmin = path.startsWith('/admin');

  if (path === '/login' || path === '/register' || path === '/admin/login' || path === '/' || path === '/home') {
    return;
  }

  if (isAdmin) {
    this.forceInjectAdminBreadcrumb(path);
    this.forceInjectAdminActions(path);
  } else {
    this.forceInjectUserBreadcrumb(path);
  }
};

Router.prototype.handleRoute = function() {
  if (this.navigating) return;

  var rawHash = window.location.hash.slice(1) || '/';
  var hashParts = rawHash.split('?');
  var path = hashParts[0];
  var queryString = hashParts[1];

  var queryParams = {};
  if (queryString) {
    queryString.split('&').forEach(function(pair) {
      var parts = pair.split('=');
      var key = parts[0];
      var val = parts[1] || '';
      queryParams[key] = decodeURIComponent(val);
    });
  }

  this.currentPath = path;
  this.currentQuery = queryParams;

  if (this.history.length === 0 || this.history[this.history.length - 1] !== path) {
    this.history.push(path);
  }
  if (this.history.length > 50) {
    this.history = this.history.slice(-50);
  }

  var isAdminRoute = path.startsWith('/admin');

  // USE SESSION CONTROLLER - Single source of truth
  var adminToken = Session.getAdminToken();
  var userToken = Session.getUserToken();

  document.getElementById('app').style.display = isAdminRoute ? 'none' : 'block';
  document.getElementById('adminApp').style.display = isAdminRoute ? 'flex' : 'none';

  if (isAdminRoute) {
    if (adminToken && path === '/admin/login') {
      window.location.hash = '#/admin/dashboard';
      return;
    }
    if (!adminToken && path !== '/admin/login') {
      window.location.hash = '#/admin/login';
      return;
    }
  } else {
    var publicRoutes = ['/', '/login', '/register', '/support'];
    if (!userToken && !publicRoutes.includes(path)) {
      window.location.hash = '#/login';
      return;
    }
    if (userToken && (path === '/login' || path === '/register' || path === '/')) {
      window.location.hash = '#/home';
      return;
    }

    if (userToken) {
      var userData = Session.getUserData() || {};

      if (userData.status === 'suspended' || userData.status === 'banned') {
        var allowedRoutes = ['/home', '/profile', '/support', '/login', '/register', '/'];

        if (!allowedRoutes.includes(path)) {
          setTimeout(function() {
            var message = userData.status === 'banned'
              ? 'Your account has been permanently banned. You cannot access this feature.'
              : 'Your account is suspended. Please contact support for assistance.';
            var title = userData.status === 'banned' ? 'Account Banned' : 'Account Suspended';

            if (typeof Dialog !== 'undefined') {
              Dialog.alert(message, title, 'warning');
            }
          }, 300);

          window.location.hash = '#/home';
          return;
        }
      }
    }
  }

  var page = this.routes[path];
  if (page) {
    this.navigating = true;

    if (isAdminRoute && this.currentAdminPage && this.currentAdminPage.unmount) {
      this.currentAdminPage.unmount();
    }
    if (!isAdminRoute && this.currentPage && this.currentPage.unmount) {
      this.currentPage.unmount();
    }

    var container = isAdminRoute ? this.adminContainer : this.userContainer;
    var pageInstance = new page(container);

    if (isAdminRoute) {
      this.currentAdminPage = pageInstance;
    } else {
      this.currentPage = pageInstance;
    }

    pageInstance.render();

    setTimeout(function() {
      this.injectNow(path, isAdminRoute);
      this.navigating = false;
    }.bind(this), 50);
  }
};

Router.prototype.injectNow = function(path, isAdmin) {
  if (isAdmin) {
    this.forceInjectAdminBreadcrumb(path);
    this.forceInjectAdminActions(path);
  } else {
    this.forceInjectUserBreadcrumb(path);
  }
};

Router.prototype.forceInjectUserBreadcrumb = function(path) {
  var meta = this.routeMeta[path];
  if (!meta || !meta.breadcrumbs || meta.breadcrumbs.length === 0) return;

  var existing = document.querySelector('.breadcrumb');
  if (existing) existing.remove();

  var nav = document.createElement('nav');
  nav.className = 'breadcrumb';
  nav.setAttribute('data-router', 'breadcrumb');

  nav.innerHTML = meta.breadcrumbs.map(function(item, i) {
    var isLast = i === meta.breadcrumbs.length - 1;
    var linkHtml = isLast
      ? '<span>' + item.label + '</span>'
      : '<a onclick="router.navigate(\'' + (item.path || '#') + '\')" class="breadcrumb-link">' + item.label + '</a>';

    return '<span class="breadcrumb-item ' + (isLast ? 'active' : '') + '">' +
      linkHtml +
      (!isLast ? '<span class="breadcrumb-separator">›</span>' : '') +
    '</span>';
  }).join('');

  var pageEl = this.userContainer && this.userContainer.querySelector('.page');
  if (pageEl && !pageEl.querySelector('[data-router="breadcrumb"]')) {
    pageEl.insertBefore(nav, pageEl.firstChild);
  }
};

Router.prototype.forceInjectAdminBreadcrumb = function(path) {
  var meta = this.routeMeta[path];
  if (!meta || !meta.breadcrumbs || meta.breadcrumbs.length === 0) return;

  var existing = document.querySelector('.admin-breadcrumb');
  if (existing) existing.remove();

  var nav = document.createElement('nav');
  nav.className = 'admin-breadcrumb';
  nav.setAttribute('data-router', 'breadcrumb');

  nav.innerHTML = meta.breadcrumbs.map(function(item, i) {
    var isLast = i === meta.breadcrumbs.length - 1;
    var linkHtml = isLast
      ? '<span>' + item.label + '</span>'
      : '<a onclick="router.navigate(\'' + (item.path || '#') + '\')" class="breadcrumb-link">' + item.label + '</a>';

    return '<span class="breadcrumb-item ' + (isLast ? 'active' : '') + '">' +
      linkHtml +
      (!isLast ? '<span class="breadcrumb-separator">›</span>' : '') +
    '</span>';
  }).join('');

  var mainEl = this.adminContainer && this.adminContainer.querySelector('.admin-main');
  if (mainEl && !mainEl.querySelector('[data-router="breadcrumb"]')) {
    mainEl.insertBefore(nav, mainEl.firstChild);
  }
};

Router.prototype.forceInjectAdminActions = function(path) {
  var meta = this.routeMeta[path];
  if (!meta || !meta.actions || meta.actions.length === 0) return;

  var existing = document.querySelector('.admin-action-buttons');
  if (existing) existing.remove();

  var container = document.createElement('div');
  container.className = 'admin-action-buttons';
  container.setAttribute('data-router', 'actions');

  container.innerHTML = meta.actions.map(function(btn) {
    return '<button class="btn btn-' + (btn.variant || 'primary') + ' ' + (btn.block ? 'btn-block' : '') + '" onclick="' + btn.onclick + '">' + (btn.icon || '') + ' ' + btn.label + '</button>';
  }).join('');

  var mainEl = this.adminContainer && this.adminContainer.querySelector('.admin-main');
  if (mainEl && !mainEl.querySelector('[data-router="actions"]')) {
    mainEl.appendChild(container);
  }
};

Router.prototype.navigate = function(path) {
  window.location.hash = '#' + path;
};

var router = new Router();