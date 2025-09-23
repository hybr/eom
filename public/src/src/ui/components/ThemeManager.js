export default class ThemeManager {
    constructor() {
        this.currentTheme = 'light';
        this.init();
    }

    init() {
        // Check for saved theme preference or default to 'light'
        this.currentTheme =
            localStorage.getItem('theme') ||
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

        this.applyTheme(this.currentTheme);
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });

        // Set up theme toggle button
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    }

    setTheme(theme) {
        this.currentTheme = theme;
        this.applyTheme(theme);
        localStorage.setItem('theme', theme);
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);

        // Update theme toggle icon
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
        }

        // Update meta theme-color for mobile browsers
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', theme === 'dark' ? '#121212' : '#1976d2');
        }
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    getCurrentTheme() {
        return this.currentTheme;
    }
}