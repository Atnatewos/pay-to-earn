// public/js/components/navbar.js
class Navbar {
    static render(title, showBack = false, actions = []) {
        const existing = document.querySelector('.navbar');
        if (existing) existing.remove();

        const navbar = document.createElement('nav');
        navbar.className = 'navbar';

        navbar.innerHTML = `
            <div class="flex items-center gap-3">
                ${showBack ? `<button class="navbar-btn" onclick="history.back()">←</button>` : ''}
                <span class="navbar-brand">${APP_CONFIG.name}</span>
            </div>
            <div class="navbar-actions">
                ${actions.map(a => `<button class="navbar-btn" onclick="${a.onclick}" title="${a.title}">${a.icon}</button>`).join('')}
            </div>
        `;

        const app = document.getElementById('app');
        const appContent = document.getElementById('appContent');
        app.insertBefore(navbar, appContent);
    }
}