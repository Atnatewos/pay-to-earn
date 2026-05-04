// public/js/router.js
class Router {
    constructor() {
        this.routes = {};
        this.routeMeta = {};
        this.currentPage = null;
        this.currentAdminPage = null;
        this.currentPath = '';
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
            const isAdmin = hash.startsWith('/admin');
            
            if (hash === '/login' || hash === '/register' || hash === '/admin/login' || hash === '/' || hash === '/home') return;
            
            if (isAdmin) {
                const mainEl = this.adminContainer?.querySelector('.admin-main');
                if (mainEl && !mainEl.querySelector('.admin-breadcrumb')) {
                    this.forceInjectAdminBreadcrumb(hash);
                }
            } else {
                const pageEl = this.userContainer?.querySelector('.page');
                if (pageEl && !pageEl.querySelector('.breadcrumb')) {
                    this.forceInjectUserBreadcrumb(hash);
                }
            }
        }, 300);
    }

    // Public method pages can call when they re-render themselves
    reinjectNavigation() {
        const hash = window.location.hash.slice(1) || '/';
        const isAdmin = hash.startsWith('/admin');
        
        if (hash === '/login' || hash === '/register' || hash === '/admin/login' || hash === '/' || hash === '/home') return;
        
        if (isAdmin) {
            this.forceInjectAdminBreadcrumb(hash);
            this.forceInjectAdminActions(hash);
        } else {
            this.forceInjectUserBreadcrumb(hash);
        }
    }

    handleRoute() {
        if (this.navigating) return;

        const hash = window.location.hash.slice(1) || '/';
        
        if (this.history.length === 0 || this.history[this.history.length - 1] !== hash) {
            this.history.push(hash);
        }
        if (this.history.length > 50) this.history = this.history.slice(-50);

        this.currentPath = hash;
        const isAdminRoute = hash.startsWith('/admin');
        const adminToken = localStorage.getItem('admin_token');
        const userToken = localStorage.getItem('token');

        document.getElementById('app').style.display = isAdminRoute ? 'none' : 'block';
        document.getElementById('adminApp').style.display = isAdminRoute ? 'flex' : 'none';

        if (isAdminRoute) {
            if (!adminToken && hash !== '/admin/login') {
                window.location.hash = '#/admin/login';
                return;
            }
            if (adminToken && hash === '/admin/login') {
                window.location.hash = '#/admin/dashboard';
                return;
            }
        } else {
            const publicRoutes = ['/', '/login', '/register'];
            if (!userToken && !publicRoutes.includes(hash)) {
                window.location.hash = '#/login';
                return;
            }
            if (userToken && (hash === '/login' || hash === '/register' || hash === '/')) {
                window.location.hash = '#/home';
                return;
            }
        }

        const page = this.routes[hash];
        if (page) {
            this.navigating = true;
            
            if (isAdminRoute && this.currentAdminPage?.unmount) {
                this.currentAdminPage.unmount();
            }
            if (!isAdminRoute && this.currentPage?.unmount) {
                this.currentPage.unmount();
            }

            const container = isAdminRoute ? this.adminContainer : this.userContainer;
            const pageInstance = new page(container);
            
            if (isAdminRoute) this.currentAdminPage = pageInstance;
            else this.currentPage = pageInstance;

            pageInstance.render();
            
            setTimeout(() => {
                this.injectNow(hash, isAdminRoute);
                this.navigating = false;
            }, 50);
        }
    }

    injectNow(path, isAdmin) {
        if (isAdmin) {
            this.forceInjectAdminBreadcrumb(path);
            this.forceInjectAdminActions(path);
        } else {
            this.forceInjectUserBreadcrumb(path);
        }
    }

    forceInjectUserBreadcrumb(path) {
        const meta = this.routeMeta[path];
        if (!meta?.breadcrumbs || meta.breadcrumbs.length === 0) return;

        const existing = document.querySelector('.breadcrumb');
        if (existing) existing.remove();

        const nav = document.createElement('nav');
        nav.className = 'breadcrumb';
        nav.setAttribute('data-router', 'breadcrumb');
        
        nav.innerHTML = meta.breadcrumbs.map((item, index) => {
            const isLast = index === meta.breadcrumbs.length - 1;
            return `
                <span class="breadcrumb-item ${isLast ? 'active' : ''}">
                    ${!isLast 
                        ? `<a onclick="router.navigate('${item.path || '#'}')" class="breadcrumb-link">${item.label}</a>`
                        : `<span>${item.label}</span>`
                    }
                    ${!isLast ? '<span class="breadcrumb-separator">›</span>' : ''}
                </span>
            `;
        }).join('');

        const pageEl = this.userContainer?.querySelector('.page');
        if (pageEl && !pageEl.querySelector('[data-router="breadcrumb"]')) {
            pageEl.insertBefore(nav, pageEl.firstChild);
        }
    }

    forceInjectAdminBreadcrumb(path) {
        const meta = this.routeMeta[path];
        if (!meta?.breadcrumbs || meta.breadcrumbs.length === 0) return;

        const existing = document.querySelector('.admin-breadcrumb');
        if (existing) existing.remove();

        const nav = document.createElement('nav');
        nav.className = 'admin-breadcrumb';
        nav.setAttribute('data-router', 'breadcrumb');
        
        nav.innerHTML = meta.breadcrumbs.map((item, index) => {
            const isLast = index === meta.breadcrumbs.length - 1;
            return `
                <span class="breadcrumb-item ${isLast ? 'active' : ''}">
                    ${!isLast 
                        ? `<a onclick="router.navigate('${item.path || '#'}')" class="breadcrumb-link">${item.label}</a>`
                        : `<span>${item.label}</span>`
                    }
                    ${!isLast ? '<span class="breadcrumb-separator">›</span>' : ''}
                </span>
            `;
        }).join('');

        const mainEl = this.adminContainer?.querySelector('.admin-main');
        if (mainEl && !mainEl.querySelector('[data-router="breadcrumb"]')) {
            mainEl.insertBefore(nav, mainEl.firstChild);
        }
    }

    forceInjectAdminActions(path) {
        const meta = this.routeMeta[path];
        if (!meta?.actions || meta.actions.length === 0) return;

        const existing = document.querySelector('.admin-action-buttons');
        if (existing) existing.remove();

        const container = document.createElement('div');
        container.className = 'admin-action-buttons';
        container.setAttribute('data-router', 'actions');
        
        container.innerHTML = meta.actions.map(btn => `
            <button class="btn btn-${btn.variant || 'primary'} ${btn.block ? 'btn-block' : ''}"
                    onclick="${btn.onclick}">
                ${btn.icon || ''} ${btn.label}
            </button>
        `).join('');

        const mainEl = this.adminContainer?.querySelector('.admin-main');
        if (mainEl && !mainEl.querySelector('[data-router="actions"]')) {
            mainEl.appendChild(container);
        }
    }

    navigate(path) {
        window.location.hash = `#${path}`;
    }
}

const router = new Router();