import AuthService from './services/auth.js';
import DatabaseService from './services/db.js';
import WebSocketService from './services/websocket.js';
import Router from './router.js';
import ThemeManager from './ui/components/ThemeManager.js';
import TopNav from './ui/components/TopNav.js';
import BottomNav from './ui/components/BottomNav.js';

export default class App {
    constructor() {
        this.auth = new AuthService();
        this.db = new DatabaseService();
        this.ws = new WebSocketService();
        this.router = new Router();
        this.theme = new ThemeManager();
        this.topNav = new TopNav();
        this.bottomNav = new BottomNav();

        this.currentOrganization = null;
        this.currentUser = null;
    }

    async init() {
        try {
            // Initialize services
            await this.db.init();
            this.auth.setDatabase(this.db);
            this.theme.init();

            // Check authentication status
            const user = await this.auth.getCurrentUser();

            if (user) {
                await this.onUserAuthenticated(user);
            } else {
                this.showAuthModal();
            }

            // Set up global event listeners
            this.setupEventListeners();

            // Hide loading spinner
            this.hideLoadingSpinner();

            // Make app globally accessible
            window.app = this;

        } catch (error) {
            console.error('App initialization failed:', error);
            this.showError('Failed to initialize application');
        }
    }

    async onUserAuthenticated(user) {
        this.currentUser = user;

        // Initialize WebSocket connection
        await this.ws.connect(user.token);

        // Load user's organizations
        const organizations = await this.db.getUserOrganizations(user.id);

        // Initialize navigation
        this.topNav.init(user, organizations);
        this.bottomNav.init();

        // Show main UI
        document.getElementById('top-nav').classList.remove('hidden');
        document.getElementById('bottom-nav').classList.remove('hidden');

        // Initialize router
        this.router.init();

        // Set up organization context
        if (organizations.length > 0) {
            this.setCurrentOrganization(organizations[0]);
        }

        // Navigate to dashboard
        this.router.navigate('/dashboard');
    }

    setCurrentOrganization(organization) {
        this.currentOrganization = organization;

        // Update UI
        this.topNav.setCurrentOrganization(organization);

        // Subscribe to organization-specific WebSocket events
        this.ws.subscribe(`org:${organization.id}`);

        // Store in localStorage for persistence
        localStorage.setItem('currentOrganizationId', organization.id);

        // Emit organization change event
        this.emit('organizationChanged', organization);
    }

    showAuthModal() {
        const authModal = document.getElementById('auth-modal');
        authModal.classList.remove('hidden');

        // Load auth component
        import('./ui/components/AuthComponent.js').then(module => {
            const AuthComponent = module.default;
            const authComponent = new AuthComponent();
            authComponent.render(document.getElementById('auth-content'));
        });
    }

    hideAuthModal() {
        const authModal = document.getElementById('auth-modal');
        authModal.classList.add('hidden');
    }

    hideLoadingSpinner() {
        const spinner = document.getElementById('loading-spinner');
        spinner.classList.add('hidden');
    }

    showError(message) {
        // Simple error display - could be enhanced with a proper notification system
        alert(message);
    }

    setupEventListeners() {
        // Global error handling
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
        });

        // Handle authentication events
        this.auth.on('authenticated', (user) => {
            this.onUserAuthenticated(user);
            this.hideAuthModal();
        });

        this.auth.on('logout', () => {
            this.onUserLogout();
        });

        // Handle organization selection
        this.on('organizationSelected', (organization) => {
            this.setCurrentOrganization(organization);
        });
    }

    onUserLogout() {
        this.currentUser = null;
        this.currentOrganization = null;

        // Disconnect WebSocket
        this.ws.disconnect();

        // Hide main UI
        document.getElementById('top-nav').classList.add('hidden');
        document.getElementById('bottom-nav').classList.add('hidden');

        // Show auth modal
        this.showAuthModal();

        // Clear localStorage
        localStorage.removeItem('currentOrganizationId');
        localStorage.removeItem('authToken');
    }

    // Simple event emitter functionality
    on(event, callback) {
        if (!this.listeners) this.listeners = {};
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    emit(event, data) {
        if (!this.listeners || !this.listeners[event]) return;
        this.listeners[event].forEach(callback => callback(data));
    }

    // Getters for global access
    getCurrentUser() {
        return this.currentUser;
    }

    getCurrentOrganization() {
        return this.currentOrganization;
    }

    getAuth() {
        return this.auth;
    }

    getDatabase() {
        return this.db;
    }

    getWebSocket() {
        return this.ws;
    }
}

// Make app instance globally available
window.app = null;