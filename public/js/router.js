// public/js/router.js

/**
 * Single Page Application Router
 * Handles all client-side routing for both user and admin panels
 * Checks authentication tokens from sessionStorage first, localStorage as fallback
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

/**
 * Register a route with optional metadata for breadcrumbs
 * @param {string} path - URL hash path like '/home' or '/admin/dashboard'
 * @param {function} page - Page constructor function
 * @param {object} meta - Optional breadcrumbs, back button, action buttons
 */
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

/**
 * Start a watcher that periodically checks if breadcrumbs are missing
 * This handles cases where pages re-render themselves (tabs, filters)
 */
Router.prototype.startWatcher = function() {
  if (this.watcherInterval) clearInterval(this.watcherInterval);

  this.watcherInterval = setInterval(function() {
    var hash = window.location.hash.slice(1) || '/';
    var path = hash.split('?')[0];
    var isAdmin = path.startsWith('/admin');

    // Skip auth pages
    if (path === '/login' || path === '/register' || path === '/admin/login' || path === '/' || path === '/home') {
      return;
    }

    if (isAdmin) {
      var mainEl = this.adminContainer?.querySelector('.admin-main');
      if (mainEl && !mainEl.querySelector('.admin-breadcrumb')) {
        this.forceInjectAdminBreadcrumb(path);
      }
    } else {
      var pageEl = this.userContainer?.querySelector('.page');
      if (pageEl && !pageEl.querySelector('.breadcrumb')) {
        this.forceInjectUserBreadcrumb(path);
      }
    }
  }.bind(this), 300);
};

/**
 * Public method for pages to call when they re-render themselves
 * Re-injects breadcrumbs after a tab switch or filter change
 */
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

/**
 * Main route handler - called on hashchange and page load
 * Parses URL hash, checks authentication, renders the appropriate page
 */
Router.prototype.handleRoute = function() {
  if (this.navigating) return;

  var rawHash = window.location.hash.slice(1) || '/';
  var hashParts = rawHash.split('?');
  var path = hashParts[0];
  var queryString = hashParts[1];

  // Parse query parameters from URL hash
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

  // Track navigation history (max 50 entries)
  if (this.history.length === 0 || this.history[this.history.length - 1] !== path) {
    this.history.push(path);
  }
  if (this.history.length > 50) {
    this.history = this.history.slice(-50);
  }

  var isAdminRoute = path.startsWith('/admin');

  // Check tokens - sessionStorage first, localStorage as fallback
  var adminToken = sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token');
  var userToken = sessionStorage.getItem('token') || localStorage.getItem('token');

  // Toggle visibility between user app and admin app
  document.getElementById('app').style.display = isAdminRoute ? 'none' : 'block';
  document.getElementById('adminApp').style.display = isAdminRoute ? 'flex' : 'none';

  // ============ ADMIN ROUTING ============
  if (isAdminRoute) {
    // Admin already logged in but visiting login page → redirect to dashboard
    if (adminToken && path === '/admin/login') {
      window.location.hash = '#/admin/dashboard';
      return;
    }

    // Admin not logged in and not on login page → redirect to login
    if (!adminToken && path !== '/admin/login') {
      window.location.hash = '#/admin/login';
      return;
    }
  }

  // ============ USER ROUTING ============
  if (!isAdminRoute) {
    var publicRoutes = ['/', '/login', '/register', '/support'];

    // User not logged in and trying to access protected page → redirect to login
    if (!userToken && !publicRoutes.includes(path)) {
      window.location.hash = '#/login';
      return;
    }

    // User logged in but visiting login/register → redirect to home
    if (userToken && (path === '/login' || path === '/register' || path === '/')) {
      window.location.hash = '#/home';
      return;
    }

    // Check if suspended/banned user is trying to access restricted pages
    if (userToken) {
      var userData = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');

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
            } else {
              alert(message);
            }
          }, 300);

          window.location.hash = '#/home';
          return;
        }
      }
    }
  }

  // Render the page if route exists
  var page = this.routes[path];
  if (page) {
    this.navigating = true;

    // Unmount current page before rendering new one
    if (isAdminRoute && this.currentAdminPage && this.currentAdminPage.unmount) {
      this.currentAdminPage.unmount();
    }
    if (!isAdminRoute && this.currentPage && this.currentPage.unmount) {
      this.currentPage.unmount();
    }

    // Create page instance and render
    var container = isAdminRoute ? this.adminContainer : this.userContainer;
    var pageInstance = new page(container);

    if (isAdminRoute) {
      this.currentAdminPage = pageInstance;
    } else {
      this.currentPage = pageInstance;
    }

    pageInstance.render();

    // Inject breadcrumbs after render completes
    setTimeout(function() {
      this.injectNow(path, isAdminRoute);
      this.navigating = false;
    }.bind(this), 50);
  }
};

/**
 * Inject breadcrumbs and action buttons for the current path
 */
Router.prototype.injectNow = function(path, isAdmin) {
  if (isAdmin) {
    this.forceInjectAdminBreadcrumb(path);
    this.forceInjectAdminActions(path);
  } else {
    this.forceInjectUserBreadcrumb(path);
  }
};

/**
 * Inject user breadcrumbs into the page
 */
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
    var linkHtml = '';

    if (!isLast) {
      linkHtml = '<a onclick="router.navigate(\'' + (item.path || '#') + '\')" class="breadcrumb-link">' + item.label + '</a>';
    } else {
      linkHtml = '<span>' + item.label + '</span>';
    }

    return '<span class="breadcrumb-item ' + (isLast ? 'active' : '') + '">' +
      linkHtml +
      (!isLast ? '<span class="breadcrumb-separator">›</span>' : '') +
    '</span>';
  }).join('');

  var pageEl = this.userContainer?.querySelector('.page');
  if (pageEl && !pageEl.querySelector('[data-router="breadcrumb"]')) {
    pageEl.insertBefore(nav, pageEl.firstChild);
  }
};

/**
 * Inject admin breadcrumbs into the admin main content area
 */
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
    var linkHtml = '';

    if (!isLast) {
      linkHtml = '<a onclick="router.navigate(\'' + (item.path || '#') + '\')" class="breadcrumb-link">' + item.label + '</a>';
    } else {
      linkHtml = '<span>' + item.label + '</span>';
    }

    return '<span class="breadcrumb-item ' + (isLast ? 'active' : '') + '">' +
      linkHtml +
      (!isLast ? '<span class="breadcrumb-separator">›</span>' : '') +
    '</span>';
  }).join('');

  var mainEl = this.adminContainer?.querySelector('.admin-main');
  if (mainEl && !mainEl.querySelector('[data-router="breadcrumb"]')) {
    mainEl.insertBefore(nav, mainEl.firstChild);
  }
};

/**
 * Inject admin action buttons at the bottom of admin content
 */
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

  var mainEl = this.adminContainer?.querySelector('.admin-main');
  if (mainEl && !mainEl.querySelector('[data-router="actions"]')) {
    mainEl.appendChild(container);
  }
};

/**
 * Navigate to a specific route by setting the URL hash
 * @param {string} path - URL hash path like '/home'
 */
Router.prototype.navigate = function(path) {
  window.location.hash = '#' + path;
};

// Create the global router instance
var router = new Router();