// public/js/components/alertPopup.js

/**
 * Alert/Broadcast Popup Component
 * Shows sticky alert banners on home page
 * Long messages are truncated with "More" link
 * Clicking opens full message in a scrollable popup modal
 * All styling through CSS classes - zero inline styles
 */
var AlertPopup = {

  /**
   * Check for undismissed alerts from the server
   * Called on home page load
   */
  checkAlerts: function() {
    var token = Session.getUserToken();
    if (!token) {
      return;
    }

    var apiUrl = APP_CONFIG.apiUrl;

    fetch(apiUrl + '/alerts/sticky', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(function(response) {
        return response.json();
      })
      .then(function(result) {
        if (result.success && result.data && result.data.length > 0) {
          AlertPopup.showStickyAlerts(result.data);
        }
      })
      .catch(function(error) {
        // Silently fail - alerts are non-critical
        console.warn('AlertPopup: Failed to fetch alerts:', error.message);
      });
  },

  /**
   * Display sticky alert banners at the top of the page
   * Each alert is clickable to show full message
   * @param {Array} alerts - Array of alert objects from the server
   */
  showStickyAlerts: function(alerts) {
    var container = document.getElementById('stickyAlerts');
    if (!container) {
      return;
    }

    container.innerHTML = '';

    alerts.forEach(function(alert) {
      // Determine CSS classes based on alert type
      var bgClass = 'bg-info-light';
      var borderClass = 'border-left-info';

      if (alert.color === 'color-danger') {
        bgClass = 'bg-danger-light';
        borderClass = 'border-left-danger';
      } else if (alert.color === 'color-warning') {
        bgClass = 'bg-warning-light';
        borderClass = 'border-left-warning';
      }

      // Truncate long messages
      var displayMessage = alert.message;
      var isTruncated = false;

      if (displayMessage.length > 100) {
        displayMessage = displayMessage.substring(0, 100) + '...';
        isTruncated = true;
      }

      // Build alert element using CSS classes
      var alertElement = document.createElement('div');
      alertElement.className = 'alert-bar ' + bgClass + ' ' + borderClass;

      var moreLink = '';
      if (isTruncated) {
        moreLink = '<span class="alert-bar-more">More</span>';
      }

      alertElement.innerHTML =
        '<span class="alert-bar-icon">' + alert.icon + '</span>' +
        '<div class="alert-bar-content">' +
          '<div class="alert-bar-title">' + alert.title + '</div>' +
          '<div class="alert-bar-message">' + displayMessage + '</div>' +
        '</div>' +
        moreLink +
        '<button class="alert-bar-dismiss">×</button>';

      // Dismiss button handler
      var dismissButton = alertElement.querySelector('.alert-bar-dismiss');
      dismissButton.addEventListener('click', function(event) {
        event.stopPropagation();
        alertElement.remove();

        // Send dismiss request to server
        var token = Session.getUserToken();
        if (token) {
          fetch(APP_CONFIG.apiUrl + '/alerts/' + alert.id + '/dismiss', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token }
          }).catch(function() {
            // Silently fail
          });
        }
      });

      // Click to open full alert in modal
      alertElement.addEventListener('click', function(event) {
        if (event.target.tagName === 'BUTTON') {
          return;
        }
        AlertPopup.showFullAlert(alert);
      });

      container.appendChild(alertElement);
    });
  },

  /**
   * Show the full alert message in a scrollable popup modal
   * Works on both mobile and desktop
   * @param {Object} alert - Alert object with full message
   */
  showFullAlert: function(alert) {
    // Determine colors
    var headerBg = 'var(--color-info-bg)';
    var borderColor = 'var(--color-info)';

    if (alert.color === 'color-danger') {
      headerBg = 'var(--color-danger-bg)';
      borderColor = 'var(--color-danger)';
    } else if (alert.color === 'color-warning') {
      headerBg = 'var(--color-warning-bg)';
      borderColor = 'var(--color-warning)';
    }

    // Create modal overlay
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '10000';

    overlay.innerHTML =
      '<div class="modal animate-scaleIn" style="max-width:500px; width:90%; max-height:80vh; overflow-y:auto; border-radius:var(--radius-2xl);">' +
        '<div class="alert-modal-header border-bottom-3" style="background:' + headerBg + '; border-color:' + borderColor + ';">' +
          '<span class="alert-modal-icon">' + alert.icon + '</span>' +
          '<h3 class="alert-modal-title">' + alert.title + '</h3>' +
        '</div>' +
        '<div class="alert-modal-body">' + alert.message + '</div>' +
        '<div class="alert-modal-footer">' +
          '<button class="btn btn-primary btn-block">Close</button>' +
        '</div>' +
      '</div>';

    // Close button handler
    var closeButton = overlay.querySelector('button');
    closeButton.addEventListener('click', function() {
      overlay.remove();
    });

    // Click outside to close
    overlay.addEventListener('click', function(event) {
      if (event.target === overlay) {
        overlay.remove();
      }
    });

    document.body.appendChild(overlay);
  }
};

// Check for alerts when the page loads
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    AlertPopup.checkAlerts();
  }, 2000);
});