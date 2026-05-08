// public/js/app.js
document.addEventListener('DOMContentLoaded', () => {
    // ============ AUTH ROUTES ============
    router.addRoute('/', LoginPage);
    router.addRoute('/login', LoginPage);
    router.addRoute('/register', RegisterPage);

    // ============ MAIN PAGES ============
    router.addRoute('/home', HomePage, {
        breadcrumbs: []
    });

    router.addRoute('/tasks', TasksPage, {
        breadcrumbs: [
            { label: 'Home', path: '/home' },
            { label: 'Tasks' }
        ]
    });

    router.addRoute('/packages', PackagesPage, {
        breadcrumbs: [
            { label: 'Home', path: '/home' },
            { label: 'Packages' }
        ]
    });

    router.addRoute('/team', TeamPage, {
        breadcrumbs: [
            { label: 'Home', path: '/home' },
            { label: 'My Team' }
        ]
    });

    router.addRoute('/earnings', EarningsPage, {
        breadcrumbs: [
            { label: 'Home', path: '/home' },
            { label: 'Earnings' }
        ]
    });

    router.addRoute('/leaderboard', LeaderboardPage, {
        breadcrumbs: [
            { label: 'Home', path: '/home' },
            { label: 'Leaderboard' }
        ]
    });

    router.addRoute('/profile', ProfilePage, {
        breadcrumbs: [
            { label: 'Home', path: '/home' },
            { label: 'Profile' }
        ]
    });

    // ============ DEEP PAGES ============
    router.addRoute('/deposit', DepositPage, {
        breadcrumbs: [
            { label: 'Home', path: '/home' },
            { label: 'Packages', path: '/packages' },
            { label: 'Deposit' }
        ]
    });

    router.addRoute('/withdraw', WithdrawPage, {
        breadcrumbs: [
            { label: 'Home', path: '/home' },
            { label: 'Earnings', path: '/earnings' },
            { label: 'Withdraw' }
        ]
    });

    router.addRoute('/giftcode', GiftCodePage, {
        breadcrumbs: [
            { label: 'Home', path: '/home' },
            { label: 'Profile', path: '/profile' },
            { label: 'Gift Code' }
        ]
    });

            // support route
        router.addRoute('/support', SupportPage, {
        breadcrumbs: [{ label: 'Home', path: '/home' }, { label: 'Support' }]
    });

    // FUTURE: Add more user routes here
    // router.addRoute('/support', SupportPage, {
    //     breadcrumbs: [
    //         { label: 'Home', path: '/home' },
    //         { label: 'Support' }
    //     ]
    // });
    // router.addRoute('/settings', SettingsPage, {
    //     breadcrumbs: [
    //         { label: 'Home', path: '/home' },
    //         { label: 'Profile', path: '/profile' },
    //         { label: 'Settings' }
    //     ]
    // });
    // router.addRoute('/notifications', NotificationsPage, {
    //     breadcrumbs: [
    //         { label: 'Home', path: '/home' },
    //         { label: 'Notifications' }
    //     ]
    // });
});