// public/js/pages/home.js

/**
 * User Home Dashboard
 * Shows balance, capital vs earnings, manager badge, tasks, earnings summary
 * Uses sessionStorage for multi-tab support
 * All values from API/config - no hardcoded data
 */
var HomePage = function(container) { this.container = container; };

HomePage.prototype.render = function() {
  var self = this;
  Navbar.render((typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.name : 'Earn'), false, [
    { icon: '🔔', title: 'Notifications', onclick: 'NotificationBell.showNotifications()' }
  ]);
  BottomNav.render('/home');
  DesktopSidebar.render('/home');
  setTimeout(function() { if (typeof NotificationBell !== 'undefined') NotificationBell.updateCount(); }, 500);

  this.container.innerHTML = '<div class="page"><div id="stickyAlerts"></div><div id="homeContent"><div class="balance-hero"><div class="skeleton" style="height:24px;width:100px;background:rgba(255,255,255,0.2);margin-bottom:8px;"></div><div class="skeleton" style="height:48px;width:200px;background:rgba(255,255,255,0.2);margin-bottom:16px;"></div><div class="flex gap-3"><div class="skeleton" style="height:36px;width:80px;background:rgba(255,255,255,0.2);border-radius:8px;"></div><div class="skeleton" style="height:36px;width:80px;background:rgba(255,255,255,0.2);border-radius:8px;"></div></div></div><div class="stats-row"><div class="skeleton" style="height:100px;"></div><div class="skeleton" style="height:100px;"></div></div></div></div>';

  router.reinjectNavigation();
  this.loadData();
  AlertPopup.checkAlerts();
  setTimeout(function() { HomePage.calculateDaysRemaining(); }, 300);
};

