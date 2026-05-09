// public/js/router.js
class Router {
    constructor() {
        this.routes = {};
        this.routeMeta = {};
        this.currentPage = null;
        this.currentAdminPage = null;
        this.currentPath = '';
        this.currentQuery = {};
        this.history = [];
        this.userContainer = document.getElementById('appContent');
        this.adminContainer = document.getElementById('adminContent');
        this.navigating = false;
        this.watcherInterval = null;

        window.addEventListener('hashchange', () => this.handleRoute());
        window.addEventListener('load', () => {
            this.handleRoute();
            this.startWatcher();
        });
    }

    addRoute(path, page, meta = {}) {
        this.routes[path] = page;
        this.routeMeta[path] = {
            breadcrumbs: meta.breadcrumbs || [],
            back: meta.back || null,
            actions: meta.actions || [],
            isAdmin: path.startsWith('/admin')
        };
    }

    startWatcher() {
        if (this.watcherInterval) clearInterval(this.watcherInterval);
        this.watcherInterval = setInterval(() => {
            const hash = window.location.hash.slice(1) || '/';
            const [path] = hash.split('?');
            const isAdmin = path.startsWith('/admin');
            if (path === '/login' || path === '/register' || path === '/admin/login' || path === '/' || path === '/home') return;
            if (isAdmin) {
                const mainEl = this.adminContainer?.querySelector('.admin-main');
                if (mainEl && !mainEl.querySelector('.admin-breadcrumb')) this.forceInjectAdminBreadcrumb(path);
            } else {
                const pageEl = this.userContainer?.querySelector('.page');
                if (pageEl && !pageEl.querySelector('.breadcrumb')) this.forceInjectUserBreadcrumb(path);
            }
        }, 300);
    }

    reinjectNavigation() {
        const hash = window.location.hash.slice(1) || '/';
        const [path] = hash.split('?');
        const isAdmin = path.startsWith('/admin');
        if (path === '/login' || path === '/register' || path === '/admin/login' || path === '/' || path === '/home') return;
        if (isAdmin) { this.forceInjectAdminBreadcrumb(path); this.forceInjectAdminActions(path); }
        else { this.forceInjectUserBreadcrumb(path); }
    }

    handleRoute() {
        if (this.navigating) return;
        const rawHash = window.location.hash.slice(1) || '/';
        const [path, queryString] = rawHash.split('?');
        const queryParams = {};
        if (queryString) { queryString.split('&').forEach(pair => { const [k, v] = pair.split('='); queryParams[k] = decodeURIComponent(v || ''); }); }
        this.currentPath = path;
        this.currentQuery = queryParams;
        if (this.history.length === 0 || this.history[this.history.length - 1] !== path) this.history.push(path);
        if (this.history.length > 50) this.history = this.history.slice(-50);

        const isAdminRoute = path.startsWith('/admin');
        const adminToken = localStorage.getItem('admin_token');
        const userToken = localStorage.getItem('token');

        // Toggle visibility
        document.getElementById('app').style.display = isAdminRoute ? 'none' : 'block';
        document.getElementById('adminApp').style.display = isAdminRoute ? 'flex' : 'none';

        // ADMIN ROUTING
        if (isAdminRoute) {
            if (adminToken && path === '/admin/login') { window.location.hash = '#/admin/dashboard'; return; }
            if (!adminToken && path !== '/admin/login') { window.location.hash = '#/admin/login'; return; }
        }
        // USER ROUTING
        else {
            const publicRoutes = ['/', '/login', '/register', '/support'];
            if (!userToken && !publicRoutes.includes(path)) { window.location.hash = '#/login'; return; }
            if (userToken && (path === '/login' || path === '/register' || path === '/')) { window.location.hash = '#/home'; return; }
            
            // Suspended user check
            if (userToken) {
                const userData = JSON.parse(localStorage.getItem('user') || '{}');
                if (userData.status === 'suspended' || userData.status === 'banned') {
                    const allowed = ['/home', '/profile', '/support', '/login', '/register', '/'];
                    if (!allowed.includes(path)) {
                        setTimeout(() => { Dialog.alert(userData.status === 'banned' ? 'Your account has been permanently banned.' : 'Your account is suspended. Contact support.', userData.status === 'banned' ? 'Account Banned' : 'Account Suspended', 'warning'); }, 300);
                        window.location.hash = '#/home'; return;
                    }
                }
            }
        }

        const page = this.routes[path];
        if (page) {
            this.navigating = true;
            if (isAdminRoute && this.currentAdminPage?.unmount) this.currentAdminPage.unmount();
            if (!isAdminRoute && this.currentPage?.unmount) this.currentPage.unmount();
            const container = isAdminRoute ? this.adminContainer : this.userContainer;
            const pageInstance = new page(container);
            if (isAdminRoute) this.currentAdminPage = pageInstance;
            else this.currentPage = pageInstance;
            pageInstance.render();
            setTimeout(() => { this.injectNow(path, isAdminRoute); this.navigating = false; }, 50);
        }
    }

