import User from './entities/User.js';
import Organization from './entities/Organization.js';
import Process from './entities/Process.js';
import Project from './entities/Project.js';
import AuthenticationComponent from './components/AuthenticationComponent.js';

class App {
    constructor() {
        this.users = new Map();
        this.organizations = new Map();
        this.processes = new Map();
        this.projects = new Map();
        this.currentUser = null;
        this.websocket = null;
        this.authComponent = null;

        this.init();
    }

    init() {
        this.loadFromStorage();
        this.setupAuthentication();
        this.setupEventListeners();
        this.setupNavigation();
        this.connectWebSocket();
        this.render();
    }

    setupAuthentication() {
        this.authComponent = new AuthenticationComponent();

        // Sync users between auth service and app
        if (this.users.size > 0) {
            const usersArray = Array.from(this.users.values()).map(user => user.toJSON(true));
            this.authComponent.getAuthService().setUsers(usersArray);
        }

        // Listen for authentication events
        this.authComponent.getAuthService().addEventListener('user:logged_in', (data) => {
            this.currentUser = User.fromJSON(data.user);
            this.render();
        });

        this.authComponent.getAuthService().addEventListener('user:logged_out', () => {
            this.currentUser = null;
            this.render();
        });

        this.authComponent.getAuthService().addEventListener('user:registered', (data) => {
            // Add new user to app's user store
            const users = this.authComponent.getAuthService().getAllUsers();
            this.users.clear();
            users.forEach(userData => {
                const user = User.fromJSON(userData);
                this.users.set(user.id, user);
            });
            this.saveToStorage();
        });
    }

    loadFromStorage() {
        try {
            const userData = localStorage.getItem('users');
            if (userData) {
                const users = JSON.parse(userData);
                users.forEach(user => {
                    this.users.set(user.id, User.fromJSON(user));
                });
            }

            const orgData = localStorage.getItem('organizations');
            if (orgData) {
                const orgs = JSON.parse(orgData);
                orgs.forEach(org => {
                    this.organizations.set(org.id, Organization.fromJSON(org));
                });
            }

            const processData = localStorage.getItem('processes');
            if (processData) {
                const processes = JSON.parse(processData);
                processes.forEach(process => {
                    this.processes.set(process.id, Process.fromJSON(process));
                });
            }

            const projectData = localStorage.getItem('projects');
            if (projectData) {
                const projects = JSON.parse(projectData);
                projects.forEach(project => {
                    this.projects.set(project.id, Project.fromJSON(project));
                });
            }

            const currentUserId = localStorage.getItem('currentUserId');
            if (currentUserId) {
                this.currentUser = this.users.get(currentUserId);
            }
        } catch (error) {
            console.error('Error loading data from storage:', error);
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('users', JSON.stringify(Array.from(this.users.values())));
            localStorage.setItem('organizations', JSON.stringify(Array.from(this.organizations.values())));
            localStorage.setItem('processes', JSON.stringify(Array.from(this.processes.values())));
            localStorage.setItem('projects', JSON.stringify(Array.from(this.projects.values())));
            if (this.currentUser) {
                localStorage.setItem('currentUserId', this.currentUser.id);
            }
        } catch (error) {
            console.error('Error saving data to storage:', error);
        }
    }

