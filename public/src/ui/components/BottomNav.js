export default class BottomNav {
    constructor() {
        this.isInitialized = false;
    }

    init() {
        if (!this.isInitialized) {
            this.setupEventListeners();
            this.isInitialized = true;
        }
    }

    setupEventListeners() {
        const navItems = document.querySelectorAll('.bottom-nav .nav-item');

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;

                if (page && window.app && window.app.router) {
                    // Update active state
                    this.setActiveItem(item);

                    // Navigate to page
                    window.app.router.navigate(`/${page}`);
                }
            });
        });
    }

    setActiveItem(activeItem) {
        const navItems = document.querySelectorAll('.bottom-nav .nav-item');

        navItems.forEach(item => {
            item.classList.remove('active');
        });

        activeItem.classList.add('active');
    }

    setActivePage(page) {
        const navItems = document.querySelectorAll('.bottom-nav .nav-item');

        navItems.forEach(item => {
            item.classList.remove('active');

            if (item.dataset.page === page) {
                item.classList.add('active');
            }
        });
    }
}