    injectNow(path, isAdmin) {
        if (isAdmin) { this.forceInjectAdminBreadcrumb(path); this.forceInjectAdminActions(path); }
        else { this.forceInjectUserBreadcrumb(path); }
    }

    forceInjectUserBreadcrumb(path) {
        const meta = this.routeMeta[path];
        if (!meta?.breadcrumbs || meta.breadcrumbs.length === 0) return;
        const existing = document.querySelector('.breadcrumb'); if (existing) existing.remove();
        const nav = document.createElement('nav'); nav.className = 'breadcrumb'; nav.setAttribute('data-router', 'breadcrumb');
        nav.innerHTML = meta.breadcrumbs.map((item, i) => { const isLast = i === meta.breadcrumbs.length - 1; return `<span class="breadcrumb-item ${isLast?'active':''}">${!isLast?`<a onclick="router.navigate('${item.path||'#'}')" class="breadcrumb-link">${item.label}</a>`:`<span>${item.label}</span>`}${!isLast?'<span class="breadcrumb-separator">›</span>':''}</span>`; }).join('');
        const pageEl = this.userContainer?.querySelector('.page');
        if (pageEl && !pageEl.querySelector('[data-router="breadcrumb"]')) pageEl.insertBefore(nav, pageEl.firstChild);
    }

    forceInjectAdminBreadcrumb(path) {
        const meta = this.routeMeta[path];
        if (!meta?.breadcrumbs || meta.breadcrumbs.length === 0) return;
        const existing = document.querySelector('.admin-breadcrumb'); if (existing) existing.remove();
        const nav = document.createElement('nav'); nav.className = 'admin-breadcrumb'; nav.setAttribute('data-router', 'breadcrumb');
        nav.innerHTML = meta.breadcrumbs.map((item, i) => { const isLast = i === meta.breadcrumbs.length - 1; return `<span class="breadcrumb-item ${isLast?'active':''}">${!isLast?`<a onclick="router.navigate('${item.path||'#'}')" class="breadcrumb-link">${item.label}</a>`:`<span>${item.label}</span>`}${!isLast?'<span class="breadcrumb-separator">›</span>':''}</span>`; }).join('');
        const mainEl = this.adminContainer?.querySelector('.admin-main');
        if (mainEl && !mainEl.querySelector('[data-router="breadcrumb"]')) mainEl.insertBefore(nav, mainEl.firstChild);
    }

    forceInjectAdminActions(path) {
        const meta = this.routeMeta[path];
        if (!meta?.actions || meta.actions.length === 0) return;
        const existing = document.querySelector('.admin-action-buttons'); if (existing) existing.remove();
        const container = document.createElement('div'); container.className = 'admin-action-buttons'; container.setAttribute('data-router', 'actions');
        container.innerHTML = meta.actions.map(btn => `<button class="btn btn-${btn.variant||'primary'} ${btn.block?'btn-block':''}" onclick="${btn.onclick}">${btn.icon||''} ${btn.label}</button>`).join('');
        const mainEl = this.adminContainer?.querySelector('.admin-main');
        if (mainEl && !mainEl.querySelector('[data-router="actions"]')) mainEl.appendChild(container);
    }

    navigate(path) { window.location.hash = `#${path}`; }
}

const router = new Router();