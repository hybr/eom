export default class Organization {
    constructor({
        id = null,
        name = '',
        display_name = '',
        description = '',
        website_url = '',
        logo_url = '',
        primary_color = '#1976d2',
        secondary_color = '#dc004e',
        industry = '',
        size = '',
        headquarters_address = '',
        phone_number = '',
        email_address = '',
        tax_id = '',
        is_active = true,
        subdomain = '',
        custom_domain = '',
        subscription_plan = 'free',
        subscription_expires_at = null,
        created_by = null,
        created_at = null,
        updated_at = null
    } = {}) {
        this.id = id || `O_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.name = name;
        this.display_name = display_name || name;
        this.description = description;
        this.website_url = website_url;
        this.logo_url = logo_url;
        this.primary_color = primary_color;
        this.secondary_color = secondary_color;
        this.industry = industry;
        this.size = size;
        this.headquarters_address = headquarters_address;
        this.phone_number = phone_number;
        this.email_address = email_address;
        this.tax_id = tax_id;
        this.is_active = is_active;
        this.subdomain = subdomain || this.generateSubdomain(name);
        this.custom_domain = custom_domain;
        this.subscription_plan = subscription_plan;
        this.subscription_expires_at = subscription_expires_at;
        this.created_by = created_by;
        this.created_at = created_at || new Date().toISOString();
        this.updated_at = updated_at || new Date().toISOString();
    }

    static schema() {
        return {
            table: 'organizations',
            columns: {
                id: 'TEXT PRIMARY KEY',
                name: 'TEXT NOT NULL',
                display_name: 'TEXT NOT NULL',
                description: 'TEXT',
                website_url: 'TEXT',
                logo_url: 'TEXT',
                primary_color: 'TEXT DEFAULT "#1976d2"',
                secondary_color: 'TEXT DEFAULT "#dc004e"',
                industry: 'TEXT',
                size: 'TEXT',
                headquarters_address: 'TEXT',
                phone_number: 'TEXT',
                email_address: 'TEXT',
                tax_id: 'TEXT',
                is_active: 'BOOLEAN DEFAULT 1',
                subdomain: 'TEXT UNIQUE',
                custom_domain: 'TEXT',
                subscription_plan: 'TEXT DEFAULT "free"',
                subscription_expires_at: 'DATETIME',
                created_by: 'TEXT',
                created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
                updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
            },
            indexes: [
                'CREATE INDEX idx_organization_name ON organizations(name)',
                'CREATE INDEX idx_organization_subdomain ON organizations(subdomain)',
                'CREATE INDEX idx_organization_domain ON organizations(custom_domain)',
                'CREATE INDEX idx_organization_created_by ON organizations(created_by)'
            ]
        };
    }

    validate() {
        const errors = [];

        if (!this.name?.trim()) {
            errors.push('Organization name is required');
        }

        if (!this.display_name?.trim()) {
            errors.push('Display name is required');
        }

        if (this.website_url && !this.isValidUrl(this.website_url)) {
            errors.push('Invalid website URL');
        }

        if (this.logo_url && !this.isValidUrl(this.logo_url)) {
            errors.push('Invalid logo URL');
        }

        if (this.email_address && !this.isValidEmail(this.email_address)) {
            errors.push('Invalid email address');
        }

        if (this.subdomain && !this.isValidSubdomain(this.subdomain)) {
            errors.push('Invalid subdomain format');
        }

        if (this.custom_domain && !this.isValidDomain(this.custom_domain)) {
            errors.push('Invalid custom domain');
        }

        if (!this.isValidColor(this.primary_color)) {
            errors.push('Invalid primary color format');
        }

        if (!this.isValidColor(this.secondary_color)) {
            errors.push('Invalid secondary color format');
        }

        return errors;
    }

    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidSubdomain(subdomain) {
        const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
        return subdomain.length >= 3 && subdomain.length <= 63 && subdomainRegex.test(subdomain);
    }

    isValidDomain(domain) {
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
        return domainRegex.test(domain);
    }

    isValidColor(color) {
        const hexRegex = /^#[0-9A-F]{6}$/i;
        return hexRegex.test(color);
    }

    generateSubdomain(name) {
        if (!name) return '';

        return name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 63);
    }

    getUrl() {
        if (this.custom_domain) {
            return `https://${this.custom_domain}`;
        }
        if (this.subdomain) {
            return `https://${this.subdomain}.v4l.app`;
        }
        return null;
    }

    isSubscriptionActive() {
        if (!this.subscription_expires_at) {
            return this.subscription_plan === 'free';
        }
        return new Date(this.subscription_expires_at) > new Date();
    }

    getSubscriptionStatus() {
        if (this.subscription_plan === 'free') {
            return 'free';
        }

        if (!this.subscription_expires_at) {
            return 'unknown';
        }

        const expiresAt = new Date(this.subscription_expires_at);
        const now = new Date();

        if (expiresAt > now) {
            const daysUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
            if (daysUntilExpiry <= 7) {
                return 'expiring_soon';
            }
            return 'active';
        }

        return 'expired';
    }

    getFeatures() {
        const features = {
            free: {
                maxMembers: 5,
                maxProjects: 3,
                storage: '1GB',
                support: 'community'
            },
            basic: {
                maxMembers: 25,
                maxProjects: 10,
                storage: '10GB',
                support: 'email'
            },
            pro: {
                maxMembers: 100,
                maxProjects: 50,
                storage: '100GB',
                support: 'priority'
            },
            enterprise: {
                maxMembers: -1, // unlimited
                maxProjects: -1, // unlimited
                storage: 'unlimited',
                support: 'dedicated'
            }
        };

        return features[this.subscription_plan] || features.free;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            display_name: this.display_name,
            description: this.description,
            website_url: this.website_url,
            logo_url: this.logo_url,
            primary_color: this.primary_color,
            secondary_color: this.secondary_color,
            industry: this.industry,
            size: this.size,
            headquarters_address: this.headquarters_address,
            phone_number: this.phone_number,
            email_address: this.email_address,
            tax_id: this.tax_id,
            is_active: this.is_active,
            subdomain: this.subdomain,
            custom_domain: this.custom_domain,
            subscription_plan: this.subscription_plan,
            subscription_expires_at: this.subscription_expires_at,
            created_by: this.created_by,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    static fromJSON(obj) {
        return new Organization(obj);
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

    clone() {
        return Organization.fromJSON(this.toJSON());
    }
}