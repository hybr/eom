export default class OrganizationMember {
    constructor({
        id = null,
        organization_id = null,
        person_id = null,
        roles = [],
        permissions = [],
        status = 'active',
        invited_by = null,
        invited_at = null,
        joined_at = null,
        left_at = null,
        created_at = null,
        updated_at = null
    } = {}) {
        this.id = id || `OM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.organization_id = organization_id;
        this.person_id = person_id;
        this.roles = Array.isArray(roles) ? roles : [];
        this.permissions = Array.isArray(permissions) ? permissions : [];
        this.status = status;
        this.invited_by = invited_by;
        this.invited_at = invited_at;
        this.joined_at = joined_at || (status === 'active' ? new Date().toISOString() : null);
        this.left_at = left_at;
        this.created_at = created_at || new Date().toISOString();
        this.updated_at = updated_at || new Date().toISOString();
    }

    static schema() {
        return {
            table: 'organization_members',
            columns: {
                id: 'TEXT PRIMARY KEY',
                organization_id: 'TEXT NOT NULL',
                person_id: 'TEXT NOT NULL',
                roles: 'TEXT', // JSON array
                permissions: 'TEXT', // JSON array
                status: 'TEXT DEFAULT "pending"',
                invited_by: 'TEXT',
                invited_at: 'DATETIME',
                joined_at: 'DATETIME',
                left_at: 'DATETIME',
                created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
                updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
            },
            indexes: [
                'CREATE INDEX idx_org_member_org_id ON organization_members(organization_id)',
                'CREATE INDEX idx_org_member_person_id ON organization_members(person_id)',
                'CREATE INDEX idx_org_member_status ON organization_members(status)',
                'CREATE UNIQUE INDEX idx_org_member_unique ON organization_members(organization_id, person_id)'
            ],
            foreignKeys: [
                'FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE',
                'FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE',
                'FOREIGN KEY (invited_by) REFERENCES persons(id) ON DELETE SET NULL'
            ]
        };
    }

    static get ROLES() {
        return {
            CREATOR: 'creator',
            ADMIN: 'admin',
            MANAGER: 'manager',
            WORKER: 'worker',
            VIEWER: 'viewer'
        };
    }

    static get PERMISSIONS() {
        return {
            // Organization management
            ORG_READ: 'org:read',
            ORG_UPDATE: 'org:update',
            ORG_DELETE: 'org:delete',

            // Member management
            MEMBER_READ: 'member:read',
            MEMBER_INVITE: 'member:invite',
            MEMBER_UPDATE: 'member:update',
            MEMBER_REMOVE: 'member:remove',

            // Project management
            PROJECT_READ: 'project:read',
            PROJECT_CREATE: 'project:create',
            PROJECT_UPDATE: 'project:update',
            PROJECT_DELETE: 'project:delete',

            // Procedure management
            PROCEDURE_READ: 'procedure:read',
            PROCEDURE_CREATE: 'procedure:create',
            PROCEDURE_UPDATE: 'procedure:update',
            PROCEDURE_DELETE: 'procedure:delete',
            PROCEDURE_EXECUTE: 'procedure:execute',

            // Worker management
            WORKER_READ: 'worker:read',
            WORKER_CREATE: 'worker:create',
            WORKER_UPDATE: 'worker:update',
            WORKER_DELETE: 'worker:delete',

            // Analytics
            ANALYTICS_READ: 'analytics:read'
        };
    }

    static get STATUS() {
        return {
            PENDING: 'pending',
            ACTIVE: 'active',
            SUSPENDED: 'suspended',
            LEFT: 'left'
        };
    }

    validate() {
        const errors = [];

        if (!this.organization_id?.trim()) {
            errors.push('Organization ID is required');
        }

        if (!this.person_id?.trim()) {
            errors.push('Person ID is required');
        }

        if (!Object.values(OrganizationMember.STATUS).includes(this.status)) {
            errors.push('Invalid status');
        }

        const validRoles = Object.values(OrganizationMember.ROLES);
        const invalidRoles = this.roles.filter(role => !validRoles.includes(role));
        if (invalidRoles.length > 0) {
            errors.push(`Invalid roles: ${invalidRoles.join(', ')}`);
        }

        const validPermissions = Object.values(OrganizationMember.PERMISSIONS);
        const invalidPermissions = this.permissions.filter(perm => !validPermissions.includes(perm));
        if (invalidPermissions.length > 0) {
            errors.push(`Invalid permissions: ${invalidPermissions.join(', ')}`);
        }

        return errors;
    }

    hasRole(role) {
        return this.roles.includes(role);
    }

    hasPermission(permission) {
        return this.permissions.includes(permission) || this.hasRolePermission(permission);
    }

    hasRolePermission(permission) {
        const rolePermissions = {
            [OrganizationMember.ROLES.CREATOR]: Object.values(OrganizationMember.PERMISSIONS),
            [OrganizationMember.ROLES.ADMIN]: [
                OrganizationMember.PERMISSIONS.ORG_READ,
                OrganizationMember.PERMISSIONS.ORG_UPDATE,
                OrganizationMember.PERMISSIONS.MEMBER_READ,
                OrganizationMember.PERMISSIONS.MEMBER_INVITE,
                OrganizationMember.PERMISSIONS.MEMBER_UPDATE,
                OrganizationMember.PERMISSIONS.MEMBER_REMOVE,
                OrganizationMember.PERMISSIONS.PROJECT_READ,
                OrganizationMember.PERMISSIONS.PROJECT_CREATE,
                OrganizationMember.PERMISSIONS.PROJECT_UPDATE,
                OrganizationMember.PERMISSIONS.PROJECT_DELETE,
                OrganizationMember.PERMISSIONS.PROCEDURE_READ,
                OrganizationMember.PERMISSIONS.PROCEDURE_CREATE,
                OrganizationMember.PERMISSIONS.PROCEDURE_UPDATE,
                OrganizationMember.PERMISSIONS.PROCEDURE_DELETE,
                OrganizationMember.PERMISSIONS.PROCEDURE_EXECUTE,
                OrganizationMember.PERMISSIONS.WORKER_READ,
                OrganizationMember.PERMISSIONS.WORKER_CREATE,
                OrganizationMember.PERMISSIONS.WORKER_UPDATE,
                OrganizationMember.PERMISSIONS.WORKER_DELETE,
                OrganizationMember.PERMISSIONS.ANALYTICS_READ
            ],
            [OrganizationMember.ROLES.MANAGER]: [
                OrganizationMember.PERMISSIONS.ORG_READ,
                OrganizationMember.PERMISSIONS.MEMBER_READ,
                OrganizationMember.PERMISSIONS.PROJECT_READ,
                OrganizationMember.PERMISSIONS.PROJECT_CREATE,
                OrganizationMember.PERMISSIONS.PROJECT_UPDATE,
                OrganizationMember.PERMISSIONS.PROCEDURE_READ,
                OrganizationMember.PERMISSIONS.PROCEDURE_EXECUTE,
                OrganizationMember.PERMISSIONS.WORKER_READ,
                OrganizationMember.PERMISSIONS.WORKER_CREATE,
                OrganizationMember.PERMISSIONS.WORKER_UPDATE,
                OrganizationMember.PERMISSIONS.ANALYTICS_READ
            ],
            [OrganizationMember.ROLES.WORKER]: [
                OrganizationMember.PERMISSIONS.ORG_READ,
                OrganizationMember.PERMISSIONS.MEMBER_READ,
                OrganizationMember.PERMISSIONS.PROJECT_READ,
                OrganizationMember.PERMISSIONS.PROCEDURE_READ,
                OrganizationMember.PERMISSIONS.PROCEDURE_EXECUTE,
                OrganizationMember.PERMISSIONS.WORKER_READ
            ],
            [OrganizationMember.ROLES.VIEWER]: [
                OrganizationMember.PERMISSIONS.ORG_READ,
                OrganizationMember.PERMISSIONS.MEMBER_READ,
                OrganizationMember.PERMISSIONS.PROJECT_READ,
                OrganizationMember.PERMISSIONS.PROCEDURE_READ,
                OrganizationMember.PERMISSIONS.WORKER_READ
            ]
        };

        return this.roles.some(role =>
            rolePermissions[role]?.includes(permission)
        );
    }

    addRole(role) {
        if (!this.roles.includes(role) && Object.values(OrganizationMember.ROLES).includes(role)) {
            this.roles.push(role);
            this.updated_at = new Date().toISOString();
        }
        return this;
    }

    removeRole(role) {
        const index = this.roles.indexOf(role);
        if (index > -1) {
            this.roles.splice(index, 1);
            this.updated_at = new Date().toISOString();
        }
        return this;
    }

    addPermission(permission) {
        if (!this.permissions.includes(permission) && Object.values(OrganizationMember.PERMISSIONS).includes(permission)) {
            this.permissions.push(permission);
            this.updated_at = new Date().toISOString();
        }
        return this;
    }

    removePermission(permission) {
        const index = this.permissions.indexOf(permission);
        if (index > -1) {
            this.permissions.splice(index, 1);
            this.updated_at = new Date().toISOString();
        }
        return this;
    }

    activate() {
        this.status = OrganizationMember.STATUS.ACTIVE;
        this.joined_at = new Date().toISOString();
        this.left_at = null;
        this.updated_at = new Date().toISOString();
        return this;
    }

    suspend() {
        this.status = OrganizationMember.STATUS.SUSPENDED;
        this.updated_at = new Date().toISOString();
        return this;
    }

    leave() {
        this.status = OrganizationMember.STATUS.LEFT;
        this.left_at = new Date().toISOString();
        this.updated_at = new Date().toISOString();
        return this;
    }

    toJSON() {
        return {
            id: this.id,
            organization_id: this.organization_id,
            person_id: this.person_id,
            roles: this.roles,
            permissions: this.permissions,
            status: this.status,
            invited_by: this.invited_by,
            invited_at: this.invited_at,
            joined_at: this.joined_at,
            left_at: this.left_at,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    static fromJSON(obj) {
        const member = new OrganizationMember(obj);

        // Parse JSON strings if they exist
        if (typeof obj.roles === 'string') {
            try {
                member.roles = JSON.parse(obj.roles);
            } catch (e) {
                member.roles = [];
            }
        }

        if (typeof obj.permissions === 'string') {
            try {
                member.permissions = JSON.parse(obj.permissions);
            } catch (e) {
                member.permissions = [];
            }
        }

        return member;
    }

    update(data) {
        Object.keys(data).forEach(key => {
            if (key !== 'id' && key !== 'created_at' && this.hasOwnProperty(key)) {
                this[key] = data[key];
            }
        });
        this.updated_at = new Date().toISOString();
        return this;
    }
}