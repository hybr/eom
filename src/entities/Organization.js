class Organization {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.name = data.name || '';
        this.description = data.description || '';
        this.website = data.website || '';
        this.address = data.address || {};
        this.contactEmail = data.contactEmail || '';
        this.contactPhone = data.contactPhone || '';
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.settings = data.settings || {};
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        this.userIds = data.userIds || [];
        this.adminIds = data.adminIds || [];
    }

    generateId() {
        return 'org_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    addUser(userId, role = 'member') {
        if (!this.userIds.includes(userId)) {
            this.userIds.push(userId);
            if ((role === 'admin' || role === 'owner') && !this.adminIds.includes(userId)) {
                this.adminIds.push(userId);
            }
            this.updatedAt = new Date().toISOString();
            return true;
        }
        return false;
    }

    inviteUser(email, role = 'member', invitedBy = null) {
        const invitation = {
            id: this.generateInvitationId(),
            email,
            role,
            invitedBy,
            status: 'pending',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        };

        if (!this.invitations) {
            this.invitations = [];
        }

        // Remove any existing invitation for this email
        this.invitations = this.invitations.filter(inv => inv.email !== email);
        this.invitations.push(invitation);
        this.updatedAt = new Date().toISOString();

        return invitation;
    }

    acceptInvitation(invitationId, userId) {
        if (!this.invitations) {
            this.invitations = [];
        }

        const invitation = this.invitations.find(inv => inv.id === invitationId);
        if (!invitation) {
            throw new Error('Invitation not found');
        }

        if (invitation.status !== 'pending') {
            throw new Error('Invitation already processed');
        }

        if (new Date() > new Date(invitation.expiresAt)) {
            throw new Error('Invitation has expired');
        }

        this.addUser(userId, invitation.role);
        invitation.status = 'accepted';
        invitation.acceptedAt = new Date().toISOString();
        invitation.acceptedBy = userId;
        this.updatedAt = new Date().toISOString();

        return true;
    }

    declineInvitation(invitationId, userId = null) {
        if (!this.invitations) {
            this.invitations = [];
        }

        const invitation = this.invitations.find(inv => inv.id === invitationId);
        if (!invitation) {
            throw new Error('Invitation not found');
        }

        if (invitation.status !== 'pending') {
            throw new Error('Invitation already processed');
        }

        invitation.status = 'declined';
        invitation.declinedAt = new Date().toISOString();
        if (userId) {
            invitation.declinedBy = userId;
        }
        this.updatedAt = new Date().toISOString();

        return true;
    }

    cancelInvitation(invitationId) {
        if (!this.invitations) {
            this.invitations = [];
        }

        const invitationIndex = this.invitations.findIndex(inv => inv.id === invitationId);
        if (invitationIndex === -1) {
            throw new Error('Invitation not found');
        }

        this.invitations.splice(invitationIndex, 1);
        this.updatedAt = new Date().toISOString();

        return true;
    }

    removeUser(userId) {
        const userIndex = this.userIds.indexOf(userId);
        if (userIndex > -1) {
            this.userIds.splice(userIndex, 1);
        }

        const adminIndex = this.adminIds.indexOf(userId);
        if (adminIndex > -1) {
            this.adminIds.splice(adminIndex, 1);
        }

        this.updatedAt = new Date().toISOString();
    }

    promoteToAdmin(userId) {
        if (this.userIds.includes(userId) && !this.adminIds.includes(userId)) {
            this.adminIds.push(userId);
            this.updatedAt = new Date().toISOString();
        }
    }

    demoteFromAdmin(userId) {
        const adminIndex = this.adminIds.indexOf(userId);
        if (adminIndex > -1) {
            this.adminIds.splice(adminIndex, 1);
            this.updatedAt = new Date().toISOString();
        }
    }

    isUserAdmin(userId) {
        return this.adminIds.includes(userId);
    }

    isUserMember(userId) {
        return this.userIds.includes(userId);
    }

    getUserCount() {
        return this.userIds.length;
    }

    getAdminCount() {
        return this.adminIds.length;
    }

    updateSetting(key, value) {
        this.settings[key] = value;
        this.updatedAt = new Date().toISOString();
    }

    getSetting(key, defaultValue = null) {
        return this.settings[key] !== undefined ? this.settings[key] : defaultValue;
    }

    deactivate() {
        this.isActive = false;
        this.updatedAt = new Date().toISOString();
    }

    activate() {
        this.isActive = true;
        this.updatedAt = new Date().toISOString();
    }

    getUserRole(userId) {
        if (!this.isUserMember(userId)) {
            return null;
        }

        if (this.isUserAdmin(userId)) {
            return 'admin';
        }

        return 'member';
    }

    updateUserRole(userId, newRole) {
        if (!this.isUserMember(userId)) {
            throw new Error('User is not a member of this organization');
        }

        if (newRole === 'admin' || newRole === 'owner') {
            if (!this.adminIds.includes(userId)) {
                this.adminIds.push(userId);
            }
        } else {
            this.demoteFromAdmin(userId);
        }

        this.updatedAt = new Date().toISOString();
        return true;
    }

    getUserPermissions(userId) {
        const role = this.getUserRole(userId);
        if (!role) {
            return [];
        }

        const permissions = ['view_organization'];

        if (role === 'admin' || role === 'owner') {
            permissions.push(
                'manage_users',
                'invite_users',
                'edit_organization',
                'manage_processes',
                'manage_projects',
                'view_analytics'
            );
        } else {
            permissions.push(
                'create_processes',
                'execute_processes',
                'view_projects'
            );
        }

        return permissions;
    }

    hasPermission(userId, permission) {
        const permissions = this.getUserPermissions(userId);
        return permissions.includes(permission);
    }

    getInvitations(status = null) {
        if (!this.invitations) {
            return [];
        }

        if (status) {
            return this.invitations.filter(inv => inv.status === status);
        }

        return [...this.invitations];
    }

    getPendingInvitations() {
        return this.getInvitations('pending');
    }

    cleanupExpiredInvitations() {
        if (!this.invitations) {
            return 0;
        }

        const before = this.invitations.length;
        const now = new Date();

        this.invitations = this.invitations.filter(inv => {
            return inv.status !== 'pending' || new Date(inv.expiresAt) > now;
        });

        const removed = before - this.invitations.length;
        if (removed > 0) {
            this.updatedAt = new Date().toISOString();
        }

        return removed;
    }

    generateInvitationId() {
        return 'inv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getStats() {
        return {
            totalUsers: this.getUserCount(),
            admins: this.getAdminCount(),
            members: this.getUserCount() - this.getAdminCount(),
            pendingInvitations: this.getPendingInvitations().length,
            isActive: this.isActive,
            createdAt: this.createdAt
        };
    }

    update(data) {
        const allowedFields = ['name', 'description', 'website', 'address', 'contactEmail', 'contactPhone'];
        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                this[field] = data[field];
            }
        });
        this.updatedAt = new Date().toISOString();
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            website: this.website,
            address: this.address,
            contactEmail: this.contactEmail,
            contactPhone: this.contactPhone,
            isActive: this.isActive,
            settings: { ...this.settings },
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            userIds: [...this.userIds],
            adminIds: [...this.adminIds],
            invitations: this.invitations ? [...this.invitations] : []
        };
    }

    static fromJSON(data) {
        return new Organization(data);
    }
}

export default Organization;