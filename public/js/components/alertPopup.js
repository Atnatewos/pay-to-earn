// public/js/components/alertPopup.js

/**
 * Alert/Broadcast Popup Component
 * Shows sticky alert banners on home page
 * Long messages truncated with "More" link
 * Click opens scrollable popup modal for full message
 * Works on mobile and desktop
 */
var AlertPopup = {
  checkAlerts: function() {
    var token = sessionStorage.getItem('token');
    if (!token) return;
    var apiUrl = APP_CONFIG.apiUrl;
    fetch(apiUrl + '/alerts/sticky', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function(r) { return r.json(); })
      .then(function(result) { if (result.success && result.data && result.data.length > 0) AlertPopup.showStickyAlerts(result.data); })
      .catch(function() {});
  },

  showStickyAlerts: function(alerts) {
    var container = document.getElementById('stickyAlerts');
    if (!container) return;
    container.innerHTML = '';

    alerts.forEach(function(alert) {
      var bg = alert.color === 'color-danger' ? 'var(--color-danger-bg)' : alert.color === 'color-warning' ? 'var(--color-warning-bg)' : 'var(--color-info-bg)';
      var bd = alert.color === 'color-danger' ? 'var(--color-danger)' : alert.color === 'color-warning' ? 'var(--color-warning)' : 'var(--color-info)';
      var short = alert.message;
      var truncated = false;
      if (short.length > 100) { short = short.substring(0, 100) + '...'; truncated = true; }

      var el = document.createElement('div');
      el.style.cssText = 'background:' + bg + ';border-left:4px solid ' + bd + ';padding:10px 14px;display:flex;align-items:center;gap:10px;margin-bottom:6px;border-radius:var(--radius-lg);font-size:var(--font-sm);cursor:pointer;';
      el.innerHTML = '<span style="font-size:22px;flex-shrink:0;">' + alert.icon + '</span>' +
        '<div style="flex:1;min-width:0;"><strong>' + alert.title + '</strong>' +
        '<div style="color:var(--color-text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + short + '</div></div>' +
        (truncated ? '<span style="color:var(--color-primary);font-size:11px;flex-shrink:0;">More</span>' : '') +
        '<button onclick="event.stopPropagation();this.parentElement.remove();fetch(\'' + APP_CONFIG.apiUrl + '/alerts/' + alert.id + '/dismiss\',{method:\'POST\',headers:{\'Authorization\':\'Bearer ' + sessionStorage.getItem('token') + '\'}});" style="font-size:18px;cursor:pointer;opacity:0.5;flex-shrink:0;">×</button>';

      el.addEventListener('click', function(e) { if (e.target.tagName === 'BUTTON') return; AlertPopup.showFullAlert(alert); });
      container.appendChild(el);
    });
  },

  showFullAlert: function(alert) {
    var bg = alert.color === 'color-danger' ? 'var(--color-danger-bg)' : alert.color === 'color-warning' ? 'var(--color-warning-bg)' : 'var(--color-info-bg)';
    var bd = alert.color === 'color-danger' ? 'var(--color-danger)' : alert.color === 'color-warning' ? 'var(--color-warning)' : 'var(--color-info)';
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '10000';
    overlay.innerHTML = '<div class="modal animate-scaleIn" style="max-width:500px;width:90%;max-height:80vh;overflow-y:auto;border-radius:var(--radius-2xl);">' +
      '<div style="background:' + bg + ';padding:32px 24px 20px;text-align:center;border-radius:var(--radius-2xl) var(--radius-2xl) 0 0;border-bottom:3px solid ' + bd + ';">' +
      '<span style="font-size:48px;">' + alert.icon + '</span><h3 style="margin-top:12px;">' + alert.title + '</h3></div>' +
      '<div style="padding:24px;max-height:40vh;overflow-y:auto;line-height:1.7;color:var(--color-text-secondary);white-space:pre-wrap;word-wrap:break-word;">' + alert.message + '</div>' +
      '<div style="padding:0 24px 24px;"><button class="btn btn-primary btn-block" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div></div>';
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }
};

document.addEventListener('DOMContentLoaded', function() { setTimeout(function() { AlertPopup.checkAlerts(); }, 2000); });