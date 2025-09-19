global.WebSocket = require('ws');

global.fetch = jest.fn();

Object.defineProperty(window, 'localStorage', {
    value: {
        store: {},
        getItem(key) {
            return this.store[key] || null;
        },
        setItem(key, value) {
            this.store[key] = String(value);
        },
        removeItem(key) {
            delete this.store[key];
        },
        clear() {
            this.store = {};
        }
    },
    writable: true
});

Object.defineProperty(window, 'sessionStorage', {
    value: {
        store: {},
        getItem(key) {
            return this.store[key] || null;
        },
        setItem(key, value) {
            this.store[key] = String(value);
        },
        removeItem(key) {
            delete this.store[key];
        },
        clear() {
            this.store = {};
        }
    },
    writable: true
});

beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    fetch.mockClear();
});