    setupEventListeners() {
        document.getElementById('create-user-btn')?.addEventListener('click', () => {
            this.showCreateUserModal();
        });

        document.getElementById('create-org-btn')?.addEventListener('click', () => {
            this.showCreateOrgModal();
        });

        document.getElementById('create-process-btn')?.addEventListener('click', () => {
            this.showCreateProcessModal();
        });

        // Mobile menu toggle
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const mobileNav = document.getElementById('mobile-nav');

        if (mobileMenuToggle && mobileNav) {
            mobileMenuToggle.addEventListener('click', () => {
                const isActive = mobileNav.classList.contains('active');

                if (isActive) {
                    this.closeMobileMenu();
                } else {
                    this.openMobileMenu();
                }
            });

            // Close mobile menu when clicking on links
            const mobileNavLinks = mobileNav.querySelectorAll('.mobile-nav-link');
            mobileNavLinks.forEach(link => {
                link.addEventListener('click', () => {
                    this.closeMobileMenu();
                });
            });

            // Close mobile menu when clicking outside
            document.addEventListener('click', (e) => {
                if (mobileNav.classList.contains('active') &&
                    !mobileNav.contains(e.target) &&
                    !mobileMenuToggle.contains(e.target)) {
                    this.closeMobileMenu();
                }
            });

            // Close mobile menu on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
                    this.closeMobileMenu();
                    mobileMenuToggle.focus();
                }
            });
        }
    }

    openMobileMenu() {
        const mobileNav = document.getElementById('mobile-nav');
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');

        if (mobileNav && mobileMenuToggle) {
            mobileNav.classList.add('active');
            mobileMenuToggle.classList.add('active');
            document.body.classList.add('mobile-nav-visible');

            // Focus first menu item for accessibility
            const firstLink = mobileNav.querySelector('.mobile-nav-link');
            if (firstLink) {
                setTimeout(() => firstLink.focus(), 100);
            }
        }
    }

    closeMobileMenu() {
        const mobileNav = document.getElementById('mobile-nav');
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');

        if (mobileNav && mobileMenuToggle) {
            mobileNav.classList.remove('active');
            mobileMenuToggle.classList.remove('active');
            document.body.classList.remove('mobile-nav-visible');
        }
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav a');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const viewId = link.getAttribute('href').substring(1);
                this.showView(viewId);
            });
        });
    }

    showView(viewId) {
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active');
            this.renderView(viewId);
        }
    }

    renderView(viewId) {
        switch (viewId) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'users':
                this.renderUsers();
                break;
            case 'organizations':
                this.renderOrganizations();
                break;
            case 'processes':
                this.renderProcesses();
                break;
            case 'projects':
                this.renderProjects();
                break;
        }
    }

    renderDashboard() {
        const activeProjects = Array.from(this.projects.values()).filter(p => p.status === 'running').length;
        const processTemplates = Array.from(this.processes.values()).filter(p => p.isTemplate).length;
        const usersCount = this.users.size;

        document.getElementById('active-projects-count').textContent = activeProjects;
        document.getElementById('process-templates-count').textContent = processTemplates;
        document.getElementById('users-count').textContent = usersCount;
    }

    renderUsers() {
        const container = document.getElementById('users-list');
        if (!container) return;

        container.innerHTML = '';

        if (this.users.size === 0) {
            container.innerHTML = '<p>No users found. Create your first user!</p>';
            return;
        }

        this.users.forEach(user => {
            const userCard = this.createUserCard(user);
            container.appendChild(userCard);
        });
    }

    renderOrganizations() {
        const container = document.getElementById('organizations-list');
        if (!container) return;

        container.innerHTML = '';

        if (this.organizations.size === 0) {
            container.innerHTML = '<p>No organizations found. Create your first organization!</p>';
            return;
        }

        this.organizations.forEach(org => {
            const orgCard = this.createOrgCard(org);
            container.appendChild(orgCard);
        });
    }

    renderProcesses() {
        const container = document.getElementById('processes-list');
        if (!container) return;

        container.innerHTML = '';

        if (this.processes.size === 0) {
            container.innerHTML = '<p>No process templates found. Create your first process!</p>';
            return;
        }

        this.processes.forEach(process => {
            const processCard = this.createProcessCard(process);
            container.appendChild(processCard);
        });
    }

    renderProjects() {
        const container = document.getElementById('projects-list');
        if (!container) return;

        container.innerHTML = '';

        if (this.projects.size === 0) {
            container.innerHTML = '<p>No projects found. Execute a process to create your first project!</p>';
            return;
        }

        this.projects.forEach(project => {
            const projectCard = this.createProjectCard(project);
            container.appendChild(projectCard);
        });
    }

    createUserCard(user) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-header">
                <h3 class="card-title">${user.getFullName() || user.username}</h3>
                <div class="card-actions">
                    <span class="status-badge ${user.isActive ? 'active' : 'inactive'}">
                        ${user.isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </div>
            <div class="card-content">
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Role:</strong> ${user.role}</p>
                <p><strong>Created:</strong> ${new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
        `;
        return card;
    }

    createOrgCard(org) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-header">
                <h3 class="card-title">${org.name}</h3>
                <div class="card-actions">
                    <span class="status-badge ${org.isActive ? 'active' : 'inactive'}">
                        ${org.isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </div>
            <div class="card-content">
                <p>${org.description}</p>
                <p><strong>Users:</strong> ${org.getUserCount()}</p>
                <p><strong>Admins:</strong> ${org.getAdminCount()}</p>
                <p><strong>Created:</strong> ${new Date(org.createdAt).toLocaleDateString()}</p>
            </div>
        `;
        return card;
    }

    createProcessCard(process) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-header">
                <h3 class="card-title">${process.name}</h3>
                <div class="card-actions">
                    <button class="btn btn-primary" onclick="app.executeProcess('${process.id}')">Execute</button>
                    <span class="status-badge ${process.isActive ? 'active' : 'inactive'}">
                        ${process.isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </div>
            <div class="card-content">
                <p>${process.description}</p>
                <p><strong>Nodes:</strong> ${process.nodes.length}</p>
                <p><strong>Edges:</strong> ${process.edges.length}</p>
                <p><strong>Version:</strong> ${process.version}</p>
                <p><strong>Created:</strong> ${new Date(process.createdAt).toLocaleDateString()}</p>
            </div>
        `;
        return card;
    }

    createProjectCard(project) {
        const progress = project.getProgress();
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-header">
                <h3 class="card-title">${project.name}</h3>
                <div class="card-actions">
                    <span class="status-badge ${project.status}">${project.status}</span>
                </div>
            </div>
            <div class="card-content">
                <p>${project.description}</p>
                <p><strong>Progress:</strong> ${progress.percentage}% (${progress.completedTasks}/${progress.totalTasks} tasks)</p>
                <p><strong>Owner:</strong> ${this.getUserName(project.ownerId)}</p>
                <p><strong>Started:</strong> ${project.startedAt ? new Date(project.startedAt).toLocaleDateString() : 'Not started'}</p>
                <div style="background: #f0f0f0; border-radius: 10px; height: 10px; margin: 10px 0;">
                    <div style="background: #3498db; height: 100%; border-radius: 10px; width: ${progress.percentage}%;"></div>
                </div>
            </div>
        `;
        return card;
    }

    getUserName(userId) {
        const user = this.users.get(userId);
        return user ? user.getFullName() || user.username : 'Unknown';
    }

    executeProcess(processId) {
        const process = this.processes.get(processId);
        if (!process) return;

        const project = new Project({
            name: `${process.name} - ${new Date().toLocaleDateString()}`,
            description: `Execution of ${process.name}`,
            processId: process.id,
            ownerId: this.currentUser?.id,
            organizationId: process.organizationId
        });

        this.projects.set(project.id, project);
        this.saveToStorage();
        this.showView('projects');
    }

    connectWebSocket() {
        try {
            this.websocket = new WebSocket('ws://localhost:8080');

            this.websocket.onopen = () => {
                console.log('WebSocket connected');
            };

            this.websocket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            };

            this.websocket.onclose = () => {
                console.log('WebSocket disconnected');
                setTimeout(() => this.connectWebSocket(), 5000);
            };

            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
        }
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'user_update':
                this.handleUserUpdate(data.payload);
                break;
            case 'project_update':
                this.handleProjectUpdate(data.payload);
                break;
            case 'process_update':
                this.handleProcessUpdate(data.payload);
                break;
        }
    }

    handleUserUpdate(userData) {
        const user = User.fromJSON(userData);
        this.users.set(user.id, user);
        this.saveToStorage();
        this.render();
    }

    handleProjectUpdate(projectData) {
        const project = Project.fromJSON(projectData);
        this.projects.set(project.id, project);
        this.saveToStorage();
        this.render();
    }

    handleProcessUpdate(processData) {
        const process = Process.fromJSON(processData);
        this.processes.set(process.id, process);
        this.saveToStorage();
        this.render();
    }

    render() {
        // Only render main app if user is authenticated
        if (this.authComponent && this.authComponent.isUserLoggedIn()) {
            this.currentUser = this.authComponent.getCurrentUser();
            const activeView = document.querySelector('.view.active');
            if (activeView) {
                this.renderView(activeView.id);
            } else {
                this.showView('dashboard');
            }
        }
    }

    showCreateUserModal() {
        console.log('Create user modal - to be implemented');
    }

    showCreateOrgModal() {
        console.log('Create organization modal - to be implemented');
    }

    showCreateProcessModal() {
        console.log('Create process modal - to be implemented');
    }
}

const app = new App();
window.app = app;