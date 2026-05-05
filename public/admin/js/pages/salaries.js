// public/admin/js/pages/salaries.js
class AdminSalaries {
    constructor(container) { this.container = container; }

    render() {
        AdminSidebar.render('/admin/salaries');
        this.container.innerHTML = `
            <div class="admin-main">
                <div class="admin-page-header">
                    <h1 class="admin-page-title">Manager Salaries</h1>
                    <p class="admin-page-subtitle">Process monthly team leader salaries</p>
                </div>

                <div class="card card-accent mb-4">
                    <div class="flex justify-between items-center">
                        <div>
                            <h4 class="mb-1">💰 Monthly Salary Processing</h4>
                            <p class="text-sm text-secondary">Process salaries for all qualified managers</p>
                        </div>
                        <button class="btn btn-primary" onclick="AdminSalaries.processAll()">
                            🔄 Process All Now
                        </button>
                    </div>
                </div>

                <div class="card mb-4">
                    <h4 class="mb-3">📋 Salary Ranks</h4>
                    <div class="admin-table">
                        <div class="admin-table-header" style="grid-template-columns:1fr 100px 100px 100px 120px;">
                            <span>Rank</span><span>Level A</span><span>Level B</span><span>Level C</span><span>Salary</span>
                        </div>
                        ${[
                            { name: 'Trainee Manager', a: 10, b: 0, c: 0, salary: 5000 },
                            { name: 'Marketing Manager', a: 20, b: 30, c: 0, salary: 10000 },
                            { name: 'General Manager', a: 0, b: 50, c: 50, salary: 25000 },
                            { name: 'Regional Manager', a: 0, b: 150, c: 250, salary: 60000 },
                            { name: 'Regional Gen. Manager', a: 0, b: 400, c: 600, salary: 150000 }
                        ].map(r => `
                            <div class="admin-table-row" style="grid-template-columns:1fr 100px 100px 100px 120px;">
                                <span class="font-medium">${r.name}</span>
                                <span>${r.a}</span><span>${r.b}</span><span>${r.c}</span>
                                <span class="font-bold text-success">${Number(r.salary).toLocaleString()} ETB</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="card">
                    <h4 class="mb-3">📊 Recent Salary Payments</h4>
                    <div id="salaryHistory"><div class="loader"><div class="spinner"></div></div></div>
                </div>
            </div>
        `;
        router.reinjectNavigation();
        setTimeout(() => this.loadHistory(), 100);
    }

    async loadHistory() {
        const container = document.getElementById('salaryHistory');
        if (!container) return;

        try {
            const token = localStorage.getItem('admin_token');
            const apiUrl = APP_CONFIG.apiUrl;
            const response = await fetch(`${apiUrl}/admin/salary/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            const salaries = result.data || [];

            if (salaries.length === 0) {
                container.innerHTML = '<p class="text-center text-secondary py-4">No salaries processed yet</p>';
                return;
            }

            container.innerHTML = salaries.map(s => `
                <div class="list-item">
                    <div class="list-item-icon">💰</div>
                    <div class="list-item-content">
                        <div class="list-item-title">${s.rank_name}</div>
                        <div class="list-item-subtitle">User: ${s.phone||'#'+s.user_id} | Team: ${s.total_team} (A:${s.team_count_a} B:${s.team_count_b} C:${s.team_count_c})</div>
                    </div>
                    <div class="list-item-trailing text-right">
                        <span class="font-bold text-success">${Number(s.monthly_salary).toLocaleString()} ETB</span>
                        <div class="text-xs text-muted">${new Date(s.paid_at).toLocaleDateString()}</div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            container.innerHTML = '<p class="text-center text-secondary">Failed to load history</p>';
        }
    }

    static async processAll() {
        const confirmed = await Dialog.confirm(
            'Process monthly salaries for ALL qualified managers? This will credit their balances.',
            'Process All Salaries',
            '💰 Process All',
            'Cancel'
        );
        if (!confirmed) return;

        const token = localStorage.getItem('admin_token');
        const apiUrl = APP_CONFIG.apiUrl;
        try {
            const response = await fetch(`${apiUrl}/salary/process-all`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            await Dialog.alert(
                result.message || `Successfully processed salaries for qualified managers.`,
                'Salaries Processed',
                'success'
            );
            router.navigate('/admin/salaries');
        } catch (error) {
            await Dialog.alert('Failed to process salaries. Please try again.', 'Error', 'error');
        }
    }

    unmount() {}
}