// public/js/components/navbar.js

/**
 * Navbar Component
 * Displays platform logo and name from APP_CONFIG
 * Logo priority: image URL > emoji > text only
 * Logo acts as a link to home page
 */
class Navbar {
    static render(title, showBack = false, actions = []) {
        const existing = document.querySelector('.navbar');
        if (existing) existing.remove();

        const navbar = document.createElement('nav');
        navbar.className = 'navbar';

        // Build logo HTML based on config
        let logoHtml = '';
        const logo = APP_CONFIG.logo || {};
        
        if (logo.imageUrl && logo.imageUrl.trim() !== '') {
            // Image logo - linked to home
            logoHtml = `
                <a onclick="router.navigate('/home')" style="cursor:pointer;display:flex;align-items:center;">
                    <img src="${logo.imageUrl}" alt="${APP_CONFIG.name}" 
                         style="height:36px;width:auto;object-fit:contain;"
                         onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
                    <span style="display:none;font-size:24px;">${logo.emoji || '💰'}</span>
                </a>
            `;
        } else if (logo.emoji) {
            // Emoji logo - linked to home
            logoHtml = `
                <a onclick="router.navigate('/home')" style="cursor:pointer;text-decoration:none;font-size:28px;">
                    ${logo.emoji}
                </a>
            `;
        }

        navbar.innerHTML = `
            <div class="flex items-center gap-3">
                ${showBack ? `<button class="navbar-btn" onclick="history.back()">←</button>` : ''}
                ${logoHtml}
                <a onclick="router.navigate('/home')" class="navbar-brand" style="cursor:pointer;">
                    ${APP_CONFIG.name}
                </a>
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