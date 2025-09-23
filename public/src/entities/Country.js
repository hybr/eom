export default class Country {
    constructor({
        id = null,
        code = '',
        code3 = '',
        numeric_code = '',
        name = '',
        official_name = '',
        capital = '',
        continent_id = null,
        region = '',
        sub_region = '',
        phone_code = '',
        is_active = true,
        created_at = null,
        updated_at = null
    } = {}) {
        this.id = id || `C_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.code = code.toUpperCase();
        this.code3 = code3.toUpperCase();
        this.numeric_code = numeric_code;
        this.name = name;
        this.official_name = official_name || name;
        this.capital = capital;
        this.continent_id = continent_id;
        this.region = region;
        this.sub_region = sub_region;
        this.phone_code = phone_code;
        this.is_active = is_active;
        this.created_at = created_at || new Date().toISOString();
        this.updated_at = updated_at || new Date().toISOString();
    }

    static schema() {
        return {
            table: 'country',
            columns: {
                id: 'TEXT PRIMARY KEY',
                code: 'TEXT UNIQUE NOT NULL',
                code3: 'TEXT UNIQUE NOT NULL',
                numeric_code: 'TEXT NOT NULL',
                name: 'TEXT NOT NULL',
                official_name: 'TEXT',
                capital: 'TEXT',
                continent_id: 'TEXT NOT NULL',
                region: 'TEXT',
                sub_region: 'TEXT',
                phone_code: 'TEXT',
                is_active: 'BOOLEAN DEFAULT 1',
                created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
                updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
            },
            indexes: [
                'CREATE INDEX idx_country_code ON country(code)',
                'CREATE INDEX idx_country_code3 ON country(code3)',
                'CREATE INDEX idx_country_name ON country(name)',
                'CREATE INDEX idx_country_continent ON country(continent_id)',
                'CREATE INDEX idx_country_region ON country(region)',
                'CREATE INDEX idx_country_active ON country(is_active)'
            ],
            foreignKeys: [
                'FOREIGN KEY (continent_id) REFERENCES continent(id)'
            ]
        };
    }

    validate() {
        const errors = [];

        if (!this.code?.trim()) {
            errors.push('Country code is required');
        } else if (!this.isValidCountryCode(this.code)) {
            errors.push('Country code must be exactly 2 uppercase letters (ISO 3166-1 alpha-2)');
        }

        if (!this.code3?.trim()) {
            errors.push('3-letter country code is required');
        } else if (!this.isValidCountryCode3(this.code3)) {
            errors.push('3-letter country code must be exactly 3 uppercase letters (ISO 3166-1 alpha-3)');
        }

        if (!this.numeric_code?.trim()) {
            errors.push('Numeric country code is required');
        } else if (!this.isValidNumericCode(this.numeric_code)) {
            errors.push('Numeric code must be exactly 3 digits (ISO 3166-1 numeric)');
        }

        if (!this.name?.trim()) {
            errors.push('Country name is required');
        }

        if (!this.continent_id) {
            errors.push('Continent is required');
        }

        if (this.phone_code && !this.isValidPhoneCode(this.phone_code)) {
            errors.push('Invalid phone code format (should start with + and contain only digits)');
        }

        return errors;
    }

    isValidCountryCode(code) {
        const codeRegex = /^[A-Z]{2}$/;
        return codeRegex.test(code);
    }

    isValidCountryCode3(code3) {
        const code3Regex = /^[A-Z]{3}$/;
        return code3Regex.test(code3);
    }

    isValidNumericCode(numericCode) {
        const numericRegex = /^\d{3}$/;
        return numericRegex.test(numericCode);
    }

    isValidPhoneCode(phoneCode) {
        const phoneRegex = /^\+\d{1,4}$/;
        return phoneRegex.test(phoneCode);
    }

    getDisplayName() {
        return this.official_name || this.name;
    }

    getFullDetails() {
        return {
            name: this.name,
            official_name: this.official_name,
            capital: this.capital,
            region: this.region,
            sub_region: this.sub_region,
            codes: {
                alpha2: this.code,
                alpha3: this.code3,
                numeric: this.numeric_code
            },
            phone_code: this.phone_code
        };
    }

    static getCountriesByContinent(countries, continentId) {
        return countries.filter(country => country.continent_id === continentId && country.is_active);
    }

    static getCountriesByRegion(countries, region) {
        return countries.filter(country => country.region === region && country.is_active);
    }

    static findByCode(countries, code) {
        const upperCode = code.toUpperCase();
        return countries.find(country =>
            country.code === upperCode ||
            country.code3 === upperCode ||
            country.numeric_code === upperCode
        );
    }

    static searchByName(countries, searchTerm) {
        const term = searchTerm.toLowerCase();
        return countries.filter(country =>
            country.name.toLowerCase().includes(term) ||
            (country.official_name && country.official_name.toLowerCase().includes(term)) ||
            (country.capital && country.capital.toLowerCase().includes(term))
        );
    }

    toJSON() {
        return {
            id: this.id,
            code: this.code,
            code3: this.code3,
            numeric_code: this.numeric_code,
            name: this.name,
            official_name: this.official_name,
            capital: this.capital,
            continent_id: this.continent_id,
            region: this.region,
            sub_region: this.sub_region,
            phone_code: this.phone_code,
            is_active: this.is_active,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    static fromJSON(obj) {
        return new Country(obj);
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
        return Country.fromJSON(this.toJSON());
    }
}