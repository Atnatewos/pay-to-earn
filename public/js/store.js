// public/js/store.js

/**
 * User State Management
 * ALL storage operations use Session controller
 * Session is the SINGLE source of truth for auth state
 */
var Store = function() {

  var storedUser = Session.getUserData();
  var storedToken = Session.getUserToken();

  this.state = {
    user: storedUser,
    isLoggedIn: !!storedToken,
    currentPage: null
  };

  this.listeners = [];
};

Store.prototype.setState = function(key, value) {
  this.state[key] = value;

  if (key === 'user') {
    // Do NOT persist here - Session.setUser handles persistence
    // This just updates the in-memory state
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
  this.listeners.forEach(function(fn) { fn(key, value); });
};

Store.prototype.login = function(userData, token) {
  // Store through Session controller (writes to both storages)
  Session.setUser(token, userData);

  // Update in-memory state
  API.setToken(token);
  this.setState('user', userData);
  this.setState('isLoggedIn', true);
};

Store.prototype.logout = function() {
  // Clear through Session controller (removes from both storages)
  Session.clearUser();

  // Update in-memory state
  API.clearToken();
  this.setState('user', null);
  this.setState('isLoggedIn', false);
};

var store = new Store();