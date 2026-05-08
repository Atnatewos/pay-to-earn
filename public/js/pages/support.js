// public/js/pages/support.js
class SupportPage {
    constructor(container) { this.container = container; }

    async render() {
        Navbar.render('Support', false, []);
        BottomNav.render('/support');
        
        try {
            const apiUrl = APP_CONFIG.apiUrl;
            const response = await fetch(`${apiUrl}/config/support`);
            const result = await response.json();
            const support = result.data;

            this.container.innerHTML = `
                <div class="page animate-fadeInUp">
                    <div class="card card-gradient text-center mb-4">
                        <div class="text-5xl mb-2">💬</div>
                        <h3>Customer Support</h3>
                        <p class="text-sm text-secondary">We are here to help you</p>
                    </div>
                    
                    <div class="card mb-3 text-center" onclick="window.open('${support.telegram}', '_blank')">
                        <div class="text-4xl mb-2">📱</div>
                        <h4>Telegram Support</h4>
                        <p class="text-sm text-secondary">Chat with us on Telegram</p>
                        <button class="btn btn-primary btn-block mt-3">Open Telegram</button>
                    </div>
                    
                    <div class="card text-center">
                        <div class="text-4xl mb-2">📧</div>
                        <h4>Email Support</h4>
                        <p class="text-sm text-secondary">${support.email}</p>
                        <p class="text-xs text-muted mt-2">Response time: 24-48 hours</p>
                    </div>
                </div>
            `;
        } catch (error) {
            this.container.innerHTML = '<div class="page"><div class="empty-state"><p>Failed to load</p></div></div>';
        }
    }

    unmount() {}
}