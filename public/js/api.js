// public/js/api.js
const API = {
    base: '/api',
    token: null,

    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    },

    getToken() {
        if (!this.token) {
            this.token = localStorage.getItem('token');
        }
        return this.token;
    },

    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    async request(endpoint, options = {}) {
        const url = `${this.base}${endpoint}`;
        const token = this.getToken();

        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` })
            },
            ...options
        };

        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                this.clearToken();
                window.location.hash = '#/login';
            }
            throw new Error(data.message || 'Request failed');
        }

        return data;
    },

    get(endpoint) {
        return this.request(endpoint);
    },

    post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};