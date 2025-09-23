export default class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.setupRoutes();
    }

    setupRoutes() {
        // Define application routes
        this.routes.set('/', () => this.navigate('/dashboard'));
        this.routes.set('/dashboard', () => this.loadPage('Dashboard'));
        this.routes.set('/organizations', () => this.loadPage('Organizations'));
        this.routes.set('/organizations/:id', (params) => this.loadPage('OrganizationDetail', params));
        this.routes.set('/workers', () => this.loadPage('Workers'));
        this.routes.set('/procedures', () => this.loadPage('Procedures'));
        this.routes.set('/projects', () => this.loadPage('Projects'));
        this.routes.set('/market', () => this.loadPage('Market'));
        this.routes.set('/notifications', () => this.loadPage('Notifications'));
        this.routes.set('/communicate', () => this.loadPage('Communicate'));
        this.routes.set('/profile', () => this.loadPage('Profile'));
        this.routes.set('/analytics', () => this.loadPage('Analytics'));
    }

    init() {
        // Handle browser navigation
        window.addEventListener('popstate', () => {
            this.handleRoute();
        });

        // Handle initial route
        this.handleRoute();
    }

    navigate(path) {
        if (path !== this.currentRoute) {
            history.pushState(null, '', path);
            this.handleRoute();
        }
    }

    handleRoute() {
        const path = window.location.pathname;
        this.currentRoute = path;

        // Find matching route
        for (const [routePath, handler] of this.routes) {
            const params = this.matchRoute(routePath, path);
            if (params !== null) {
                handler(params);
                this.updatePageTitle(routePath);
                this.updateActiveNavItem(path);
                return;
            }
        }

        // 404 - Route not found
        this.loadPage('NotFound');
    }

    matchRoute(routePath, actualPath) {
        if (routePath === actualPath) {
            return {};
        }

        const routeParts = routePath.split('/');
        const pathParts = actualPath.split('/');

        if (routeParts.length !== pathParts.length) {
            return null;
        }

        const params = {};
        for (let i = 0; i < routeParts.length; i++) {
            const routePart = routeParts[i];
            const pathPart = pathParts[i];

            if (routePart.startsWith(':')) {
                const paramName = routePart.slice(1);
                params[paramName] = pathPart;
            } else if (routePart !== pathPart) {
                return null;
            }
        }

        return params;
    }

    async loadPage(pageName, params = {}) {
        try {
            const pageModule = await import(`./ui/pages/${pageName}.js`);
            const PageClass = pageModule.default;
            const page = new PageClass(params);

            const mainContent = document.getElementById('main-content');
            await page.render(mainContent);

        } catch (error) {
            console.error(`Failed to load page ${pageName}:`, error);
            this.loadErrorPage();
        }
    }

    loadErrorPage() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="error-page">
                <h2>Page Not Found</h2>
                <p>The requested page could not be found.</p>
                <button onclick="window.app.router.navigate('/dashboard')" class="btn btn-primary">
                    Go to Dashboard
                </button>
            </div>
        `;
    }

    updatePageTitle(routePath) {
        const titles = {
            '/dashboard': 'Dashboard',
            '/organizations': 'Organizations',
            '/workers': 'Workers',
            '/procedures': 'Procedures',
            '/projects': 'Projects',
            '/market': 'Market',
            '/notifications': 'Notifications',
            '/communicate': 'Messages',
            '/profile': 'Profile',
            '/analytics': 'Analytics'
        };

        const title = titles[routePath] || 'V4L Multi-Org';
        document.getElementById('page-title').textContent = title;
        document.title = `${title} - V4L Multi-Org`;
    }

    updateActiveNavItem(path) {
        // Update bottom navigation active state
        const navItems = document.querySelectorAll('.bottom-nav .nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
            const itemPage = item.dataset.page;
            if (path.includes(itemPage)) {
                item.classList.add('active');
            }
        });
    }
}