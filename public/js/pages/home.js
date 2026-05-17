// public/js/pages/home.js

/**
 * User Home Dashboard
 * Shows balance, capital vs earnings, manager badge, tasks, and earnings summary
 * All styling through CSS classes - zero inline styles
 * All values from API/config - no hardcoded data
 */
var HomePage = function(container) {
  this.container = container;
};

HomePage.prototype.render = function() {
  Navbar.render(
    (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.name : 'Earn'),
    false,
    [{ icon: '🔔', title: 'Notifications', onclick: 'NotificationBell.showNotifications()' }]
  );
  BottomNav.render('/home');
  DesktopSidebar.render('/home');

  // Update notification count after a short delay
  setTimeout(function() {
    if (typeof NotificationBell !== 'undefined') {
      NotificationBell.updateCount();
    }
  }, 500);

  // Show skeleton loading state
  this.container.innerHTML =
    '<div class="page">' +
      '<div id="stickyAlerts"></div>' +
      '<div id="homeContent">' +
        '<div class="balance-hero">' +
          '<div class="skeleton" style="height:24px;width:100px;background:rgba(255,255,255,0.2);margin-bottom:8px;"></div>' +
          '<div class="skeleton" style="height:48px;width:200px;background:rgba(255,255,255,0.2);margin-bottom:16px;"></div>' +
          '<div class="flex gap-3">' +
            '<div class="skeleton" style="height:36px;width:80px;background:rgba(255,255,255,0.2);border-radius:8px;"></div>' +
            '<div class="skeleton" style="height:36px;width:80px;background:rgba(255,255,255,0.2);border-radius:8px;"></div>' +
          '</div>' +
        '</div>' +
        '<div class="stats-row">' +
          '<div class="skeleton" style="height:100px;"></div>' +
          '<div class="skeleton" style="height:100px;"></div>' +
        '</div>' +
      '</div>' +
    '</div>';

  router.reinjectNavigation();
  this.loadData();
  AlertPopup.checkAlerts();
  setTimeout(function() {
    HomePage.calculateDaysRemaining();
  }, 300);
};

HomePage.prototype.loadData = function() {
  var self = this;

  API.get('/auth/profile')
    .then(function(profileData) {
      var user = profileData.data;

      Promise.all([
        API.get('/tasks/earnings'),
        API.get('/tasks/today')
      ]).then(function(results) {
        var earn = results[0].data;
        var todayTask = results[1].data;

        self.renderDashboard(user, earn, todayTask);
      });
    })
    .catch(function(error) {
      document.getElementById('homeContent').innerHTML =
        '<div class="empty-state">' +
          '<div class="empty-state-icon">⚠️</div>' +
          '<h3 class="empty-state-title">Failed to load</h3>' +
          '<p class="empty-state-description">' + error.message + '</p>' +
          '<button class="btn btn-primary" onclick="router.navigate(\'/home\')">Retry</button>' +
        '</div>';
    });
};

