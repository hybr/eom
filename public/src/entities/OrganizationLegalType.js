export default class OrganizationLegalType {
    constructor({
        id = null,
        code = '',
        name = '',
        abbreviation = '',
        jurisdiction_country_code = '',
        jurisdiction_region = '',
        description = '',
        is_active = true,
        created_at = null,
        updated_at = null
    } = {}) {
        this.id = id || `OLT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.code = code.toUpperCase();
        this.name = name;
        this.abbreviation = abbreviation;
        this.jurisdiction_country_code = jurisdiction_country_code.toUpperCase();
        this.jurisdiction_region = jurisdiction_region;
        this.description = description;
        this.is_active = is_active;
        this.created_at = created_at || new Date().toISOString();
        this.updated_at = updated_at || new Date().toISOString();
    }

    static schema() {
        return {
            table: 'organization_legal_type',
            columns: {
                id: 'TEXT PRIMARY KEY',
                code: 'TEXT UNIQUE NOT NULL',
                name: 'TEXT NOT NULL',
                abbreviation: 'TEXT',
                jurisdiction_country_code: 'TEXT NOT NULL',
                jurisdiction_region: 'TEXT',
                description: 'TEXT',
                is_active: 'BOOLEAN DEFAULT 1',
                created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
                updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
            },
            indexes: [
                'CREATE INDEX idx_org_legal_type_code ON organization_legal_type(code)',
                'CREATE INDEX idx_org_legal_type_name ON organization_legal_type(name)',
                'CREATE INDEX idx_org_legal_type_country ON organization_legal_type(jurisdiction_country_code)',
                'CREATE INDEX idx_org_legal_type_active ON organization_legal_type(is_active)',
                'CREATE INDEX idx_org_legal_type_jurisdiction ON organization_legal_type(jurisdiction_country_code, jurisdiction_region)'
            ],
            foreignKeys: [
                'FOREIGN KEY (jurisdiction_country_code) REFERENCES country(code)'
            ]
        };
    }

    validate() {
        const errors = [];

        if (!this.code?.trim()) {
            errors.push('Legal type code is required');
        } else if (!this.isValidCode(this.code)) {
            errors.push('Code must contain only uppercase letters, numbers, and underscores (e.g., LLC, PVT_LTD)');
        }

        if (!this.name?.trim()) {
            errors.push('Legal type name is required');
        }

        if (!this.jurisdiction_country_code?.trim()) {
            errors.push('Jurisdiction country code is required');
        } else if (!this.isValidCountryCode(this.jurisdiction_country_code)) {
            errors.push('Jurisdiction country code must be exactly 2 uppercase letters (ISO 3166-1 alpha-2)');
        }

        if (this.code && this.code.length > 20) {
            errors.push('Code cannot exceed 20 characters');
        }

        if (this.name && this.name.length > 100) {
            errors.push('Name cannot exceed 100 characters');
        }

        if (this.abbreviation && this.abbreviation.length > 20) {
            errors.push('Abbreviation cannot exceed 20 characters');
        }

        return errors;
    }

    isValidCode(code) {
        const codeRegex = /^[A-Z0-9_]+$/;
        return codeRegex.test(code);
    }

    isValidCountryCode(code) {
        const codeRegex = /^[A-Z]{2}$/;
        return codeRegex.test(code);
    }

    getDisplayName() {
        if (this.abbreviation) {
            return `${this.name} (${this.abbreviation})`;
        }
        return this.name;
    }

    getJurisdictionDisplay() {
        if (this.jurisdiction_region) {
            return `${this.jurisdiction_country_code} - ${this.jurisdiction_region}`;
        }
        return this.jurisdiction_country_code;
    }

    getFullDetails() {
        return {
            code: this.code,
            name: this.name,
            abbreviation: this.abbreviation,
            jurisdiction: {
                country_code: this.jurisdiction_country_code,
                region: this.jurisdiction_region
            },
            description: this.description,
            is_active: this.is_active
        };
    }

    static getByCountry(legalTypes, countryCode) {
        return legalTypes.filter(type =>
            type.jurisdiction_country_code === countryCode.toUpperCase() && type.is_active
        );
    }

    static getByRegion(legalTypes, countryCode, region) {
        return legalTypes.filter(type =>
            type.jurisdiction_country_code === countryCode.toUpperCase() &&
            type.jurisdiction_region === region &&
            type.is_active
        );
    }

    static findByCode(legalTypes, code) {
        const upperCode = code.toUpperCase();
        return legalTypes.find(type => type.code === upperCode);
    }

    static searchByName(legalTypes, searchTerm) {
        const term = searchTerm.toLowerCase();
        return legalTypes.filter(type =>
            type.name.toLowerCase().includes(term) ||
            (type.abbreviation && type.abbreviation.toLowerCase().includes(term)) ||
            type.code.toLowerCase().includes(term) ||
            (type.description && type.description.toLowerCase().includes(term))
        );
    }

    static getCommonTypes() {
        return [
            'LLC', 'CORPORATION', 'PVT_LTD', 'LTD', 'GMBH', 'SARL',
            'SRL', 'BV', 'AB', 'OY', 'AS', 'SPA', 'SA'
        ];
    }

    static groupByCountry(legalTypes) {
        const grouped = {};
        legalTypes.forEach(type => {
            if (!grouped[type.jurisdiction_country_code]) {
                grouped[type.jurisdiction_country_code] = [];
            }
            grouped[type.jurisdiction_country_code].push(type);
        });
        return grouped;
    }

    toJSON() {
        return {
            id: this.id,
            code: this.code,
            name: this.name,
            abbreviation: this.abbreviation,
            jurisdiction_country_code: this.jurisdiction_country_code,
            jurisdiction_region: this.jurisdiction_region,
            description: this.description,
            is_active: this.is_active,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    static fromJSON(obj) {
        return new OrganizationLegalType(obj);
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
        return OrganizationLegalType.fromJSON(this.toJSON());
    }
}