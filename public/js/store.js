class Store {
    constructor() {
        this.state = {
            user: JSON.parse(localStorage.getItem('user') || 'null'),
            isLoggedIn: !!localStorage.getItem('token'),
            currentPage: null
        };
        this.listeners = [];
    }

    setState(key, value) {
        this.state[key] = value;
        if (key === 'user') {
            localStorage.setItem('user', JSON.stringify(value));
        }
        this.notify(key, value);
    }

    subscribe(fn) {
        this.listeners.push(fn);
        return () => { this.listeners = this.listeners.filter(l => l !== fn); };
    }

    notify(key, value) {
        this.listeners.forEach(fn => fn(key, value));
    }

    login(userData, token) {
        API.setToken(token);
        this.setState('user', userData);
        this.setState('isLoggedIn', true);
    }

    logout() {
        API.clearToken();
        this.setState('user', null);
        this.setState('isLoggedIn', false);
    }
}

const store = new Store();