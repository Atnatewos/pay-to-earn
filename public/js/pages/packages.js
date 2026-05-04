class PackagesPage {
    constructor(container) {
        this.container = container;
    }

    async render() {
        Navbar.render('Packages', false, []);
        BottomNav.render('/packages');
        DesktopSidebar.render('/packages');

        this.container.innerHTML = `
            <div class="page">
                <div id="packagesContent">
                    <div class="skeleton" style="height:100px;margin-bottom:16px;"></div>
                    <div class="skeleton" style="height:150px;margin-bottom:16px;"></div>
                    <div class="skeleton" style="height:150px;margin-bottom:16px;"></div>
                </div>
            </div>
        `;

        router.reinjectNavigation();
        await this.loadPackages();
    }

    async loadPackages() {
        try {
            const [packages, activePkg] = await Promise.all([
                API.get('/packages'),
                API.get('/packages/active')
            ]);

            const pkgs = packages.data;
            const active = activePkg.data;

            document.getElementById('packagesContent').innerHTML = `
                ${active ? `
                    <div class="card card-gradient mb-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <div class="text-sm text-secondary">Active Package</div>
                                <div class="text-xl font-bold">${active.package_name}</div>
                            </div>
                            <div class="badge badge-success badge-lg">Active</div>
                        </div>
                        <div class="text-sm text-secondary mt-2">
                            Tasks: ${active.tasks_per_day}/day | Income: ${active.income_per_task} ETB/task
                        </div>
                        ${active.expires_at ? `
                            <div class="text-sm text-secondary">
                                Expires: ${new Date(active.expires_at).toLocaleDateString()}
                            </div>
                        ` : ''}
                    </div>
                ` : '<div class="card card-accent mb-4"><p class="text-center">No active package. Choose one below to start earning.</p></div>'}

                <h4 class="mb-3">Available Packages</h4>
                <div class="packages-grid">
                    ${pkgs.map(pkg => `
                        <div class="package-card card ${active?.package_name === pkg.name ? 'card-gradient' : ''}">
                            <div class="package-header">
                                <div>
                                    <div class="package-name">${pkg.name}</div>
                                    ${pkg.deposit_amount === 0 ? '<span class="badge badge-success">Free</span>' : ''}
                                </div>
                                ${pkg.deposit_amount > 0 ? `<div class="package-price">${Number(pkg.deposit_amount).toLocaleString()} ETB</div>` : ''}
                            </div>

                            <div class="package-stats">
                                <div class="package-stat-row">
                                    <span class="package-stat-label">Daily Tasks</span>
                                    <span class="package-stat-value">${pkg.tasks_per_day}</span>
                                </div>
                                <div class="package-stat-row">
                                    <span class="package-stat-label">Per Task</span>
                                    <span class="package-stat-value highlight">${pkg.income_per_task} ETB</span>
                                </div>
                                <div class="package-stat-row">
                                    <span class="package-stat-label">Daily Income</span>
                                    <span class="package-stat-value highlight">${Number(pkg.daily_income).toLocaleString()} ETB</span>
                                </div>
                                <div class="package-stat-row">
                                    <span class="package-stat-label">Monthly Income</span>
                                    <span class="package-stat-value">${Number(pkg.monthly_income).toLocaleString()} ETB</span>
                                </div>
                            </div>

                            ${pkg.deposit_amount > 0 && active?.package_name !== pkg.name ? `
                                <button class="btn btn-primary btn-block mt-4" 
                                        onclick="router.navigate('/deposit?amount=${pkg.deposit_amount}&package=${pkg.name}')">
                                    Activate ${pkg.name}
                                </button>
                            ` : ''}
                            ${active?.package_name === pkg.name ? `
                                <div class="btn btn-success btn-block mt-4" style="cursor:default; opacity:0.8;">
                                    ✓ Current Package
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            document.getElementById('packagesContent').innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <h3>Failed to load packages</h3>
                    <button class="btn btn-primary" onclick="router.navigate('/packages')">Retry</button>
                </div>
            `;
        }
    }

    unmount() {}
}
