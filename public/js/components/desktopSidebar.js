class DesktopSidebar {
    static render(currentPage) {
        const existing = document.getElementById('desktopSidebar');
        if (existing) existing.remove();
        if (window.innerWidth < 1024) return;
        
        const items = [
            { path: '/home', icon: '🏠', label: 'Home' },
            { path: '/tasks', icon: '✅', label: 'Tasks' },
            { path: '/packages', icon: '💎', label: 'Packages' },
            { path: '/team', icon: '👥', label: 'Team' },
            { path: '/earnings', icon: '💰', label: 'Earnings' },
            { path: '/leaderboard', icon: '🏆', label: 'Leaderboard' },
            { path: '/profile', icon: '👤', label: 'Profile' },
        ];
        
        const sidebar = document.createElement('div');
        sidebar.id = 'desktopSidebar';
        sidebar.className = 'desktop-sidebar';
        sidebar.innerHTML = `
            <div class="desktop-sidebar-logo">${APP_CONFIG.name}</div>
            <nav class="desktop-sidebar-nav">
                ${items.map(item => `
                    <div class="desktop-nav-item ${currentPage === item.path ? 'active' : ''}" 
                         onclick="router.navigate('${item.path}')">
                        <span class="desktop-nav-icon">${item.icon}</span>
                        ${item.label}
                    </div>
                `).join('')}
            </nav>
            <div style="margin-top:auto;">
                <div class="desktop-nav-item" onclick="store.logout(); router.navigate('/login')">
                    <span class="desktop-nav-icon">🚪</span>
                    Logout
                </div>
            </div>
        `;
        
        const app = document.getElementById('app');
        const appContent = document.getElementById('appContent');
        app.insertBefore(sidebar, appContent);
    }
}