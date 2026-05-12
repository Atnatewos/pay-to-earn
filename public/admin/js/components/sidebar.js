class AdminSidebar {
    static render(currentPath) {
        const existing = document.getElementById('adminSidebar');
        if (existing) existing.remove();

        const adminData = JSON.parse(localStorage.getItem('admin_data') || '{}');
        
        const links = [
            { path: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
            { path: '/admin/deposits', icon: '💳', label: 'Deposits' },
            { path: '/admin/withdrawals', icon: '💸', label: 'Withdrawals' },
            { path: '/admin/users', icon: '👥', label: 'Users' },
            { path: '/admin/admins', icon: '👥', label: 'Admins' },
            { path: '/admin/giftcodes', icon: '🎁', label: 'Gift Codes' },
            { path: '/admin/salaries', icon: '💼', label: 'Salaries' },
            { path: '/admin/features', icon: '⚙️', label: 'Features' },
            { path: '/admin/broadcast', icon: '📢', label: 'Broadcast' },
            { path: '/admin/logs', icon: '📝', label: 'Logs' },
            { path: '/admin/alerts', icon: '🔔', label: 'Alerts' },
            
        ];

        const sidebar = document.createElement('aside');
        sidebar.id = 'adminSidebar';
        sidebar.className = 'admin-sidebar';

        sidebar.innerHTML = `
            <div class="sidebar-header">
                <div class="sidebar-logo">${APP_CONFIG.adminName}</div>
                <div class="sidebar-subtitle">${APP_CONFIG.adminFullName}</div>
            </div>
            <nav class="sidebar-nav">
                ${links.map(link => `
                    <a class="sidebar-link ${currentPath === link.path ? 'active' : ''}" 
                       onclick="router.navigate('${link.path}')">
                        <span class="link-icon">${link.icon}</span>
                        ${link.label}
                    </a>
                `).join('')}
            </nav>
            <div class="sidebar-footer">
                <div class="sidebar-user">
                    <div class="sidebar-avatar">🛡️</div>
                    <div class="sidebar-user-info">
                        <div class="sidebar-user-name">${adminData.username || 'Admin'}</div>
                        <div class="sidebar-user-role">${adminData.role || 'Staff'}</div>
                    </div>
                </div>
                <button class="btn btn-danger btn-sm btn-block" onclick="AdminAPI.logout()">
                    🚪 Logout
                </button>
            </div>
        `;

        document.getElementById('adminApp').insertBefore(sidebar, document.getElementById('adminContent'));
    }
}