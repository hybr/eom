export default class Dashboard {
    constructor(params = {}) {
        this.params = params;
        this.organization = null;
        this.stats = {};
    }

    async render(container) {
        this.organization = window.app?.getCurrentOrganization();

        if (!this.organization) {
            container.innerHTML = this.getNoOrganizationHTML();
            return;
        }

        await this.loadStats();

        container.innerHTML = this.getHTML();
        this.setupEventListeners();
    }

    async loadStats() {
        try {
            const db = window.app?.getDatabase();
            if (!db) return;

            // Load organization statistics
            this.stats = {
                totalMembers: await this.getTotalMembers(),
                activeProjects: await this.getActiveProjects(),
                completedTasks: await this.getCompletedTasks(),
                recentActivity: await this.getRecentActivity()
            };

        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            this.stats = {};
        }
    }

    async getTotalMembers() {
        const db = window.app?.getDatabase();
        if (!db || !this.organization) return 0;

        try {
            const members = await db.findMany('organization_members', {
                organization_id: this.organization.id,
                status: 'active'
            });
            return members.length;
        } catch (error) {
            console.error('Error getting total members:', error);
            return 0;
        }
    }

    async getActiveProjects() {
        const db = window.app?.getDatabase();
        if (!db || !this.organization) return 0;

        try {
            const projects = await db.findMany('project_instances', {
                organization_id: this.organization.id,
                status: 'active'
            });
            return projects.length;
        } catch (error) {
            console.error('Error getting active projects:', error);
            return 0;
        }
    }

    async getCompletedTasks() {
        const db = window.app?.getDatabase();
        if (!db || !this.organization) return 0;

        try {
            const sql = `
                SELECT COUNT(*) as count
                FROM task_instances ti
                INNER JOIN project_instances pi ON ti.project_instance_id = pi.id
                WHERE pi.organization_id = ? AND ti.status = 'completed'
            `;
            const result = await db.query(sql, [this.organization.id]);
            return result.length > 0 ? result[0].count : 0;
        } catch (error) {
            console.error('Error getting completed tasks:', error);
            return 0;
        }
    }

    async getRecentActivity() {
        // TODO: Implement recent activity loading
        return [
            {
                id: 1,
                type: 'project_started',
                message: 'Project "Customer Onboarding" started',
                user: 'John Doe',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 2,
                type: 'task_completed',
                message: 'Task "Review documents" completed',
                user: 'Jane Smith',
                timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 3,
                type: 'member_joined',
                message: 'Alex Johnson joined the organization',
                user: 'System',
                timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
            }
        ];
    }

    getHTML() {
        return `
            <div class="dashboard">
                <div class="page-header">
                    <h1 class="page-title">Dashboard</h1>
                    <p class="page-subtitle">Welcome to ${this.organization.display_name || this.organization.name}</p>
                    <div class="page-actions">
                        <button class="btn btn-primary" id="start-project-btn">Start Project</button>
                        <button class="btn btn-outline" id="create-procedure-btn">Create Procedure</button>
                    </div>
                </div>

                <div class="dashboard-grid">
                    ${this.getStatsWidget()}
                    ${this.getQuickActionsWidget()}
                    ${this.getRecentActivityWidget()}
                    ${this.getActiveProjectsWidget()}
                </div>
            </div>
        `;
    }

    getStatsWidget() {
        return `
            <div class="widget">
                <div class="widget-header">
                    <h3 class="widget-title">Organization Overview</h3>
                </div>
                <div class="widget-body">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="stat-item">
                            <div class="stat-value">${this.stats.totalMembers || 0}</div>
                            <div class="stat-label">Total Members</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${this.stats.activeProjects || 0}</div>
                            <div class="stat-label">Active Projects</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${this.stats.completedTasks || 0}</div>
                            <div class="stat-label">Completed Tasks</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${this.getSubscriptionStatus()}</div>
                            <div class="stat-label">Subscription</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getQuickActionsWidget() {
        return `
            <div class="widget">
                <div class="widget-header">
                    <h3 class="widget-title">Quick Actions</h3>
                </div>
                <div class="widget-body">
                    <div class="quick-actions">
                        <button class="quick-action-btn" data-action="invite-member">
                            <span class="action-icon">👥</span>
                            <span class="action-label">Invite Member</span>
                        </button>
                        <button class="quick-action-btn" data-action="start-project">
                            <span class="action-icon">🚀</span>
                            <span class="action-label">Start Project</span>
                        </button>
                        <button class="quick-action-btn" data-action="view-market">
                            <span class="action-icon">🏪</span>
                            <span class="action-label">View Market</span>
                        </button>
                        <button class="quick-action-btn" data-action="view-analytics">
                            <span class="action-icon">📊</span>
                            <span class="action-label">Analytics</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getRecentActivityWidget() {
        const activities = this.stats.recentActivity || [];

        return `
            <div class="widget">
                <div class="widget-header">
                    <h3 class="widget-title">Recent Activity</h3>
                    <a href="/notifications" class="btn btn-sm btn-outline">View All</a>
                </div>
                <div class="widget-body">
                    ${activities.length > 0 ? `
                        <div class="activity-list">
                            ${activities.map(activity => `
                                <div class="activity-item">
                                    <div class="activity-content">
                                        <div class="activity-message">${activity.message}</div>
                                        <div class="activity-meta">
                                            <span class="activity-user">${activity.user}</span>
                                            <span class="activity-time">${this.formatTimeAgo(activity.timestamp)}</span>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="empty-state">
                            <div class="empty-state-icon">📭</div>
                            <h3>No recent activity</h3>
                            <p>Start a project or invite members to see activity here.</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    getActiveProjectsWidget() {
        return `
            <div class="widget">
                <div class="widget-header">
                    <h3 class="widget-title">Active Projects</h3>
                    <a href="/projects" class="btn btn-sm btn-outline">View All</a>
                </div>
                <div class="widget-body">
                    <div class="empty-state">
                        <div class="empty-state-icon">📂</div>
                        <h3>No active projects</h3>
                        <p>Start your first project from a procedure template.</p>
                        <button class="btn btn-primary" id="start-first-project-btn">Start Project</button>
                    </div>
                </div>
            </div>
        `;
    }

    getNoOrganizationHTML() {
        return `
            <div class="dashboard">
                <div class="empty-state">
                    <div class="empty-state-icon">🏢</div>
                    <h3>No Organization Selected</h3>
                    <p>Please select an organization to view the dashboard.</p>
                    <button class="btn btn-primary" id="create-org-btn">Create Organization</button>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Quick action buttons
        const quickActionBtns = document.querySelectorAll('.quick-action-btn');
        quickActionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.handleQuickAction(action);
            });
        });

        // Page action buttons
        const startProjectBtn = document.getElementById('start-project-btn');
        if (startProjectBtn) {
            startProjectBtn.addEventListener('click', () => {
                this.handleQuickAction('start-project');
            });
        }

        const createProcedureBtn = document.getElementById('create-procedure-btn');
        if (createProcedureBtn) {
            createProcedureBtn.addEventListener('click', () => {
                window.app?.router?.navigate('/procedures');
            });
        }

        const startFirstProjectBtn = document.getElementById('start-first-project-btn');
        if (startFirstProjectBtn) {
            startFirstProjectBtn.addEventListener('click', () => {
                this.handleQuickAction('start-project');
            });
        }

        const createOrgBtn = document.getElementById('create-org-btn');
        if (createOrgBtn) {
            createOrgBtn.addEventListener('click', () => {
                this.handleCreateOrganization();
            });
        }
    }

    handleQuickAction(action) {
        switch (action) {
            case 'invite-member':
                // TODO: Implement invite member functionality
                alert('Invite member feature coming soon!');
                break;

            case 'start-project':
                window.app?.router?.navigate('/procedures');
                break;

            case 'view-market':
                window.app?.router?.navigate('/market');
                break;

            case 'view-analytics':
                window.app?.router?.navigate('/analytics');
                break;

            default:
                console.warn('Unknown quick action:', action);
        }
    }

    handleCreateOrganization() {
        // TODO: Implement create organization functionality
        alert('Create organization feature coming soon!');
    }

    getSubscriptionStatus() {
        if (!this.organization) return 'Unknown';

        const status = this.organization.getSubscriptionStatus();
        const statusLabels = {
            free: 'Free',
            active: 'Active',
            expiring_soon: 'Expiring',
            expired: 'Expired',
            unknown: 'Unknown'
        };

        return statusLabels[status] || 'Unknown';
    }

    formatTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInSeconds = Math.floor((now - time) / 1000);

        if (diffInSeconds < 60) {
            return 'Just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} hour${hours === 1 ? '' : 's'} ago`;
        } else {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} day${days === 1 ? '' : 's'} ago`;
        }
    }
}

// Add CSS for dashboard-specific styles
const dashboardStyles = `
    .stat-item {
        text-align: center;
        padding: 1rem;
    }

    .stat-value {
        font-size: 2rem;
        font-weight: bold;
        color: var(--color-primary);
        margin-bottom: 0.5rem;
    }

    .stat-label {
        font-size: 0.875rem;
        color: var(--color-text-secondary);
    }

    .quick-actions {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
    }

    .quick-action-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 1.5rem;
        border: 1px solid var(--color-border);
        border-radius: var(--border-radius-lg);
        background: var(--color-background);
        cursor: pointer;
        transition: all var(--transition-fast);
        text-decoration: none;
        color: var(--color-text-primary);
    }

    .quick-action-btn:hover {
        border-color: var(--color-primary);
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
    }

    .action-icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
    }

    .action-label {
        font-size: 0.875rem;
        font-weight: 500;
    }

    .activity-list {
        max-height: 300px;
        overflow-y: auto;
    }

    .activity-item {
        padding: 1rem 0;
        border-bottom: 1px solid var(--color-border);
    }

    .activity-item:last-child {
        border-bottom: none;
    }

    .activity-message {
        font-weight: 500;
        margin-bottom: 0.25rem;
    }

    .activity-meta {
        font-size: 0.75rem;
        color: var(--color-text-secondary);
    }

    .activity-user {
        margin-right: 0.5rem;
    }

    @media (max-width: 768px) {
        .quick-actions {
            grid-template-columns: 1fr;
        }

        .dashboard-grid {
            grid-template-columns: 1fr;
        }
    }
`;

// Inject styles
if (!document.getElementById('dashboard-styles')) {
    const style = document.createElement('style');
    style.id = 'dashboard-styles';
    style.textContent = dashboardStyles;
    document.head.appendChild(style);
}