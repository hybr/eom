export default class Workers {
    constructor(params = {}) {
        this.params = params;
    }

    async render(container) {
        container.innerHTML = `
            <div class="workers-page">
                <div class="page-header">
                    <h2>Workers</h2>
                    <button class="btn btn-primary" id="invite-worker-btn">Invite Worker</button>
                </div>

                <div class="workers-filters">
                    <select id="role-filter" class="filter-select">
                        <option value="">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="worker">Worker</option>
                    </select>

                    <select id="status-filter" class="filter-select">
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>

                    <input type="text" id="search-workers" placeholder="Search workers..." class="search-input">
                </div>

                <div class="workers-list">
                    <div class="worker-card">
                        <div class="worker-avatar">
                            <img src="/assets/default-avatar.svg" alt="Worker Avatar">
                        </div>
                        <div class="worker-info">
                            <h4>John Doe</h4>
                            <p>Senior Developer</p>
                            <span class="worker-email">john.doe@company.com</span>
                        </div>
                        <div class="worker-status">
                            <span class="status-badge active">Active</span>
                        </div>
                        <div class="worker-actions">
                            <button class="btn btn-small">Edit</button>
                            <button class="btn btn-small btn-outline">Remove</button>
                        </div>
                    </div>

                    <div class="worker-card">
                        <div class="worker-avatar">
                            <img src="/assets/default-avatar.svg" alt="Worker Avatar">
                        </div>
                        <div class="worker-info">
                            <h4>Jane Smith</h4>
                            <p>Project Manager</p>
                            <span class="worker-email">jane.smith@company.com</span>
                        </div>
                        <div class="worker-status">
                            <span class="status-badge active">Active</span>
                        </div>
                        <div class="worker-actions">
                            <button class="btn btn-small">Edit</button>
                            <button class="btn btn-small btn-outline">Remove</button>
                        </div>
                    </div>

                    <div class="worker-card">
                        <div class="worker-avatar">
                            <img src="/assets/default-avatar.svg" alt="Worker Avatar">
                        </div>
                        <div class="worker-info">
                            <h4>Mike Johnson</h4>
                            <p>Designer</p>
                            <span class="worker-email">mike.johnson@company.com</span>
                        </div>
                        <div class="worker-status">
                            <span class="status-badge inactive">Inactive</span>
                        </div>
                        <div class="worker-actions">
                            <button class="btn btn-small">Edit</button>
                            <button class="btn btn-small btn-outline">Remove</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners(container);
    }

    setupEventListeners(container) {
        const inviteBtn = container.querySelector('#invite-worker-btn');
        const searchInput = container.querySelector('#search-workers');
        const roleFilter = container.querySelector('#role-filter');
        const statusFilter = container.querySelector('#status-filter');

        if (inviteBtn) {
            inviteBtn.addEventListener('click', () => {
                this.showInviteWorkerModal();
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.filterWorkers();
            });
        }

        if (roleFilter) {
            roleFilter.addEventListener('change', () => {
                this.filterWorkers();
            });
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.filterWorkers();
            });
        }
    }

    showInviteWorkerModal() {
        console.log('Invite worker modal');
    }

    filterWorkers() {
        console.log('Filter workers');
    }
}