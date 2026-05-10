// public/js/pages/support.js

/**
 * Support Page
 * Displays support contact information from server config
 * Shows Telegram account, channel, group, and email
 */
class SupportPage {
    constructor(container) { this.container = container; }

    async render() {
        Navbar.render('Support', false, []);
        BottomNav.render('/support');
        
        try {
            const apiUrl = APP_CONFIG.apiUrl;
            const response = await fetch(`${apiUrl}/config/support`);
            const result = await response.json();
            const support = result.data || APP_CONFIG.support || {};

            this.container.innerHTML = `
                <div class="page animate-fadeInUp">
                    <div class="card card-gradient text-center mb-4">
                        <div class="text-5xl mb-2">💬</div>
                        <h3>Customer Support</h3>
                        <p class="text-sm text-secondary">We are here to help you</p>
                    </div>
                    
                    ${support.telegram ? `
                        <div class="card mb-3 text-center" onclick="window.open('${support.telegram}', '_blank')" style="cursor:pointer;">
                            <div class="text-4xl mb-2">📱</div>
                            <h4>Telegram Support</h4>
                            <p class="text-sm text-secondary">Chat with us directly on Telegram</p>
                            <button class="btn btn-primary btn-block mt-3">Open Telegram Chat</button>
                        </div>
                    ` : ''}
                    
                    ${support.telegramChannel ? `
                        <div class="card mb-3 text-center" onclick="window.open('${support.telegramChannel}', '_blank')" style="cursor:pointer;">
                            <div class="text-4xl mb-2">📢</div>
                            <h4>Telegram Channel</h4>
                            <p class="text-sm text-secondary">Join our channel for updates & announcements</p>
                            <button class="btn btn-outline btn-block mt-3">Join Channel</button>
                        </div>
                    ` : ''}
                    
                    ${support.telegramGroup ? `
                        <div class="card mb-3 text-center" onclick="window.open('${support.telegramGroup}', '_blank')" style="cursor:pointer;">
                            <div class="text-4xl mb-2">👥</div>
                            <h4>Telegram Group</h4>
                            <p class="text-sm text-secondary">Join our community group</p>
                            <button class="btn btn-outline btn-block mt-3">Join Group</button>
                        </div>
                    ` : ''}
                    
                    ${support.email ? `
                        <div class="card text-center">
                            <div class="text-4xl mb-2">📧</div>
                            <h4>Email Support</h4>
                            <p class="text-sm text-secondary">${support.email}</p>
                            <p class="text-xs text-muted mt-2">Response time: 24-48 hours</p>
                        </div>
                    ` : ''}

                    ${!support.telegram && !support.telegramChannel && !support.telegramGroup && !support.email ? `
                        <div class="empty-state">
                            <div class="empty-state-icon">📭</div>
                            <h3>No support contacts configured</h3>
                            <p class="text-secondary">Support channels will appear here once configured.</p>
                        </div>
                    ` : ''}
                </div>
            `;
        } catch (error) {
            this.container.innerHTML = '<div class="page"><div class="empty-state"><p>Failed to load support info</p></div></div>';
        }
    }

    unmount() {}
}