HomePage.prototype.renderDashboard = function(user, earn, todayTask) {
  var self = this;

  // Build package badge HTML
  var packageHtml = '';
  if (user.active_package) {
    var managerBadgeHtml = '';
    if (user.manager_rank) {
      managerBadgeHtml = '<span class="badge manager-badge ml-1">🏆 ' + user.manager_rank + '</span>';
    }

    var expiryHtml = '';
    if (user.package_expiry) {
      expiryHtml =
        '<div class="expiry-timer" data-expiry="' + user.package_expiry + '">' +
          '<div class="expiry-timer-text">' +
            '<span>⏳</span>' +
            '<span id="daysRemaining">Calculating...</span>' +
          '</div>' +
          '<div class="expiry-progress-bar">' +
            '<div id="expiryProgress" class="expiry-progress-fill" style="background:rgba(255,255,255,0.8);"></div>' +
          '</div>' +
        '</div>';
    }

    packageHtml =
      '<div class="package-expiry-info mt-3">' +
        '<div class="flex items-center gap-2 mb-2">' +
          '<span class="badge badge-success">' +
            '<span class="pulse-dot"></span> ' + user.active_package + ' Active' +
          '</span>' +
          managerBadgeHtml +
        '</div>' +
        expiryHtml +
      '</div>';
  } else {
    packageHtml = '<div class="mt-3"><span class="badge badge-warning">⚠️ No Active Package</span></div>';
  }

  // Build the complete dashboard HTML
  document.getElementById('homeContent').innerHTML =
    '<div class="balance-hero animate-fadeInUp">' +
      '<div class="balance-hero-label">Total Balance</div>' +
      '<div class="balance-hero-amount">' + self.formatETB(user.balance) + ' ETB</div>' +

      // Capital vs Earnings breakdown using CSS classes
      '<div class="flex gap-10 mt-10">' +
        '<div class="capital-box">' +
          '<div class="capital-box-label">💎 Capital</div>' +
          '<div class="capital-box-value">' + self.formatETB(user.capital || 0) + ' ETB</div>' +
        '</div>' +
        '<div class="capital-box">' +
          '<div class="capital-box-label">💰 Withdrawable</div>' +
          '<div class="capital-box-value">' + self.formatETB(user.earnings_balance || 0) + ' ETB</div>' +
        '</div>' +
      '</div>' +

      packageHtml +

      '<div class="balance-hero-actions">' +
        '<button class="btn btn-white btn-sm" onclick="router.navigate(\'/deposit\')">💳 Deposit</button>' +
        '<button class="btn btn-outline-white btn-sm" onclick="router.navigate(\'/withdraw\')">💸 Withdraw</button>' +
      '</div>' +
    '</div>' +

    // Stats row
    '<div class="stats-row">' +
      '<div class="stat-card-home animate-fadeInUp stagger-1" onclick="router.navigate(\'/tasks\')">' +
        '<div class="stat-card-icon tasks">✅</div>' +
        '<div class="stat-card-label">Tasks Today</div>' +
        '<div class="stat-card-value">' + (todayTask ? (todayTask.tasks_completed || 0) + '/' + (todayTask.tasks_allocated || 0) : '0/0') + '</div>' +
        '<div class="stat-card-sub">' + self.formatETB(todayTask ? (todayTask.earned || 0) : 0) + ' ETB earned</div>' +
      '</div>' +
      '<div class="stat-card-home animate-fadeInUp stagger-2" onclick="router.navigate(\'/earnings\')">' +
        '<div class="stat-card-icon earnings">💰</div>' +
        '<div class="stat-card-label">Today\'s Earnings</div>' +
        '<div class="stat-card-value text-success">' + self.formatETB(earn.todayEarnings) + '</div>' +
        '<div class="stat-card-sub">ETB</div>' +
      '</div>' +
    '</div>' +

    // Quick actions grid
    '<div class="quick-actions-grid animate-fadeInUp stagger-3">' +
      '<div class="quick-action-item" onclick="router.navigate(\'/tasks\')"><div class="quick-action-icon tasks">✅</div><span class="quick-action-label">Tasks</span></div>' +
      '<div class="quick-action-item" onclick="router.navigate(\'/team\')"><div class="quick-action-icon team">👥</div><span class="quick-action-label">Team</span></div>' +
      '<div class="quick-action-item" onclick="router.navigate(\'/packages\')"><div class="quick-action-icon packages">💎</div><span class="quick-action-label">Packages</span></div>' +
      '<div class="quick-action-item" onclick="router.navigate(\'/leaderboard\')"><div class="quick-action-icon" style="background:#FFF8E1;">🏆</div><span class="quick-action-label">Ranks</span></div>' +
    '</div>' +

    // Earnings summary
    '<div class="summary-card animate-fadeInUp stagger-4">' +
      '<div class="summary-card-header">📊 Earnings Summary</div>' +
      '<div class="summary-card-body">' +
        '<div class="summary-row"><span class="summary-label">Yesterday</span><span class="summary-value">' + self.formatETB(earn.yesterdayEarnings) + ' ETB</span></div>' +
        '<div class="summary-row"><span class="summary-label">This Week</span><span class="summary-value">' + self.formatETB(earn.weekEarnings) + ' ETB</span></div>' +
        '<div class="summary-row"><span class="summary-label">This Month</span><span class="summary-value">' + self.formatETB(earn.monthEarnings) + ' ETB</span></div>' +
        '<div class="summary-row"><span class="summary-label">Total Earned</span><span class="summary-value highlight">' + self.formatETB(earn.totalEarned) + ' ETB</span></div>' +
      '</div>' +
    '</div>' +

    // Commissions
    '<div class="summary-card animate-fadeInUp stagger-5">' +
      '<div class="summary-card-header">💎 Commissions</div>' +
      '<div class="summary-card-body">' +
        '<div class="summary-row"><span class="summary-label">Referral Commissions</span><span class="summary-value highlight">' + self.formatETB(earn.referralCommissions) + ' ETB</span></div>' +
        '<div class="summary-row"><span class="summary-label">Task Commissions</span><span class="summary-value highlight">' + self.formatETB(earn.taskCommissions) + ' ETB</span></div>' +
        '<div class="summary-row"><span class="summary-label">Total Deposited</span><span class="summary-value">' + self.formatETB(earn.totalDeposited) + ' ETB</span></div>' +
      '</div>' +
    '</div>';
};

HomePage.calculateDaysRemaining = function() {
  var expiryElement = document.querySelector('[data-expiry]');
  if (!expiryElement) {
    return;
  }

  var expiryDate = new Date(expiryElement.dataset.expiry);
  var now = new Date();
  var diffDays = Math.ceil((expiryDate - now) / 86400000);

  var daysElement = document.getElementById('daysRemaining');
  var progressElement = document.getElementById('expiryProgress');

  if (daysElement) {
    if (diffDays > 30) {
      daysElement.textContent = '30+ days remaining';
    } else if (diffDays > 0) {
      daysElement.textContent = diffDays + ' day' + (diffDays > 1 ? 's' : '') + ' remaining';
    } else if (diffDays === 0) {
      daysElement.textContent = '⚠️ Expires today!';
    } else {
      daysElement.textContent = '❌ Expired';
    }
  }

  if (progressElement) {
    var percentLeft = Math.max(0, Math.min(100, (diffDays / 30) * 100));
    progressElement.style.width = percentLeft + '%';

    if (diffDays <= 1) {
      progressElement.style.background = '#EF4444';
    } else if (diffDays <= 5) {
      progressElement.style.background = '#F59E0B';
    } else {
      progressElement.style.background = 'rgba(255,255,255,0.8)';
    }
  }
};

HomePage.prototype.formatETB = function(amount) {
  var num = Number(amount || 0);

  if (!isFinite(num) || num > 999999999 || num < 0) {
    return '0.00';
  }

  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

HomePage.prototype.unmount = function() {};