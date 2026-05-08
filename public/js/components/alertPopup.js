// public/js/components/alertPopup.js
class AlertPopup {
    static async checkAlerts() {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const apiUrl = APP_CONFIG.apiUrl;
            const response = await fetch(`${apiUrl}/alerts/unread`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            
            if (result.success && result.data && result.data.length > 0) {
                AlertPopup.showAlerts(result.data);
            }
        } catch (error) {
            // Silently fail - alerts are non-critical
        }
    }

    static showAlerts(alerts) {
        let currentIndex = 0;

        const showNext = () => {
            if (currentIndex >= alerts.length) {
                document.querySelector('.alert-overlay')?.remove();
                return;
            }

            const alert = alerts[currentIndex];
            const overlay = document.querySelector('.alert-overlay') || document.createElement('div');
            
            if (!document.querySelector('.alert-overlay')) {
                overlay.className = 'alert-overlay';
                document.body.appendChild(overlay);
            }

            const colorMap = {
                'gradient-primary': 'var(--gradient-primary)',
                'gradient-accent': 'var(--gradient-accent)',
                'color-danger': '#FF7675',
                'color-warning': '#FDCB6E',
                'color-info': '#74B9FF',
                'color-success': '#00B894'
            };

            overlay.innerHTML = `
                <div class="alert-modal animate-scaleIn">
                    <div class="alert-modal-header" style="background: ${colorMap[alert.color] || 'var(--gradient-primary)'}; color: ${alert.color.includes('color') ? '#2D3436' : 'white'};">
                        <div class="alert-modal-icon">${alert.icon}</div>
                    </div>
                    <div class="alert-modal-body">
                        <h3 class="alert-modal-title">${alert.title}</h3>
                        <p class="alert-modal-message">${alert.message}</p>
                    </div>
                    <div class="alert-modal-footer">
                        ${alerts.length > 1 ? `
                            <span class="text-xs text-secondary">${currentIndex + 1} of ${alerts.length}</span>
                        ` : ''}
                        <button class="btn ${alert.color.includes('color') ? 'btn-' + alert.type.replace('danger','danger').replace('warning','warning') : 'btn-primary'} btn-block" 
                                onclick="AlertPopup.dismissAlert(${alert.id}, ${currentIndex}, ${alerts.length})">
                            ${alert.type === 'danger' ? 'I Understand' : alert.type === 'warning' ? 'Acknowledge' : 'OK'}
                        </button>
                    </div>
                </div>
            `;

            // Dismiss on overlay click (optional)
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    AlertPopup.dismissAlert(alert.id, currentIndex, alerts.length);
                }
            };
        };

        showNext();
    }

    static async dismissAlert(alertId, currentIndex, totalAlerts) {
        const token = localStorage.getItem('token');
        const apiUrl = APP_CONFIG.apiUrl;
        
        try {
            await fetch(`${apiUrl}/alerts/${alertId}/dismiss`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (error) {
            // Continue even if dismiss fails
        }

        currentIndex++;
        if (currentIndex >= totalAlerts) {
            document.querySelector('.alert-overlay')?.remove();
        } else {
            // Refresh alerts and show next
            AlertPopup.checkAlerts();
        }
    }
}

// Check for alerts when pages load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => AlertPopup.checkAlerts(), 2000);
});