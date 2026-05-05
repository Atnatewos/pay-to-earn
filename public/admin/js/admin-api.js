const AdminAPI = {
    base: '/api/admin',
    getToken() { return localStorage.getItem('admin_token'); },
    async request(endpoint, options = {}) {
        const token = this.getToken();
        if (!token) { window.location.hash = '#/admin/login'; return; }
        const response = await fetch(`${this.base}${endpoint}`, {
            ...options,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...options.headers }
        });
        if (response.status === 401) { this.logout(); return; }
        return response.json();
    },
    get(endpoint) { return this.request(endpoint); },
    post(endpoint, body) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) }); },
    logout() { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_data'); window.location.hash = '#/admin/login'; }
};
