export default class Organization {
    constructor({
        // Core Identity
        id = null,
        name = '',
        legal_name = '',
        tag_line = '',
        description = '',
        mission_statement = '',
        logo_url = '',
        brand_assets_url = '',
        industry_id = null,
        sector = '',
        organization_type = 'private',

        // Ownership & Management
        owner_id = null,
        parent_org_id = null,
        registration_number = '',
        incorporation_number = '',
        tax_id = '',
        gst_number = '',
        pan_number = '',

        // Digital Presence
        sub_domain_to_v4l_app = '',
        website = '',
        social_links = {},
        support_email_address = '',

        // Contact Info
        primary_phone_number = '',
        primary_email_address = '',
        fax_number = '',
        address_line1 = '',
        address_line2 = '',
        city = '',
        state = '',
        postal_code = '',
        country = '',

        // Financial & Ops
        fiscal_year_start_month = 1,
        primary_currency_code = 'USD',
        bank_account_number = '',
        ifsc = '',
        iban = '',
        billing_address_id = null,
        shipping_address_id = null,

        // Regional Settings
        main_time_zone = 'UTC',
        main_locale = 'en_US',
        country_of_incorporation = '',

        // Status & Compliance
        is_active = true,
        status = 'active',
        compliance_certifications = {},
        data_protection_officer_contact = '',

        // Legacy fields for backward compatibility
        display_name = '',
        primary_color = '#1976d2',
        secondary_color = '#dc004e',
        size = '',
        headquarters_address = '',
        phone_number = '',
        email_address = '',
        subdomain = '',
        custom_domain = '',
        subscription_plan = 'free',
        subscription_expires_at = null,

        // Audit / Metadata
        created_by = null,
        updated_by = null,
        created_at = null,
        updated_at = null,
        notes = '',
        internal_comments = ''
    } = {}) {
        this.id = id || `O_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Core Identity
        this.name = name;
        this.legal_name = legal_name || name;
        this.tag_line = tag_line;
        this.description = description;
        this.mission_statement = mission_statement;
        this.logo_url = logo_url;
        this.brand_assets_url = brand_assets_url;
        this.industry_id = industry_id;
        this.sector = sector;
        this.organization_type = organization_type;

        // Ownership & Management
        this.owner_id = owner_id;
        this.parent_org_id = parent_org_id;
        this.registration_number = registration_number;
        this.incorporation_number = incorporation_number;
        this.tax_id = tax_id;
        this.gst_number = gst_number;
        this.pan_number = pan_number;

        // Digital Presence
        this.sub_domain_to_v4l_app = sub_domain_to_v4l_app || subdomain || this.generateSubdomain(name);
        this.website = website || website_url;
        this.social_links = social_links;
        this.support_email_address = support_email_address;

        // Contact Info
        this.primary_phone_number = primary_phone_number || phone_number;
        this.primary_email_address = primary_email_address || email_address;
        this.fax_number = fax_number;
        this.address_line1 = address_line1;
        this.address_line2 = address_line2;
        this.city = city;
        this.state = state;
        this.postal_code = postal_code;
        this.country = country;

        // Financial & Ops
        this.fiscal_year_start_month = fiscal_year_start_month;
        this.primary_currency_code = primary_currency_code;
        this.bank_account_number = bank_account_number;
        this.ifsc = ifsc;
        this.iban = iban;
        this.billing_address_id = billing_address_id;
        this.shipping_address_id = shipping_address_id;

        // Regional Settings
        this.main_time_zone = main_time_zone;
        this.main_locale = main_locale;
        this.country_of_incorporation = country_of_incorporation;

        // Status & Compliance
        this.is_active = is_active;
        this.status = status;
        this.compliance_certifications = compliance_certifications;
        this.data_protection_officer_contact = data_protection_officer_contact;

        // Legacy fields for backward compatibility
        this.display_name = display_name || name;
        this.primary_color = primary_color;
        this.secondary_color = secondary_color;
        this.size = size;
        this.headquarters_address = headquarters_address;
        this.phone_number = phone_number;
        this.email_address = email_address;
        this.subdomain = subdomain || this.sub_domain_to_v4l_app;
        this.custom_domain = custom_domain;
        this.subscription_plan = subscription_plan;
        this.subscription_expires_at = subscription_expires_at;

        // Audit / Metadata
        this.created_by = created_by;
        this.updated_by = updated_by;
        this.created_at = created_at || new Date().toISOString();
        this.updated_at = updated_at || new Date().toISOString();
        this.notes = notes;
        this.internal_comments = internal_comments;
    }

    static schema() {
        return {
            table: 'organizations',
            columns: {
                // Core Identity
                id: 'TEXT PRIMARY KEY',
                name: 'TEXT NOT NULL',
                legal_name: 'TEXT NOT NULL',
                tag_line: 'TEXT',
                description: 'TEXT',
                mission_statement: 'TEXT',
                logo_url: 'TEXT',
                brand_assets_url: 'TEXT',
                industry_id: 'TEXT',
                sector: 'TEXT',
                organization_type: 'TEXT DEFAULT "private"',

                // Ownership & Management
                owner_id: 'TEXT',
                parent_org_id: 'TEXT',
                registration_number: 'TEXT',
                incorporation_number: 'TEXT',
                tax_id: 'TEXT',
                gst_number: 'TEXT',
                pan_number: 'TEXT',

                // Digital Presence
                sub_domain_to_v4l_app: 'TEXT UNIQUE',
                website: 'TEXT',
                social_links: 'TEXT', // JSON string
                support_email_address: 'TEXT',

                // Contact Info
                primary_phone_number: 'TEXT',
                primary_email_address: 'TEXT',
                fax_number: 'TEXT',
                address_line1: 'TEXT',
                address_line2: 'TEXT',
                city: 'TEXT',
                state: 'TEXT',
                postal_code: 'TEXT',
                country: 'TEXT',

                // Financial & Ops
                fiscal_year_start_month: 'INTEGER DEFAULT 1',
                primary_currency_code: 'TEXT DEFAULT "USD"',
                bank_account_number: 'TEXT',
                ifsc: 'TEXT',
                iban: 'TEXT',
                billing_address_id: 'TEXT',
                shipping_address_id: 'TEXT',

                // Regional Settings
                main_time_zone: 'TEXT DEFAULT "UTC"',
                main_locale: 'TEXT DEFAULT "en_US"',
                country_of_incorporation: 'TEXT',

                // Status & Compliance
                is_active: 'BOOLEAN DEFAULT 1',
                status: 'TEXT DEFAULT "active"',
                compliance_certifications: 'TEXT', // JSON string
                data_protection_officer_contact: 'TEXT',

                // Legacy fields for backward compatibility
                display_name: 'TEXT',
                primary_color: 'TEXT DEFAULT "#1976d2"',
                secondary_color: 'TEXT DEFAULT "#dc004e"',
                size: 'TEXT',
                headquarters_address: 'TEXT',
                phone_number: 'TEXT',
                email_address: 'TEXT',
                subdomain: 'TEXT',
                custom_domain: 'TEXT',
                subscription_plan: 'TEXT DEFAULT "free"',
                subscription_expires_at: 'DATETIME',

                // Audit / Metadata
                created_by: 'TEXT',
                updated_by: 'TEXT',
                created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
                updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
                notes: 'TEXT',
                internal_comments: 'TEXT'
            },
            indexes: [
                'CREATE INDEX idx_organization_name ON organizations(name)',
                'CREATE INDEX idx_organization_legal_name ON organizations(legal_name)',
                'CREATE INDEX idx_organization_subdomain ON organizations(sub_domain_to_v4l_app)',
                'CREATE INDEX idx_organization_domain ON organizations(custom_domain)',
                'CREATE INDEX idx_organization_created_by ON organizations(created_by)',
                'CREATE INDEX idx_organization_industry ON organizations(industry_id)',
                'CREATE INDEX idx_organization_owner ON organizations(owner_id)',
                'CREATE INDEX idx_organization_parent ON organizations(parent_org_id)',
                'CREATE INDEX idx_organization_type ON organizations(organization_type)',
                'CREATE INDEX idx_organization_status ON organizations(status)',
                'CREATE INDEX idx_organization_country ON organizations(country)',
                'CREATE INDEX idx_organization_incorporation_country ON organizations(country_of_incorporation)',
                'CREATE INDEX idx_organization_city ON organizations(city)',
                'CREATE INDEX idx_organization_currency ON organizations(primary_currency_code)'
            ],
            foreignKeys: [
                'FOREIGN KEY (industry_id) REFERENCES industry_name(id)',
                'FOREIGN KEY (owner_id) REFERENCES persons(id)',
                'FOREIGN KEY (parent_org_id) REFERENCES organizations(id)',
                'FOREIGN KEY (billing_address_id) REFERENCES addresses(id)',
                'FOREIGN KEY (shipping_address_id) REFERENCES addresses(id)',
                'FOREIGN KEY (created_by) REFERENCES persons(id)',
                'FOREIGN KEY (updated_by) REFERENCES persons(id)'
            ]
        };
    }

    validate() {
        const errors = [];

        // Core Identity validation
        if (!this.name?.trim()) {
            errors.push('Organization name is required');
        }

        if (!this.legal_name?.trim()) {
            errors.push('Legal name is required');
        }

        if (this.website && !this.isValidUrl(this.website)) {
            errors.push('Invalid website URL');
        }

        if (this.logo_url && !this.isValidUrl(this.logo_url)) {
            errors.push('Invalid logo URL');
        }

        if (this.brand_assets_url && !this.isValidUrl(this.brand_assets_url)) {
            errors.push('Invalid brand assets URL');
        }

        if (this.organization_type && !this.isValidOrganizationType(this.organization_type)) {
            errors.push('Invalid organization type');
        }

        // Contact Info validation
        if (this.primary_email_address && !this.isValidEmail(this.primary_email_address)) {
            errors.push('Invalid primary email address');
        }

        if (this.support_email_address && !this.isValidEmail(this.support_email_address)) {
            errors.push('Invalid support email address');
        }

        if (this.primary_phone_number && !this.isValidPhoneNumber(this.primary_phone_number)) {
            errors.push('Invalid primary phone number format');
        }

        // Digital Presence validation
        if (this.sub_domain_to_v4l_app && !this.isValidSubdomain(this.sub_domain_to_v4l_app)) {
            errors.push('Invalid subdomain format');
        }

        if (this.custom_domain && !this.isValidDomain(this.custom_domain)) {
            errors.push('Invalid custom domain');
        }

        // Financial validation
        if (this.fiscal_year_start_month && (this.fiscal_year_start_month < 1 || this.fiscal_year_start_month > 12)) {
            errors.push('Fiscal year start month must be between 1 and 12');
        }

        if (this.primary_currency_code && !this.isValidCurrencyCode(this.primary_currency_code)) {
            errors.push('Invalid currency code (must be ISO 4217 format)');
        }

        // Regional Settings validation
        if (this.main_locale && !this.isValidLocale(this.main_locale)) {
            errors.push('Invalid locale format');
        }

        if (this.country && !this.isValidCountryCode(this.country)) {
            errors.push('Invalid country code');
        }

        if (this.country_of_incorporation && !this.isValidCountryCode(this.country_of_incorporation)) {
            errors.push('Invalid country of incorporation code');
        }

        // Status validation
        if (this.status && !this.isValidStatus(this.status)) {
            errors.push('Invalid status');
        }

        // Legacy field validation
        if (!this.isValidColor(this.primary_color)) {
            errors.push('Invalid primary color format');
        }

        if (!this.isValidColor(this.secondary_color)) {
            errors.push('Invalid secondary color format');
        }

        if (this.email_address && !this.isValidEmail(this.email_address)) {
            errors.push('Invalid legacy email address');
        }

        if (this.subdomain && !this.isValidSubdomain(this.subdomain)) {
            errors.push('Invalid legacy subdomain format');
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

    isValidOrganizationType(type) {
        const validTypes = [
            'non-profit', 'private', 'public', 'government',
            'startup', 'cooperative', 'partnership', 'sole-proprietorship',
            'llc', 'corporation', 'limited-company', 'foundation'
        ];
        return validTypes.includes(type.toLowerCase());
    }

    isValidPhoneNumber(phone) {
        // Basic international phone number validation
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
    }

    isValidCurrencyCode(code) {
        // ISO 4217 currency code validation (3 uppercase letters)
        const currencyRegex = /^[A-Z]{3}$/;
        return currencyRegex.test(code);
    }

    isValidLocale(locale) {
        // Basic locale validation (e.g., en_US, hi_IN, fr_FR)
        const localeRegex = /^[a-z]{2}_[A-Z]{2}$/;
        return localeRegex.test(locale);
    }

    isValidCountryCode(code) {
        // ISO 3166-1 alpha-2 country code validation (2 uppercase letters)
        const codeRegex = /^[A-Z]{2}$/;
        return codeRegex.test(code);
    }

    isValidStatus(status) {
        const validStatuses = ['active', 'suspended', 'dissolved', 'archived', 'pending', 'inactive'];
        return validStatuses.includes(status.toLowerCase());
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
        if (this.sub_domain_to_v4l_app) {
            return `https://${this.sub_domain_to_v4l_app}.v4l.app`;
        }
        if (this.subdomain) {
            return `https://${this.subdomain}.v4l.app`;
        }
        return null;
    }

    getDisplayName() {
        return this.display_name || this.name;
    }

    getLegalDisplayName() {
        return this.legal_name || this.name;
    }

    getFullAddress() {
        const parts = [
            this.address_line1,
            this.address_line2,
            this.city,
            this.state,
            this.postal_code,
            this.country
        ].filter(part => part && part.trim());

        return parts.length > 0 ? parts.join(', ') : null;
    }

    getContactInfo() {
        return {
            phone: this.primary_phone_number,
            email: this.primary_email_address,
            support_email: this.support_email_address,
            fax: this.fax_number,
            website: this.website
        };
    }

    getSocialLinks() {
        try {
            return typeof this.social_links === 'string'
                ? JSON.parse(this.social_links)
                : this.social_links || {};
        } catch {
            return {};
        }
    }

    setSocialLinks(links) {
        this.social_links = typeof links === 'object' ? links : {};
        this.updated_at = new Date().toISOString();
    }

    getComplianceCertifications() {
        try {
            return typeof this.compliance_certifications === 'string'
                ? JSON.parse(this.compliance_certifications)
                : this.compliance_certifications || {};
        } catch {
            return {};
        }
    }

    setComplianceCertifications(certifications) {
        this.compliance_certifications = typeof certifications === 'object' ? certifications : {};
        this.updated_at = new Date().toISOString();
    }

    isChildOrganization() {
        return this.parent_org_id !== null;
    }

    isParentOrganization() {
        // This would need to be determined by checking if any organizations have this.id as parent_org_id
        // Implementation would depend on having access to other organizations
        return false; // Placeholder - would need repository access
    }

    getFiscalYearStart(year = new Date().getFullYear()) {
        return new Date(year, this.fiscal_year_start_month - 1, 1);
    }

    getFiscalYearEnd(year = new Date().getFullYear()) {
        const startYear = this.fiscal_year_start_month === 1 ? year : year + 1;
        const endMonth = this.fiscal_year_start_month === 1 ? 11 : this.fiscal_year_start_month - 2;
        return new Date(startYear, endMonth, 31);
    }

    getCurrentFiscalYear() {
        const now = new Date();
        const currentYear = now.getFullYear();
        const fiscalYearStart = this.getFiscalYearStart(currentYear);

        if (now >= fiscalYearStart) {
            return currentYear;
        } else {
            return currentYear - 1;
        }
    }

    isActiveStatus() {
        return this.is_active && this.status === 'active';
    }

    getOrganizationTypeDisplay() {
        const typeMap = {
            'non-profit': 'Non-Profit',
            'private': 'Private Company',
            'public': 'Public Company',
            'government': 'Government Entity',
            'startup': 'Startup',
            'cooperative': 'Cooperative',
            'partnership': 'Partnership',
            'sole-proprietorship': 'Sole Proprietorship',
            'llc': 'Limited Liability Company',
            'corporation': 'Corporation',
            'limited-company': 'Limited Company',
            'foundation': 'Foundation'
        };

        return typeMap[this.organization_type?.toLowerCase()] || this.organization_type;
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
            // Core Identity
            id: this.id,
            name: this.name,
            legal_name: this.legal_name,
            tag_line: this.tag_line,
            description: this.description,
            mission_statement: this.mission_statement,
            logo_url: this.logo_url,
            brand_assets_url: this.brand_assets_url,
            industry_id: this.industry_id,
            sector: this.sector,
            organization_type: this.organization_type,

            // Ownership & Management
            owner_id: this.owner_id,
            parent_org_id: this.parent_org_id,
            registration_number: this.registration_number,
            incorporation_number: this.incorporation_number,
            tax_id: this.tax_id,
            gst_number: this.gst_number,
            pan_number: this.pan_number,

            // Digital Presence
            sub_domain_to_v4l_app: this.sub_domain_to_v4l_app,
            website: this.website,
            social_links: typeof this.social_links === 'string'
                ? this.social_links
                : JSON.stringify(this.social_links || {}),
            support_email_address: this.support_email_address,

            // Contact Info
            primary_phone_number: this.primary_phone_number,
            primary_email_address: this.primary_email_address,
            fax_number: this.fax_number,
            address_line1: this.address_line1,
            address_line2: this.address_line2,
            city: this.city,
            state: this.state,
            postal_code: this.postal_code,
            country: this.country,

            // Financial & Ops
            fiscal_year_start_month: this.fiscal_year_start_month,
            primary_currency_code: this.primary_currency_code,
            bank_account_number: this.bank_account_number,
            ifsc: this.ifsc,
            iban: this.iban,
            billing_address_id: this.billing_address_id,
            shipping_address_id: this.shipping_address_id,

            // Regional Settings
            main_time_zone: this.main_time_zone,
            main_locale: this.main_locale,
            country_of_incorporation: this.country_of_incorporation,

            // Status & Compliance
            is_active: this.is_active,
            status: this.status,
            compliance_certifications: typeof this.compliance_certifications === 'string'
                ? this.compliance_certifications
                : JSON.stringify(this.compliance_certifications || {}),
            data_protection_officer_contact: this.data_protection_officer_contact,

            // Legacy fields for backward compatibility
            display_name: this.display_name,
            website_url: this.website, // Map to new website field
            primary_color: this.primary_color,
            secondary_color: this.secondary_color,
            size: this.size,
            headquarters_address: this.headquarters_address,
            phone_number: this.phone_number,
            email_address: this.email_address,
            subdomain: this.subdomain,
            custom_domain: this.custom_domain,
            subscription_plan: this.subscription_plan,
            subscription_expires_at: this.subscription_expires_at,

            // Audit / Metadata
            created_by: this.created_by,
            updated_by: this.updated_by,
            created_at: this.created_at,
            updated_at: this.updated_at,
            notes: this.notes,
            internal_comments: this.internal_comments
        };
    }

    static fromJSON(obj) {
        return new Organization(obj);
    }

    update(data, updatedBy = null) {
        Object.keys(data).forEach(key => {
            if (key !== 'id' && key !== 'created_at' && key !== 'created_by' && this.hasOwnProperty(key)) {
                // Handle JSON fields properly
                if (key === 'social_links' || key === 'compliance_certifications') {
                    this[key] = typeof data[key] === 'object' ? data[key] : data[key];
                } else {
                    this[key] = data[key];
                }
            }
        });

        this.updated_at = new Date().toISOString();
        if (updatedBy) {
            this.updated_by = updatedBy;
        }

        return this;
    }

    clone() {
        return Organization.fromJSON(this.toJSON());
    }
}