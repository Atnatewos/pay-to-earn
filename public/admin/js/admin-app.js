// public/admin/js/admin-app.js
document.addEventListener('DOMContentLoaded', () => {
    router.addRoute('/admin/login', AdminLogin);

    router.addRoute('/admin/dashboard', AdminDashboard, {
        breadcrumbs: [{ label: 'Dashboard', path: '/admin/dashboard' }]
    });

    router.addRoute('/admin/deposits', AdminDeposits, {
        breadcrumbs: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Deposits' }
        ],
        actions: [
            { icon: '🔄', label: 'Refresh', variant: 'outline', onclick: 'router.navigate("/admin/deposits")' }
        ]
    });

    router.addRoute('/admin/withdrawals', AdminWithdrawals, {
        breadcrumbs: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Withdrawals' }
        ]
    });

    router.addRoute('/admin/users', AdminUsers, {
        breadcrumbs: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Users' }
        ]
    });

    router.addRoute('/admin/admins', AdminAdmins, {
    breadcrumbs: [
        { label: 'Dashboard', path: '/admin/dashboard' },
        { label: 'Admins' }
    ]
    });

    router.addRoute('/admin/giftcodes', AdminGiftCodes, {
        breadcrumbs: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Gift Codes' }
        ]
    });

    router.addRoute('/admin/features', AdminFeatures, {
        breadcrumbs: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Features' }
        ]
    });

    router.addRoute('/admin/broadcast', AdminBroadcast, {
        breadcrumbs: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Broadcast' }
        ]
    });

    router.addRoute('/admin/logs', AdminLogs, {
        breadcrumbs: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Activity Logs' }
        ]
    });

        router.addRoute('/admin/salaries', AdminSalaries, {
        breadcrumbs: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Salaries' }
        ]
    });

        router.addRoute('/admin/salaries', AdminSalaries, {
        breadcrumbs: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Salaries' }
        ]
    });

        router.addRoute('/admin/alerts', AdminAlerts, {
        breadcrumbs: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Alerts' }
        ]
    });
    

});