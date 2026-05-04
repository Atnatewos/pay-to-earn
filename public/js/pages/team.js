// public/js/pages/team.js
class TeamPage {
    constructor(container) { this.container = container; this.currentLevel = 'A'; this.currentTab = 'team'; }

    async render() {
        Navbar.render('My Team', false, [{ icon: '🔗', title: 'Referral Link', onclick: 'TeamPage.showReferralLink()' }]);
        BottomNav.render('/team');
        DesktopSidebar.render('/team');
        this.container.innerHTML = `<div class="page"><div id="teamContent"><div class="loader"><div class="spinner"></div></div></div></div>`;
        router.reinjectNavigation();
        await this.loadTeam();
    }

    async loadTeam() {
        try {
            const [overview, referral, eligibility] = await Promise.all([API.get('/team/overview'), API.get('/team/referral-link'), API.get('/salary/eligibility')]);
            const t = overview.data; const ref = referral.data; const elig = eligibility.data;
            document.getElementById('teamContent').innerHTML = `<div class="filter-tabs mb-4"><button class="filter-tab ${this.currentTab==='team'?'active':''}" onclick="TeamPage.switchTab('team')">👥 Team</button><button class="filter-tab ${this.currentTab==='salary'?'active':''}" onclick="TeamPage.switchTab('salary')">💼 Manager</button></div><div id="tabContent"></div>`;
            this.renderTabContent(t, ref, elig);
        } catch (error) { document.getElementById('teamContent').innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Failed to load</h3><button class="btn btn-primary" onclick="router.navigate('/team')">Retry</button></div>`; }
    }

    renderTabContent(t, ref, elig) {
        const content = document.getElementById('tabContent');
        if (this.currentTab === 'team') {
            content.innerHTML = `
                <div class="card card-primary mb-4 text-center"><div class="text-4xl mb-2">👥</div><div class="text-4xl font-extrabold" style="background:var(--gradient-primary);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${t.totalTeam}</div><div class="text-sm text-secondary">Total Team Members</div><div class="badge badge-success mt-2">${t.activeMembers} Active This Week</div></div>
                <div class="grid grid-cols-3 gap-3 mb-4">
                    <div class="card text-center cursor-pointer" style="border:${this.currentLevel==='A'?'2px solid var(--color-primary)':''}" onclick="TeamPage.switchLevel('A')"><div class="text-2xl font-bold">${t.levelA.count}</div><div class="text-xs text-secondary">Level A</div><div class="text-xs text-muted">Direct (10%)</div></div>
                    <div class="card text-center cursor-pointer" style="border:${this.currentLevel==='B'?'2px solid var(--color-primary)':''}" onclick="TeamPage.switchLevel('B')"><div class="text-2xl font-bold">${t.levelB.count}</div><div class="text-xs text-secondary">Level B</div><div class="text-xs text-muted">Indirect (3%)</div></div>
                    <div class="card text-center cursor-pointer" style="border:${this.currentLevel==='C'?'2px solid var(--color-primary)':''}" onclick="TeamPage.switchLevel('C')"><div class="text-2xl font-bold">${t.levelC.count}</div><div class="text-xs text-secondary">Level C</div><div class="text-xs text-muted">Extended (1%)</div></div>
                </div>
                <div class="card mb-4"><h4 class="mb-3">💰 Team Recharge</h4>
                    <div class="flex justify-between py-2"><span class="text-secondary">Level A</span><span class="font-semibold">${this.formatETB(t.recharge.levelARecharge)} ETB</span></div>
                    <div class="flex justify-between py-2"><span class="text-secondary">Level B</span><span class="font-semibold">${this.formatETB(t.recharge.levelBRecharge)} ETB</span></div>
                    <div class="flex justify-between py-2"><span class="text-secondary">Level C</span><span class="font-semibold">${this.formatETB(t.recharge.levelCRecharge)} ETB</span></div>
                    <hr class="divider"><div class="flex justify-between py-2"><span class="font-bold">Total</span><span class="font-extrabold text-success text-lg">${this.formatETB(t.recharge.totalRecharge)} ETB</span></div>
                </div>
                <div class="card mb-4"><h4 class="mb-3">👤 Level ${this.currentLevel} Members (${this.getLevelCount(t, this.currentLevel)})</h4><div id="membersList">${this.renderMembers(this.getLevelMembers(t, this.currentLevel))}</div></div>
                <div class="card"><h4 class="mb-3">🔗 Your Referral</h4><div class="referral-link-box"><input type="text" value="${ref.link}" readonly onclick="this.select()" class="text-sm"><button class="btn btn-primary btn-sm" onclick="TeamPage.copyLink('${ref.link}')">📋 Copy</button></div><div class="text-xs text-secondary mt-2 text-center">Code: <strong>${ref.code}</strong> | Earn 10% • 3% • 1%</div></div>
            `;
        } else {
            content.innerHTML = `
                <div class="card card-gradient mb-4 text-center"><div class="text-4xl mb-2">💼</div><h3 class="mb-2">Manager Status</h3>${elig.highestRank?`<div class="badge badge-success badge-lg">${elig.highestRank.name}</div><div class="text-2xl font-bold text-success mt-2">${this.formatETB(elig.highestRank.salary)} ETB/month</div>`:'<p class="text-secondary">Build your team to qualify for manager salary</p>'}</div>
                <div class="card mb-4"><h4 class="mb-3">📊 Your Progress</h4><div class="flex justify-between py-2"><span>Level A Members</span><span class="font-bold">${elig.currentCounts.a}</span></div><div class="flex justify-between py-2"><span>Level B Members</span><span class="font-bold">${elig.currentCounts.b}</span></div><div class="flex justify-between py-2"><span>Level C Members</span><span class="font-bold">${elig.currentCounts.c}</span></div><div class="flex justify-between py-2"><span>Total Team</span><span class="font-bold">${elig.currentCounts.total}</span></div></div>
                <div class="card"><h4 class="mb-3">🏆 Manager Ranks</h4>${[{name:'Trainee Manager',a:10,b:0,c:0,salary:5000},{name:'Marketing Manager',a:20,b:30,c:0,salary:10000},{name:'General Manager',a:0,b:50,c:50,salary:25000},{name:'Regional Manager',a:0,b:150,c:250,salary:60000},{name:'Regional Gen. Manager',a:0,b:400,c:600,salary:150000}].map(r=>`<div class="list-item ${elig.highestRank?.name===r.name?'card-primary':''}"><div class="list-item-icon">${elig.highestRank?.name===r.name?'✅':'🔒'}</div><div class="list-item-content"><div class="list-item-title">${r.name}</div><div class="list-item-subtitle">Requires A:${r.a} B:${r.b} C:${r.c} | ${this.formatETB(r.salary)} ETB/month</div></div></div>`).join('')}</div>
            `;
        }
    }

    renderMembers(members) {
        if (members.length === 0) return '<p class="text-center text-secondary py-4">No members at this level yet. Keep sharing your referral link!</p>';
        return members.map((m, i) => `
            <div class="list-item animate-fadeInUp" style="animation-delay:${i*0.03}s">
                <div class="list-item-icon" style="background:${m.active_package?'var(--color-success-bg)':'var(--color-surface-hover)'}">👤</div>
                <div class="list-item-content"><div class="list-item-title">${m.full_name || m.phone}</div><div class="list-item-subtitle">${m.full_name?m.phone+' • ':''}Joined ${new Date(m.created_at).toLocaleDateString()}</div></div>
                <div class="list-item-trailing text-right">${m.active_package?`<span class="badge badge-success">${m.active_package}</span>`:'<span class="badge badge-warning">Inactive</span>'}<div class="text-xs text-secondary mt-1">${this.formatETB(m.total_recharge)} ETB</div></div>
            </div>
        `).join('');
    }

    getLevelCount(data, level) { return data[`level${level}`]?.count || 0; }
    getLevelMembers(data, level) { return data[`level${level}`]?.members || []; }
    static switchLevel(level) { const i = router.currentPage; i.currentLevel = level; i.render(); }
    static switchTab(tab) { const i = router.currentPage; i.currentTab = tab; i.render(); }

    static showReferralLink() {
        API.get('/team/referral-link').then(data => {
            const ref = data.data;
            Modal.show(`<div class="modal-header"><h3 class="modal-title">🔗 Your Referral Link</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button></div><div class="text-center mb-4"><p class="text-sm text-secondary mb-3">Share this link to earn commissions when people join!</p><div class="referral-link-box mb-3"><input type="text" value="${ref.link}" readonly onclick="this.select()"><button class="btn btn-primary btn-sm" onclick="TeamPage.copyLink('${ref.link}')">📋 Copy</button></div><p class="text-xs text-secondary">Or share your code: <strong>${ref.code}</strong></p></div><div class="card p-3" style="background:var(--color-primary-bg)"><h5 class="mb-2">💰 Commission Rates</h5><div class="text-sm">Level 1 - Direct: <strong>10%</strong></div><div class="text-sm">Level 2 - Indirect: <strong>3%</strong></div><div class="text-sm">Level 3 - Extended: <strong>1%</strong></div></div>`);
        });
    }

    static copyLink(link) { navigator.clipboard.writeText(link).then(() => Toast.show('Link copied!')).catch(() => Toast.show('Failed to copy', 'error')); }
    formatETB(amount) { return Number(amount||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }
    unmount() {}
}