HomePage.prototype.loadData = function() {
  var self = this;
  API.get('/auth/profile').then(function(profileData) {
    var user = profileData.data;
    Promise.all([API.get('/tasks/earnings'), API.get('/tasks/today')]).then(function(results) {
      var earn = results[0].data;
      var todayTask = results[1].data;

      document.getElementById('homeContent').innerHTML =
        '<div class="balance-hero animate-fadeInUp">' +
          '<div class="balance-hero-label">Total Balance</div>' +
          '<div class="balance-hero-amount">' + self.formatETB(user.balance) + ' ETB</div>' +
          '<div style="display:flex;gap:10px;margin-top:10px;">' +
            '<div style="flex:1;background:rgba(255,255,255,0.2);padding:8px 12px;border-radius:10px;"><div style="font-size:10px;opacity:0.7;">💎 Capital</div><div style="font-weight:700;font-size:13px;">' + self.formatETB(user.capital || 0) + ' ETB</div></div>' +
            '<div style="flex:1;background:rgba(255,255,255,0.2);padding:8px 12px;border-radius:10px;"><div style="font-size:10px;opacity:0.7;">💰 Withdrawable</div><div style="font-weight:700;font-size:13px;">' + self.formatETB(user.earnings_balance || 0) + ' ETB</div></div>' +
          '</div>' +
          (user.active_package ?
            '<div class="package-expiry-info mt-3"><div class="flex items-center gap-2 mb-2"><span class="badge badge-success"><span class="pulse-dot"></span> ' + user.active_package + ' Active</span>' + (user.manager_rank ? '<span class="badge ml-1" style="background:linear-gradient(135deg,#FFD700,#FFA500);color:#000;">🏆 ' + user.manager_rank + '</span>' : '') + '</div>' + (user.package_expiry ? '<div class="expiry-timer" data-expiry="' + user.package_expiry + '"><div class="flex items-center gap-2 text-xs" style="color:rgba(255,255,255,0.9);"><span>⏳</span><span id="daysRemaining">Calculating...</span></div><div class="progress-bar mt-1" style="height:4px;background:rgba(255,255,255,0.2);"><div id="expiryProgress" class="progress-fill" style="width:100%;background:rgba(255,255,255,0.8);"></div></div></div>' : '') + '</div>'
            : '<div class="mt-3"><span class="badge badge-warning">⚠️ No Active Package</span></div>') +
          '<div class="balance-hero-actions"><button class="btn btn-white btn-sm" onclick="router.navigate(\'/deposit\')">💳 Deposit</button><button class="btn btn-outline-white btn-sm" onclick="router.navigate(\'/withdraw\')">💸 Withdraw</button></div>' +
        '</div>' +
        '<div class="stats-row">' +
          '<div class="stat-card-home animate-fadeInUp stagger-1" onclick="router.navigate(\'/tasks\')"><div class="stat-card-icon tasks">✅</div><div class="stat-card-label">Tasks Today</div><div class="stat-card-value">' + (todayTask ? (todayTask.tasks_completed || 0) + '/' + (todayTask.tasks_allocated || 0) : '0/0') + '</div><div class="stat-card-sub">' + self.formatETB(todayTask ? todayTask.earned || 0 : 0) + ' ETB earned</div></div>' +
          '<div class="stat-card-home animate-fadeInUp stagger-2" onclick="router.navigate(\'/earnings\')"><div class="stat-card-icon earnings">💰</div><div class="stat-card-label">Today\'s Earnings</div><div class="stat-card-value text-success">' + self.formatETB(earn.todayEarnings) + '</div><div class="stat-card-sub">ETB</div></div>' +
        '</div>' +
        '<div class="quick-actions-grid animate-fadeInUp stagger-3">' +
          '<div class="quick-action-item" onclick="router.navigate(\'/tasks\')"><div class="quick-action-icon tasks">✅</div><span class="quick-action-label">Tasks</span></div>' +
          '<div class="quick-action-item" onclick="router.navigate(\'/team\')"><div class="quick-action-icon team">👥</div><span class="quick-action-label">Team</span></div>' +
          '<div class="quick-action-item" onclick="router.navigate(\'/packages\')"><div class="quick-action-icon packages">💎</div><span class="quick-action-label">Packages</span></div>' +
          '<div class="quick-action-item" onclick="router.navigate(\'/leaderboard\')"><div class="quick-action-icon" style="background:#FFF8E1;">🏆</div><span class="quick-action-label">Ranks</span></div>' +
        '</div>' +
        '<div class="summary-card animate-fadeInUp stagger-4"><div class="summary-card-header">📊 Earnings Summary</div><div class="summary-card-body">' +
          '<div class="summary-row"><span class="summary-label">Yesterday</span><span class="summary-value">' + self.formatETB(earn.yesterdayEarnings) + ' ETB</span></div>' +
          '<div class="summary-row"><span class="summary-label">This Week</span><span class="summary-value">' + self.formatETB(earn.weekEarnings) + ' ETB</span></div>' +
          '<div class="summary-row"><span class="summary-label">This Month</span><span class="summary-value">' + self.formatETB(earn.monthEarnings) + ' ETB</span></div>' +
          '<div class="summary-row"><span class="summary-label">Total Earned</span><span class="summary-value highlight">' + self.formatETB(earn.totalEarned) + ' ETB</span></div>' +
        '</div></div>' +
        '<div class="summary-card animate-fadeInUp stagger-5"><div class="summary-card-header">💎 Commissions</div><div class="summary-card-body">' +
          '<div class="summary-row"><span class="summary-label">Referral Commissions</span><span class="summary-value highlight">' + self.formatETB(earn.referralCommissions) + ' ETB</span></div>' +
          '<div class="summary-row"><span class="summary-label">Task Commissions</span><span class="summary-value highlight">' + self.formatETB(earn.taskCommissions) + ' ETB</span></div>' +
          '<div class="summary-row"><span class="summary-label">Total Deposited</span><span class="summary-value">' + self.formatETB(earn.totalDeposited) + ' ETB</span></div>' +
        '</div></div>';
    });
  }).catch(function(error) {
    document.getElementById('homeContent').innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3 class="empty-state-title">Failed to load</h3><p class="empty-state-description">' + error.message + '</p><button class="btn btn-primary" onclick="router.navigate(\'/home\')">Retry</button></div>';
  });
};

HomePage.calculateDaysRemaining = function() {
  var el = document.querySelector('[data-expiry]'); if (!el) return;
  var exp = new Date(el.dataset.expiry); var now = new Date();
  var days = Math.ceil((exp - now) / 86400000);
  var dEl = document.getElementById('daysRemaining'); var pEl = document.getElementById('expiryProgress');
  if (dEl) { if (days > 30) dEl.textContent = '30+ days remaining'; else if (days > 0) dEl.textContent = days + ' day' + (days > 1 ? 's' : '') + ' remaining'; else if (days === 0) dEl.textContent = '⚠️ Expires today!'; else dEl.textContent = '❌ Expired'; }
  if (pEl) { var pct = Math.max(0, Math.min(100, (days / 30) * 100)); pEl.style.width = pct + '%'; if (days <= 1) pEl.style.background = '#EF4444'; else if (days <= 5) pEl.style.background = '#F59E0B'; else pEl.style.background = 'rgba(255,255,255,0.8)'; }
};

HomePage.prototype.formatETB = function(amount) { var n = Number(amount || 0); if (!isFinite(n) || n > 999999999 || n < 0) return '0.00'; return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
HomePage.prototype.unmount = function() {};