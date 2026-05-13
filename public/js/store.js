// public/js/store.js

/**
 * State Management
 * Uses sessionStorage for per-tab user sessions
 * Multiple browser tabs can have different logged-in users
 * Falls back to localStorage for backward compatibility
 */
var Store = function() {
  // Check both storages for existing session
  var storedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
  var storedToken = sessionStorage.getItem('token') || localStorage.getItem('token');

  // If token exists in localStorage but not sessionStorage, migrate it
  if (!sessionStorage.getItem('token') && localStorage.getItem('token')) {
    sessionStorage.setItem('token', localStorage.getItem('token'));
    sessionStorage.setItem('user', localStorage.getItem('user'));
  }

  this.state = {
    user: JSON.parse(storedUser || 'null'),
    isLoggedIn: !!storedToken,
    currentPage: null
  };
  this.listeners = [];
};

Store.prototype.setState = function(key, value) {
  this.state[key] = value;
  if (key === 'user') {
    sessionStorage.setItem('user', JSON.stringify(value));
  }
  this.notify(key, value);
};

Store.prototype.subscribe = function(fn) {
  this.listeners.push(fn);
  return function() {
    this.listeners = this.listeners.filter(function(l) { return l !== fn; });
  }.bind(this);
};

Store.prototype.notify = function(key, value) {
  this.listeners.forEach(function(fn) {
    fn(key, value);
  });
};

Store.prototype.login = function(userData, token) {
  API.setToken(token);
  this.setState('user', userData);
  this.setState('isLoggedIn', true);
};

Store.prototype.logout = function() {
  API.clearToken();
  this.setState('user', null);
  this.setState('isLoggedIn', false);
};

var store = new Store();