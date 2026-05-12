// public/js/pages/team.js

/**
 * Team Page
 * Shows referral network with QR code, copy buttons, and manager status
 * All values from config - no hardcoded data
 */
class TeamPage {
  constructor(container) {
    this.container = container;
    this.currentLevel = 'A';
    this.currentTab = 'team';
  }

  async render() {
    Navbar.render('My Team', false, [
      { icon: '🔗', title: 'Referral Link', onclick: 'TeamPage.showReferralLink()' }
    ]);
    BottomNav.render('/team');
    DesktopSidebar.render('/team');
    this.container.innerHTML = '<div class="page"><div id="teamContent"></div></div>';
    router.reinjectNavigation();
    await this.loadTeam();
  }

  async loadTeam() {
    Loader.auto('teamContent');

    try {
      const [overview, referral, eligibility] = await Promise.all([
        API.get('/team/overview'),
        API.get('/team/referral-link'),
        API.get('/salary/eligibility')
      ]);

      const t = overview.data;
      const ref = referral.data;
      const elig = eligibility.data;

      document.getElementById('teamContent').innerHTML = `
        <div class="filter-tabs mb-4">
          <button class="filter-tab ${this.currentTab === 'team' ? 'active' : ''}" onclick="TeamPage.switchTab('team')">👥 Team</button>
          <button class="filter-tab ${this.currentTab === 'salary' ? 'active' : ''}" onclick="TeamPage.switchTab('salary')">💼 Manager</button>
        </div>
        <div id="tabContent"></div>
      `;

      this.renderTabContent(t, ref, elig);
    } catch (error) {
      document.getElementById('teamContent').innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h3>Failed to load</h3>
          <button class="btn btn-primary" onclick="router.navigate('/team')">Retry</button>
        </div>
      `;
    }
  }

  renderTabContent(t, ref, elig) {
    const content = document.getElementById('tabContent');

    if (this.currentTab === 'team') {
      content.innerHTML = `
        <div class="card card-primary mb-4 text-center">
          <div class="text-4xl mb-2">👥</div>
          <div class="text-4xl font-extrabold" style="background:var(--gradient-primary);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${t.totalTeam}</div>
          <div class="text-sm text-secondary">Total Team Members</div>
          <div class="badge badge-success mt-2">${t.activeMembers} Active This Week</div>
        </div>

        <div class="grid grid-cols-3 gap-3 mb-4">
          <div class="card text-center cursor-pointer" style="border:${this.currentLevel === 'A' ? '2px solid var(--color-primary)' : ''}" onclick="TeamPage.switchLevel('A')">
            <div class="text-2xl font-bold">${t.levelA.count}</div>
            <div class="text-xs text-secondary">Level A</div>
          </div>
          <div class="card text-center cursor-pointer" style="border:${this.currentLevel === 'B' ? '2px solid var(--color-primary)' : ''}" onclick="TeamPage.switchLevel('B')">
            <div class="text-2xl font-bold">${t.levelB.count}</div>
            <div class="text-xs text-secondary">Level B</div>
          </div>
          <div class="card text-center cursor-pointer" style="border:${this.currentLevel === 'C' ? '2px solid var(--color-primary)' : ''}" onclick="TeamPage.switchLevel('C')">
            <div class="text-2xl font-bold">${t.levelC.count}</div>
            <div class="text-xs text-secondary">Level C</div>
          </div>
        </div>

        <div class="card mb-4">
          <h4 class="mb-3">👤 Level ${this.currentLevel} Members</h4>
          ${this.renderMembers(this.getLevelMembers(t, this.currentLevel))}
        </div>

        <div class="card">
          <h4 class="mb-3">🔗 Your Referral</h4>
          <div class="text-center mb-3">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(ref.link)}"
                 alt="Referral QR Code"
                 style="border-radius:12px;max-width:180px;"
                 loading="lazy">
            <p class="text-xs text-secondary mt-2">Scan to join</p>
          </div>
          <div class="referral-link-box">
            <input type="text" value="${ref.link}" readonly onclick="this.select()" class="text-sm">
            <button class="btn btn-primary btn-sm" onclick="TeamPage.copyLink('${ref.link}')">📋 Copy</button>
          </div>
          <div class="text-xs text-secondary mt-2 text-center">
            Code: <strong>${ref.code}</strong>
            <button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText('${ref.code}');Toast.show('Code copied!')" title="Copy code">📋</button>
            • Earn 10% • 3% • 1%
          </div>
        </div>
      `;
    } else {
      content.innerHTML = `
        <div class="card card-gradient mb-4 text-center">
          <div class="text-4xl mb-2">💼</div>
          <h3 class="mb-2">Manager Status</h3>
          ${elig.highestRank ? `
            <div class="badge badge-success badge-lg">${elig.highestRank.name}</div>
            <div class="text-2xl font-bold text-success mt-2">${this.formatETB(elig.highestRank.salary)} ETB/month</div>
          ` : '<p class="text-secondary">Build your team to qualify</p>'}
        </div>
        <div class="card mb-4">
          <h4 class="mb-3">📊 Your Progress</h4>
          <div class="flex justify-between py-2"><span>Level A</span><span class="font-bold">${elig.currentCounts.a}</span></div>
          <div class="flex justify-between py-2"><span>Level B</span><span class="font-bold">${elig.currentCounts.b}</span></div>
          <div class="flex justify-between py-2"><span>Level C</span><span class="font-bold">${elig.currentCounts.c}</span></div>
          <div class="flex justify-between py-2"><span>Total</span><span class="font-bold">${elig.currentCounts.total}</span></div>
        </div>
      `;
    }
  }

  renderMembers(members) {
    if (members.length === 0) {
      return '<p class="text-center text-secondary py-4">No members at this level yet</p>';
    }
    return members.map((m, i) => `
      <div class="list-item animate-fadeInUp" style="animation-delay:${i * 0.03}s">
        <div class="list-item-icon" style="background:${m.active_package ? 'var(--color-success-bg)' : 'var(--color-surface-hover)'}">👤</div>
        <div class="list-item-content">
          <div class="list-item-title">${m.full_name || m.phone}</div>
          <div class="list-item-subtitle">${m.full_name ? m.phone + ' • ' : ''}Joined ${new Date(m.created_at).toLocaleDateString()}</div>
        </div>
        <div class="list-item-trailing text-right">
          ${m.active_package ? '<span class="badge badge-success">' + m.active_package + '</span>' : '<span class="badge badge-warning">Inactive</span>'}
          <div class="text-xs text-secondary mt-1">${this.formatETB(m.total_recharge)} ETB</div>
        </div>
      </div>
    `).join('');
  }

  getLevelCount(data, level) { return data['level' + level]?.count || 0; }
  getLevelMembers(data, level) { return data['level' + level]?.members || []; }

  static switchLevel(level) {
    const instance = router.currentPage;
    instance.currentLevel = level;
    instance.render();
  }

  static switchTab(tab) {
    const instance = router.currentPage;
    instance.currentTab = tab;
    instance.render();
  }

  static showReferralLink() {
    API.get('/team/referral-link').then(data => {
      const ref = data.data;
      Modal.show(`
        <div class="modal-header">
          <h3 class="modal-title">🔗 Your Referral Link</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        </div>
        <div class="text-center mb-4">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ref.link)}"
               alt="QR Code" style="border-radius:12px;max-width:200px;" loading="lazy">
          <p class="text-xs text-secondary mt-2">Scan QR code to register</p>
          <div class="referral-link-box mt-3">
            <input type="text" value="${ref.link}" readonly onclick="this.select()">
            <button class="btn btn-primary btn-sm" onclick="TeamPage.copyLink('${ref.link}')">📋 Copy</button>
          </div>
          <p class="text-xs text-secondary mt-2">Code: <strong>${ref.code}</strong> • 10% • 3% • 1%</p>
        </div>
      `);
    });
  }

  static copyLink(link) {
    navigator.clipboard.writeText(link)
      .then(() => Toast.show('Link copied!'))
      .catch(() => Toast.show('Failed to copy', 'error'));
  }

  formatETB(amount) {
    const num = Number(amount || 0);
    if (!isFinite(num) || num > 999999999 || num < 0) return '0.00';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  unmount() {}
}