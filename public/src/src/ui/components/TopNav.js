export default class TopNav {
    constructor() {
        this.currentUser = null;
        this.organizations = [];
        this.currentOrganization = null;
        this.isInitialized = false;
    }

    init(user, organizations) {
        this.currentUser = user;
        this.organizations = organizations;

        if (!this.isInitialized) {
            this.setupEventListeners();
            this.isInitialized = true;
        }

        this.render();
    }

    setupEventListeners() {
        // Organization selector
        const orgSelector = document.getElementById('org-selector');
        if (orgSelector) {
            orgSelector.addEventListener('change', (e) => {
                const selectedOrgId = e.target.value;
                const organization = this.organizations.find(org => org.id === selectedOrgId);

                if (organization && window.app) {
                    window.app.emit('organizationSelected', organization);
                }
            });
        }

        // Organization logo button - show org modal
        const orgLogoBtn = document.getElementById('org-logo-btn');
        if (orgLogoBtn) {
            orgLogoBtn.addEventListener('click', () => {
                this.showOrganizationModal();
            });
        }

        // User menu toggle
        const userMenuBtn = document.getElementById('user-menu-btn');
        if (userMenuBtn) {
            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleUserMenu();
            });
        }

        // Close user menu when clicking outside
        document.addEventListener('click', () => {
            this.closeUserMenu();
        });

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (window.app && window.app.getAuth()) {
                    window.app.getAuth().signOut();
                }
            });
        }
    }

    render() {
        this.updateUserInfo();
        this.updateOrganizationSelector();
    }

    updateUserInfo() {
        if (!this.currentUser) return;

        const userAvatar = document.getElementById('user-avatar');
        const userName = document.getElementById('user-name');

        if (userAvatar) {
            userAvatar.src = this.currentUser.avatar_url || '/assets/default-avatar.svg';
            userAvatar.alt = this.currentUser.getDisplayName();
        }

        if (userName) {
            userName.textContent = this.currentUser.getDisplayName();
        }
    }

    updateOrganizationSelector() {
        const orgSelector = document.getElementById('org-selector');
        if (!orgSelector) return;

        // Clear existing options
        orgSelector.innerHTML = '<option value="">Select Organization</option>';

        // Add organization options
        this.organizations.forEach(org => {
            const option = document.createElement('option');
            option.value = org.id;
            option.textContent = org.display_name || org.name;
            orgSelector.appendChild(option);
        });

        // Select current organization if set
        if (this.currentOrganization) {
            orgSelector.value = this.currentOrganization.id;
        }
    }

    setCurrentOrganization(organization) {
        this.currentOrganization = organization;

        // Update organization selector
        const orgSelector = document.getElementById('org-selector');
        if (orgSelector) {
            orgSelector.value = organization.id;
        }

        // Update organization logo
        const orgLogo = document.getElementById('org-logo');
        if (orgLogo) {
            orgLogo.src = organization.logo_url || '/assets/default-org.svg';
            orgLogo.alt = organization.display_name || organization.name;
        }

        // Update page colors based on organization theme
        this.applyOrganizationTheme(organization);
    }

    applyOrganizationTheme(organization) {
        const root = document.documentElement;

        if (organization.primary_color) {
            root.style.setProperty('--color-primary', organization.primary_color);
        }

        if (organization.secondary_color) {
            root.style.setProperty('--color-secondary', organization.secondary_color);
        }
    }

    showOrganizationModal() {
        const modal = document.getElementById('org-modal');
        if (!modal) return;

        modal.classList.remove('hidden');
        this.renderOrganizationList();

        // Setup close modal handlers
        const closeBtn = document.getElementById('close-org-modal');
        if (closeBtn) {
            closeBtn.onclick = () => this.hideOrganizationModal();
        }

        modal.onclick = (e) => {
            if (e.target === modal) {
                this.hideOrganizationModal();
            }
        };
    }

    hideOrganizationModal() {
        const modal = document.getElementById('org-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    renderOrganizationList() {
        const orgList = document.getElementById('org-list');
        if (!orgList) return;

        orgList.innerHTML = '';

        this.organizations.forEach(org => {
            const orgCard = document.createElement('a');
            orgCard.className = 'org-card';
            orgCard.href = '#';
            orgCard.onclick = (e) => {
                e.preventDefault();
                this.selectOrganization(org);
                this.hideOrganizationModal();
            };

            orgCard.innerHTML = `
                <div class="org-card-logo">
                    <img src="${org.logo_url || '/assets/default-org.svg'}" alt="${org.display_name || org.name}">
                </div>
                <div class="org-card-info">
                    <h3>${org.display_name || org.name}</h3>
                    <p>${org.description || 'No description'}</p>
                </div>
            `;

            orgList.appendChild(orgCard);
        });

        // Add "Create Organization" option
        const createCard = document.createElement('a');
        createCard.className = 'org-card';
        createCard.href = '#';
        createCard.onclick = (e) => {
            e.preventDefault();
            this.showCreateOrganizationForm();
        };

        createCard.innerHTML = `
            <div class="org-card-logo">
                <span style="font-size: 24px;">+</span>
            </div>
            <div class="org-card-info">
                <h3>Create Organization</h3>
                <p>Start a new organization</p>
            </div>
        `;

        orgList.appendChild(createCard);
    }

    selectOrganization(organization) {
        if (window.app) {
            window.app.emit('organizationSelected', organization);
        }
    }

    showCreateOrganizationForm() {
        // TODO: Implement create organization form
        alert('Create organization feature coming soon!');
    }

    toggleUserMenu() {
        const dropdown = document.getElementById('user-menu-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('hidden');
        }
    }

    closeUserMenu() {
        const dropdown = document.getElementById('user-menu-dropdown');
        if (dropdown) {
            dropdown.classList.add('hidden');
        }
    }
}