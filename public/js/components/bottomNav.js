// public/js/components/bottomNav.js
class BottomNav {
    static render(currentPage) {
        const existing = document.querySelector('.bottom-nav');
        if (existing) existing.remove();

        const items = [
            { path: '/home', icon: '🏠', label: 'Home' },
            { path: '/packages', icon: '💎', label: 'Packages' },
            { path: '/tasks', icon: '✅', label: 'Tasks' },
            { path: '/earnings', icon: '💰', label: 'Earnings' },
            { path: '/profile', icon: '👤', label: 'Profile' }
        ];

        const nav = document.createElement('nav');
        nav.className = 'bottom-nav';

        nav.innerHTML = items.map(item => `
            <div class="bottom-nav-item ${currentPage === item.path ? 'active' : ''}" 
                 onclick="router.navigate('${item.path}')">
                <span class="nav-icon">${item.icon}</span>
                <span>${item.label}</span>
            </div>
        `).join('');

        document.getElementById('app').appendChild(nav);
    }
}