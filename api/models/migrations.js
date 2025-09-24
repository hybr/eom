import { db, dbRun, dbGet } from './database.js'

// Migration tracking table
export async function initMigrationTable() {
    await dbRun(`
        CREATE TABLE IF NOT EXISTS migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `)
}

// Check if migration has been executed
export async function migrationExists(name) {
    const result = await dbGet('SELECT id FROM migrations WHERE name = ?', [name])
    return !!result
}

// Record migration as executed
export async function recordMigration(name) {
    await dbRun('INSERT INTO migrations (name) VALUES (?)', [name])
}

// Migration 001: Add new fields to persons table
export async function migration_001_add_person_fields() {
    const migrationName = '001_add_person_fields'

    if (await migrationExists(migrationName)) {
        console.log(`Migration ${migrationName} already executed, skipping...`)
        return
    }

    console.log(`Executing migration: ${migrationName}`)

    // Check if columns already exist before adding them
    const tableInfo = await new Promise((resolve, reject) => {
        db.all("PRAGMA table_info(persons)", (err, rows) => {
            if (err) reject(err)
            else resolve(rows)
        })
    })

    const existingColumns = tableInfo.map(col => col.name)
    const columnsToAdd = [
        { name: 'name_prefix', sql: 'ALTER TABLE persons ADD COLUMN name_prefix TEXT' },
        { name: 'middle_name', sql: 'ALTER TABLE persons ADD COLUMN middle_name TEXT' },
        { name: 'name_suffix', sql: 'ALTER TABLE persons ADD COLUMN name_suffix TEXT' },
        { name: 'date_of_birth', sql: 'ALTER TABLE persons ADD COLUMN date_of_birth DATE' },
        { name: 'primary_phone_number', sql: 'ALTER TABLE persons ADD COLUMN primary_phone_number TEXT' },
        { name: 'primary_email_address', sql: 'ALTER TABLE persons ADD COLUMN primary_email_address TEXT' }
    ]

    for (const column of columnsToAdd) {
        if (!existingColumns.includes(column.name)) {
            console.log(`Adding column: ${column.name}`)
            await dbRun(column.sql)
        } else {
            console.log(`Column ${column.name} already exists, skipping...`)
        }
    }

    await recordMigration(migrationName)
    console.log(`Migration ${migrationName} completed successfully`)
}

// Migration 002: Create continent table and seed data
export async function migration_002_create_continent_table() {
    const migrationName = '002_create_continent_table'

    if (await migrationExists(migrationName)) {
        console.log(`Migration ${migrationName} already executed, skipping...`)
        return
    }

    console.log(`Executing migration: ${migrationName}`)

    // Create continent table
    await dbRun(`
        CREATE TABLE IF NOT EXISTS continents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `)

    // Seed continent data
    const continents = [
        { code: 'AF', name: 'Africa', description: '54 countries, second-largest continent by land area.' },
        { code: 'AN', name: 'Antarctica', description: 'Southernmost continent, largely uninhabited, no permanent residents.' },
        { code: 'AS', name: 'Asia', description: 'Largest continent by area and population.' },
        { code: 'EU', name: 'Europe', description: 'Home to the European Union and many diverse countries.' },
        { code: 'NA', name: 'North America', description: 'Includes USA, Canada, Mexico, and Central America.' },
        { code: 'OC', name: 'Oceania', description: 'Includes Australia, New Zealand, and Pacific island nations.' },
        { code: 'SA', name: 'South America', description: '12 sovereign states, includes Brazil, Argentina, and Chile.' }
    ]

    for (const continent of continents) {
        // Check if continent already exists
        const existing = await dbGet('SELECT id FROM continents WHERE code = ?', [continent.code])

        if (!existing) {
            console.log(`Seeding continent: ${continent.name}`)
            await dbRun(`
                INSERT INTO continents (code, name, description)
                VALUES (?, ?, ?)
            `, [continent.code, continent.name, continent.description])
        } else {
            console.log(`Continent ${continent.name} already exists, skipping...`)
        }
    }

    await recordMigration(migrationName)
    console.log(`Migration ${migrationName} completed successfully`)
}

// Migration 003: Create country table and seed data
export async function migration_003_create_country_table() {
    const migrationName = '003_create_country_table'

    if (await migrationExists(migrationName)) {
        console.log(`Migration ${migrationName} already executed, skipping...`)
        return
    }

    console.log(`Executing migration: ${migrationName}`)

    // Create country table
    await dbRun(`
        CREATE TABLE IF NOT EXISTS country (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code CHAR(2) NOT NULL UNIQUE,
            code3 CHAR(3) NOT NULL UNIQUE,
            numeric_code CHAR(3) NOT NULL,
            name VARCHAR(150) NOT NULL,
            official_name VARCHAR(250),
            capital VARCHAR(150),
            continent_id INTEGER NOT NULL,
            region VARCHAR(100),
            sub_region VARCHAR(100),
            phone_code VARCHAR(10),
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (continent_id) REFERENCES continents(id)
        )
    `)

    // Create indexes for country table
    const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_country_code ON country(code)',
        'CREATE INDEX IF NOT EXISTS idx_country_code3 ON country(code3)',
        'CREATE INDEX IF NOT EXISTS idx_country_name ON country(name)',
        'CREATE INDEX IF NOT EXISTS idx_country_continent ON country(continent_id)',
        'CREATE INDEX IF NOT EXISTS idx_country_region ON country(region)',
        'CREATE INDEX IF NOT EXISTS idx_country_active ON country(is_active)'
    ]

    for (const indexSql of indexes) {
        await dbRun(indexSql)
    }

    // Seed sample country data
    const countries = [
        {
            code: 'IN', code3: 'IND', numeric_code: '356', name: 'India',
            official_name: 'Republic of India', capital: 'New Delhi',
            continent_code: 'AS', region: 'Asia', sub_region: 'South Asia', phone_code: '+91'
        },
        {
            code: 'US', code3: 'USA', numeric_code: '840', name: 'United States',
            official_name: 'United States of America', capital: 'Washington, D.C.',
            continent_code: 'NA', region: 'Americas', sub_region: 'Northern America', phone_code: '+1'
        },
        {
            code: 'DE', code3: 'DEU', numeric_code: '276', name: 'Germany',
            official_name: 'Federal Republic of Germany', capital: 'Berlin',
            continent_code: 'EU', region: 'Europe', sub_region: 'Western Europe', phone_code: '+49'
        },
        {
            code: 'BR', code3: 'BRA', numeric_code: '076', name: 'Brazil',
            official_name: 'Federative Republic of Brazil', capital: 'Brasília',
            continent_code: 'SA', region: 'Americas', sub_region: 'South America', phone_code: '+55'
        },
        {
            code: 'AU', code3: 'AUS', numeric_code: '036', name: 'Australia',
            official_name: 'Commonwealth of Australia', capital: 'Canberra',
            continent_code: 'OC', region: 'Oceania', sub_region: 'Australia and New Zealand', phone_code: '+61'
        }
    ]

    for (const country of countries) {
        // Get continent ID by code
        const continent = await dbGet('SELECT id FROM continents WHERE code = ?', [country.continent_code])

        if (!continent) {
            console.log(`Continent with code ${country.continent_code} not found for country ${country.name}`)
            continue
        }

        // Check if country already exists
        const existing = await dbGet('SELECT id FROM country WHERE code = ?', [country.code])

        if (!existing) {
            console.log(`Seeding country: ${country.name}`)
            await dbRun(`
                INSERT INTO country (code, code3, numeric_code, name, official_name, capital, continent_id, region, sub_region, phone_code)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                country.code, country.code3, country.numeric_code, country.name,
                country.official_name, country.capital, continent.id,
                country.region, country.sub_region, country.phone_code
            ])
        } else {
            console.log(`Country ${country.name} already exists, skipping...`)
        }
    }

    await recordMigration(migrationName)
    console.log(`Migration ${migrationName} completed successfully`)
}

// Migration 004: Add all world countries
export async function migration_004_add_all_countries() {
    const migrationName = '004_add_all_countries'

    if (await migrationExists(migrationName)) {
        console.log(`Migration ${migrationName} already executed, skipping...`)
        return
    }

    console.log(`Executing migration: ${migrationName}`)

    // Comprehensive list of all world countries with ISO 3166-1 codes
    const allCountries = [
        // Africa (AF)
        { code: 'DZ', code3: 'DZA', numeric_code: '012', name: 'Algeria', official_name: 'People\'s Democratic Republic of Algeria', capital: 'Algiers', continent_code: 'AF', region: 'Africa', sub_region: 'Northern Africa', phone_code: '+213' },
        { code: 'AO', code3: 'AGO', numeric_code: '024', name: 'Angola', official_name: 'Republic of Angola', capital: 'Luanda', continent_code: 'AF', region: 'Africa', sub_region: 'Middle Africa', phone_code: '+244' },
        { code: 'BJ', code3: 'BEN', numeric_code: '204', name: 'Benin', official_name: 'Republic of Benin', capital: 'Porto-Novo', continent_code: 'AF', region: 'Africa', sub_region: 'Western Africa', phone_code: '+229' },
        { code: 'BW', code3: 'BWA', numeric_code: '072', name: 'Botswana', official_name: 'Republic of Botswana', capital: 'Gaborone', continent_code: 'AF', region: 'Africa', sub_region: 'Southern Africa', phone_code: '+267' },
        { code: 'BF', code3: 'BFA', numeric_code: '854', name: 'Burkina Faso', official_name: 'Burkina Faso', capital: 'Ouagadougou', continent_code: 'AF', region: 'Africa', sub_region: 'Western Africa', phone_code: '+226' },
        { code: 'BI', code3: 'BDI', numeric_code: '108', name: 'Burundi', official_name: 'Republic of Burundi', capital: 'Gitega', continent_code: 'AF', region: 'Africa', sub_region: 'Eastern Africa', phone_code: '+257' },
        { code: 'CV', code3: 'CPV', numeric_code: '132', name: 'Cape Verde', official_name: 'Republic of Cape Verde', capital: 'Praia', continent_code: 'AF', region: 'Africa', sub_region: 'Western Africa', phone_code: '+238' },
        { code: 'CM', code3: 'CMR', numeric_code: '120', name: 'Cameroon', official_name: 'Republic of Cameroon', capital: 'Yaoundé', continent_code: 'AF', region: 'Africa', sub_region: 'Middle Africa', phone_code: '+237' },
        { code: 'CF', code3: 'CAF', numeric_code: '140', name: 'Central African Republic', official_name: 'Central African Republic', capital: 'Bangui', continent_code: 'AF', region: 'Africa', sub_region: 'Middle Africa', phone_code: '+236' },
        { code: 'TD', code3: 'TCD', numeric_code: '148', name: 'Chad', official_name: 'Republic of Chad', capital: 'N\'Djamena', continent_code: 'AF', region: 'Africa', sub_region: 'Middle Africa', phone_code: '+235' },
        { code: 'KM', code3: 'COM', numeric_code: '174', name: 'Comoros', official_name: 'Union of the Comoros', capital: 'Moroni', continent_code: 'AF', region: 'Africa', sub_region: 'Eastern Africa', phone_code: '+269' },
        { code: 'CG', code3: 'COG', numeric_code: '178', name: 'Congo', official_name: 'Republic of the Congo', capital: 'Brazzaville', continent_code: 'AF', region: 'Africa', sub_region: 'Middle Africa', phone_code: '+242' },
        { code: 'CD', code3: 'COD', numeric_code: '180', name: 'Democratic Republic of the Congo', official_name: 'Democratic Republic of the Congo', capital: 'Kinshasa', continent_code: 'AF', region: 'Africa', sub_region: 'Middle Africa', phone_code: '+243' },
        { code: 'CI', code3: 'CIV', numeric_code: '384', name: 'Côte d\'Ivoire', official_name: 'Republic of Côte d\'Ivoire', capital: 'Yamoussoukro', continent_code: 'AF', region: 'Africa', sub_region: 'Western Africa', phone_code: '+225' },
        { code: 'DJ', code3: 'DJI', numeric_code: '262', name: 'Djibouti', official_name: 'Republic of Djibouti', capital: 'Djibouti', continent_code: 'AF', region: 'Africa', sub_region: 'Eastern Africa', phone_code: '+253' },
        { code: 'EG', code3: 'EGY', numeric_code: '818', name: 'Egypt', official_name: 'Arab Republic of Egypt', capital: 'Cairo', continent_code: 'AF', region: 'Africa', sub_region: 'Northern Africa', phone_code: '+20' },
        { code: 'GQ', code3: 'GNQ', numeric_code: '226', name: 'Equatorial Guinea', official_name: 'Republic of Equatorial Guinea', capital: 'Malabo', continent_code: 'AF', region: 'Africa', sub_region: 'Middle Africa', phone_code: '+240' },
        { code: 'ER', code3: 'ERI', numeric_code: '232', name: 'Eritrea', official_name: 'State of Eritrea', capital: 'Asmara', continent_code: 'AF', region: 'Africa', sub_region: 'Eastern Africa', phone_code: '+291' },
        { code: 'SZ', code3: 'SWZ', numeric_code: '748', name: 'Eswatini', official_name: 'Kingdom of Eswatini', capital: 'Mbabane', continent_code: 'AF', region: 'Africa', sub_region: 'Southern Africa', phone_code: '+268' },
        { code: 'ET', code3: 'ETH', numeric_code: '231', name: 'Ethiopia', official_name: 'Federal Democratic Republic of Ethiopia', capital: 'Addis Ababa', continent_code: 'AF', region: 'Africa', sub_region: 'Eastern Africa', phone_code: '+251' },
        { code: 'GA', code3: 'GAB', numeric_code: '266', name: 'Gabon', official_name: 'Gabonese Republic', capital: 'Libreville', continent_code: 'AF', region: 'Africa', sub_region: 'Middle Africa', phone_code: '+241' },
        { code: 'GM', code3: 'GMB', numeric_code: '270', name: 'Gambia', official_name: 'Republic of the Gambia', capital: 'Banjul', continent_code: 'AF', region: 'Africa', sub_region: 'Western Africa', phone_code: '+220' },
        { code: 'GH', code3: 'GHA', numeric_code: '288', name: 'Ghana', official_name: 'Republic of Ghana', capital: 'Accra', continent_code: 'AF', region: 'Africa', sub_region: 'Western Africa', phone_code: '+233' },
        { code: 'GN', code3: 'GIN', numeric_code: '324', name: 'Guinea', official_name: 'Republic of Guinea', capital: 'Conakry', continent_code: 'AF', region: 'Africa', sub_region: 'Western Africa', phone_code: '+224' },
        { code: 'GW', code3: 'GNB', numeric_code: '624', name: 'Guinea-Bissau', official_name: 'Republic of Guinea-Bissau', capital: 'Bissau', continent_code: 'AF', region: 'Africa', sub_region: 'Western Africa', phone_code: '+245' },
        { code: 'KE', code3: 'KEN', numeric_code: '404', name: 'Kenya', official_name: 'Republic of Kenya', capital: 'Nairobi', continent_code: 'AF', region: 'Africa', sub_region: 'Eastern Africa', phone_code: '+254' },
        { code: 'LS', code3: 'LSO', numeric_code: '426', name: 'Lesotho', official_name: 'Kingdom of Lesotho', capital: 'Maseru', continent_code: 'AF', region: 'Africa', sub_region: 'Southern Africa', phone_code: '+266' },
        { code: 'LR', code3: 'LBR', numeric_code: '430', name: 'Liberia', official_name: 'Republic of Liberia', capital: 'Monrovia', continent_code: 'AF', region: 'Africa', sub_region: 'Western Africa', phone_code: '+231' },
        { code: 'LY', code3: 'LBY', numeric_code: '434', name: 'Libya', official_name: 'State of Libya', capital: 'Tripoli', continent_code: 'AF', region: 'Africa', sub_region: 'Northern Africa', phone_code: '+218' },
        { code: 'MG', code3: 'MDG', numeric_code: '450', name: 'Madagascar', official_name: 'Republic of Madagascar', capital: 'Antananarivo', continent_code: 'AF', region: 'Africa', sub_region: 'Eastern Africa', phone_code: '+261' },
        { code: 'MW', code3: 'MWI', numeric_code: '454', name: 'Malawi', official_name: 'Republic of Malawi', capital: 'Lilongwe', continent_code: 'AF', region: 'Africa', sub_region: 'Eastern Africa', phone_code: '+265' },
        { code: 'ML', code3: 'MLI', numeric_code: '466', name: 'Mali', official_name: 'Republic of Mali', capital: 'Bamako', continent_code: 'AF', region: 'Africa', sub_region: 'Western Africa', phone_code: '+223' },
        { code: 'MR', code3: 'MRT', numeric_code: '478', name: 'Mauritania', official_name: 'Islamic Republic of Mauritania', capital: 'Nouakchott', continent_code: 'AF', region: 'Africa', sub_region: 'Western Africa', phone_code: '+222' },
        { code: 'MU', code3: 'MUS', numeric_code: '480', name: 'Mauritius', official_name: 'Republic of Mauritius', capital: 'Port Louis', continent_code: 'AF', region: 'Africa', sub_region: 'Eastern Africa', phone_code: '+230' },
        { code: 'MA', code3: 'MAR', numeric_code: '504', name: 'Morocco', official_name: 'Kingdom of Morocco', capital: 'Rabat', continent_code: 'AF', region: 'Africa', sub_region: 'Northern Africa', phone_code: '+212' },
        { code: 'MZ', code3: 'MOZ', numeric_code: '508', name: 'Mozambique', official_name: 'Republic of Mozambique', capital: 'Maputo', continent_code: 'AF', region: 'Africa', sub_region: 'Eastern Africa', phone_code: '+258' },
        { code: 'NA', code3: 'NAM', numeric_code: '516', name: 'Namibia', official_name: 'Republic of Namibia', capital: 'Windhoek', continent_code: 'AF', region: 'Africa', sub_region: 'Southern Africa', phone_code: '+264' },
        { code: 'NE', code3: 'NER', numeric_code: '562', name: 'Niger', official_name: 'Republic of the Niger', capital: 'Niamey', continent_code: 'AF', region: 'Africa', sub_region: 'Western Africa', phone_code: '+227' },
        { code: 'NG', code3: 'NGA', numeric_code: '566', name: 'Nigeria', official_name: 'Federal Republic of Nigeria', capital: 'Abuja', continent_code: 'AF', region: 'Africa', sub_region: 'Western Africa', phone_code: '+234' },
        { code: 'RW', code3: 'RWA', numeric_code: '646', name: 'Rwanda', official_name: 'Republic of Rwanda', capital: 'Kigali', continent_code: 'AF', region: 'Africa', sub_region: 'Eastern Africa', phone_code: '+250' },
        { code: 'ST', code3: 'STP', numeric_code: '678', name: 'São Tomé and Príncipe', official_name: 'Democratic Republic of São Tomé and Príncipe', capital: 'São Tomé', continent_code: 'AF', region: 'Africa', sub_region: 'Middle Africa', phone_code: '+239' },
        { code: 'SN', code3: 'SEN', numeric_code: '686', name: 'Senegal', official_name: 'Republic of Senegal', capital: 'Dakar', continent_code: 'AF', region: 'Africa', sub_region: 'Western Africa', phone_code: '+221' },
        { code: 'SC', code3: 'SYC', numeric_code: '690', name: 'Seychelles', official_name: 'Republic of Seychelles', capital: 'Victoria', continent_code: 'AF', region: 'Africa', sub_region: 'Eastern Africa', phone_code: '+248' },
        { code: 'SL', code3: 'SLE', numeric_code: '694', name: 'Sierra Leone', official_name: 'Republic of Sierra Leone', capital: 'Freetown', continent_code: 'AF', region: 'Africa', sub_region: 'Western Africa', phone_code: '+232' },
        { code: 'SO', code3: 'SOM', numeric_code: '706', name: 'Somalia', official_name: 'Federal Republic of Somalia', capital: 'Mogadishu', continent_code: 'AF', region: 'Africa', sub_region: 'Eastern Africa', phone_code: '+252' },
        { code: 'ZA', code3: 'ZAF', numeric_code: '710', name: 'South Africa', official_name: 'Republic of South Africa', capital: 'Pretoria', continent_code: 'AF', region: 'Africa', sub_region: 'Southern Africa', phone_code: '+27' },
        { code: 'SS', code3: 'SSD', numeric_code: '728', name: 'South Sudan', official_name: 'Republic of South Sudan', capital: 'Juba', continent_code: 'AF', region: 'Africa', sub_region: 'Eastern Africa', phone_code: '+211' },
        { code: 'SD', code3: 'SDN', numeric_code: '729', name: 'Sudan', official_name: 'Republic of the Sudan', capital: 'Khartoum', continent_code: 'AF', region: 'Africa', sub_region: 'Northern Africa', phone_code: '+249' },
        { code: 'TZ', code3: 'TZA', numeric_code: '834', name: 'Tanzania', official_name: 'United Republic of Tanzania', capital: 'Dodoma', continent_code: 'AF', region: 'Africa', sub_region: 'Eastern Africa', phone_code: '+255' },
        { code: 'TG', code3: 'TGO', numeric_code: '768', name: 'Togo', official_name: 'Togolese Republic', capital: 'Lomé', continent_code: 'AF', region: 'Africa', sub_region: 'Western Africa', phone_code: '+228' },
        { code: 'TN', code3: 'TUN', numeric_code: '788', name: 'Tunisia', official_name: 'Republic of Tunisia', capital: 'Tunis', continent_code: 'AF', region: 'Africa', sub_region: 'Northern Africa', phone_code: '+216' },
        { code: 'UG', code3: 'UGA', numeric_code: '800', name: 'Uganda', official_name: 'Republic of Uganda', capital: 'Kampala', continent_code: 'AF', region: 'Africa', sub_region: 'Eastern Africa', phone_code: '+256' },
        { code: 'ZM', code3: 'ZMB', numeric_code: '894', name: 'Zambia', official_name: 'Republic of Zambia', capital: 'Lusaka', continent_code: 'AF', region: 'Africa', sub_region: 'Eastern Africa', phone_code: '+260' },
        { code: 'ZW', code3: 'ZWE', numeric_code: '716', name: 'Zimbabwe', official_name: 'Republic of Zimbabwe', capital: 'Harare', continent_code: 'AF', region: 'Africa', sub_region: 'Eastern Africa', phone_code: '+263' },

        // Asia (AS)
        { code: 'AF', code3: 'AFG', numeric_code: '004', name: 'Afghanistan', official_name: 'Islamic Republic of Afghanistan', capital: 'Kabul', continent_code: 'AS', region: 'Asia', sub_region: 'Southern Asia', phone_code: '+93' },
        { code: 'AM', code3: 'ARM', numeric_code: '051', name: 'Armenia', official_name: 'Republic of Armenia', capital: 'Yerevan', continent_code: 'AS', region: 'Asia', sub_region: 'Western Asia', phone_code: '+374' },
        { code: 'AZ', code3: 'AZE', numeric_code: '031', name: 'Azerbaijan', official_name: 'Republic of Azerbaijan', capital: 'Baku', continent_code: 'AS', region: 'Asia', sub_region: 'Western Asia', phone_code: '+994' },
        { code: 'BH', code3: 'BHR', numeric_code: '048', name: 'Bahrain', official_name: 'Kingdom of Bahrain', capital: 'Manama', continent_code: 'AS', region: 'Asia', sub_region: 'Western Asia', phone_code: '+973' },
        { code: 'BD', code3: 'BGD', numeric_code: '050', name: 'Bangladesh', official_name: 'People\'s Republic of Bangladesh', capital: 'Dhaka', continent_code: 'AS', region: 'Asia', sub_region: 'Southern Asia', phone_code: '+880' },
        { code: 'BT', code3: 'BTN', numeric_code: '064', name: 'Bhutan', official_name: 'Kingdom of Bhutan', capital: 'Thimphu', continent_code: 'AS', region: 'Asia', sub_region: 'Southern Asia', phone_code: '+975' },
        { code: 'BN', code3: 'BRN', numeric_code: '096', name: 'Brunei', official_name: 'Nation of Brunei', capital: 'Bandar Seri Begawan', continent_code: 'AS', region: 'Asia', sub_region: 'South-Eastern Asia', phone_code: '+673' },
        { code: 'KH', code3: 'KHM', numeric_code: '116', name: 'Cambodia', official_name: 'Kingdom of Cambodia', capital: 'Phnom Penh', continent_code: 'AS', region: 'Asia', sub_region: 'South-Eastern Asia', phone_code: '+855' },
        { code: 'CN', code3: 'CHN', numeric_code: '156', name: 'China', official_name: 'People\'s Republic of China', capital: 'Beijing', continent_code: 'AS', region: 'Asia', sub_region: 'Eastern Asia', phone_code: '+86' },
        { code: 'CY', code3: 'CYP', numeric_code: '196', name: 'Cyprus', official_name: 'Republic of Cyprus', capital: 'Nicosia', continent_code: 'AS', region: 'Asia', sub_region: 'Western Asia', phone_code: '+357' },
        { code: 'GE', code3: 'GEO', numeric_code: '268', name: 'Georgia', official_name: 'Georgia', capital: 'Tbilisi', continent_code: 'AS', region: 'Asia', sub_region: 'Western Asia', phone_code: '+995' },
        { code: 'IN', code3: 'IND', numeric_code: '356', name: 'India', official_name: 'Republic of India', capital: 'New Delhi', continent_code: 'AS', region: 'Asia', sub_region: 'Southern Asia', phone_code: '+91' },
        { code: 'ID', code3: 'IDN', numeric_code: '360', name: 'Indonesia', official_name: 'Republic of Indonesia', capital: 'Jakarta', continent_code: 'AS', region: 'Asia', sub_region: 'South-Eastern Asia', phone_code: '+62' },
        { code: 'IR', code3: 'IRN', numeric_code: '364', name: 'Iran', official_name: 'Islamic Republic of Iran', capital: 'Tehran', continent_code: 'AS', region: 'Asia', sub_region: 'Southern Asia', phone_code: '+98' },
        { code: 'IQ', code3: 'IRQ', numeric_code: '368', name: 'Iraq', official_name: 'Republic of Iraq', capital: 'Baghdad', continent_code: 'AS', region: 'Asia', sub_region: 'Western Asia', phone_code: '+964' },
        { code: 'IL', code3: 'ISR', numeric_code: '376', name: 'Israel', official_name: 'State of Israel', capital: 'Jerusalem', continent_code: 'AS', region: 'Asia', sub_region: 'Western Asia', phone_code: '+972' },
        { code: 'JP', code3: 'JPN', numeric_code: '392', name: 'Japan', official_name: 'Japan', capital: 'Tokyo', continent_code: 'AS', region: 'Asia', sub_region: 'Eastern Asia', phone_code: '+81' },
        { code: 'JO', code3: 'JOR', numeric_code: '400', name: 'Jordan', official_name: 'Hashemite Kingdom of Jordan', capital: 'Amman', continent_code: 'AS', region: 'Asia', sub_region: 'Western Asia', phone_code: '+962' },
        { code: 'KZ', code3: 'KAZ', numeric_code: '398', name: 'Kazakhstan', official_name: 'Republic of Kazakhstan', capital: 'Nur-Sultan', continent_code: 'AS', region: 'Asia', sub_region: 'Central Asia', phone_code: '+7' },
        { code: 'KW', code3: 'KWT', numeric_code: '414', name: 'Kuwait', official_name: 'State of Kuwait', capital: 'Kuwait City', continent_code: 'AS', region: 'Asia', sub_region: 'Western Asia', phone_code: '+965' },
        { code: 'KG', code3: 'KGZ', numeric_code: '417', name: 'Kyrgyzstan', official_name: 'Kyrgyz Republic', capital: 'Bishkek', continent_code: 'AS', region: 'Asia', sub_region: 'Central Asia', phone_code: '+996' },
        { code: 'LA', code3: 'LAO', numeric_code: '418', name: 'Laos', official_name: 'Lao People\'s Democratic Republic', capital: 'Vientiane', continent_code: 'AS', region: 'Asia', sub_region: 'South-Eastern Asia', phone_code: '+856' },
        { code: 'LB', code3: 'LBN', numeric_code: '422', name: 'Lebanon', official_name: 'Lebanese Republic', capital: 'Beirut', continent_code: 'AS', region: 'Asia', sub_region: 'Western Asia', phone_code: '+961' },
        { code: 'MY', code3: 'MYS', numeric_code: '458', name: 'Malaysia', official_name: 'Malaysia', capital: 'Kuala Lumpur', continent_code: 'AS', region: 'Asia', sub_region: 'South-Eastern Asia', phone_code: '+60' },
        { code: 'MV', code3: 'MDV', numeric_code: '462', name: 'Maldives', official_name: 'Republic of Maldives', capital: 'Malé', continent_code: 'AS', region: 'Asia', sub_region: 'Southern Asia', phone_code: '+960' },
        { code: 'MN', code3: 'MNG', numeric_code: '496', name: 'Mongolia', official_name: 'Mongolia', capital: 'Ulaanbaatar', continent_code: 'AS', region: 'Asia', sub_region: 'Eastern Asia', phone_code: '+976' },
        { code: 'MM', code3: 'MMR', numeric_code: '104', name: 'Myanmar', official_name: 'Republic of the Union of Myanmar', capital: 'Naypyidaw', continent_code: 'AS', region: 'Asia', sub_region: 'South-Eastern Asia', phone_code: '+95' },
        { code: 'NP', code3: 'NPL', numeric_code: '524', name: 'Nepal', official_name: 'Federal Democratic Republic of Nepal', capital: 'Kathmandu', continent_code: 'AS', region: 'Asia', sub_region: 'Southern Asia', phone_code: '+977' },
        { code: 'KP', code3: 'PRK', numeric_code: '408', name: 'North Korea', official_name: 'Democratic People\'s Republic of Korea', capital: 'Pyongyang', continent_code: 'AS', region: 'Asia', sub_region: 'Eastern Asia', phone_code: '+850' },
        { code: 'OM', code3: 'OMN', numeric_code: '512', name: 'Oman', official_name: 'Sultanate of Oman', capital: 'Muscat', continent_code: 'AS', region: 'Asia', sub_region: 'Western Asia', phone_code: '+968' },
        { code: 'PK', code3: 'PAK', numeric_code: '586', name: 'Pakistan', official_name: 'Islamic Republic of Pakistan', capital: 'Islamabad', continent_code: 'AS', region: 'Asia', sub_region: 'Southern Asia', phone_code: '+92' },
        { code: 'PS', code3: 'PSE', numeric_code: '275', name: 'Palestine', official_name: 'State of Palestine', capital: 'East Jerusalem', continent_code: 'AS', region: 'Asia', sub_region: 'Western Asia', phone_code: '+970' },
        { code: 'PH', code3: 'PHL', numeric_code: '608', name: 'Philippines', official_name: 'Republic of the Philippines', capital: 'Manila', continent_code: 'AS', region: 'Asia', sub_region: 'South-Eastern Asia', phone_code: '+63' },
        { code: 'QA', code3: 'QAT', numeric_code: '634', name: 'Qatar', official_name: 'State of Qatar', capital: 'Doha', continent_code: 'AS', region: 'Asia', sub_region: 'Western Asia', phone_code: '+974' },
        { code: 'SA', code3: 'SAU', numeric_code: '682', name: 'Saudi Arabia', official_name: 'Kingdom of Saudi Arabia', capital: 'Riyadh', continent_code: 'AS', region: 'Asia', sub_region: 'Western Asia', phone_code: '+966' },
        { code: 'SG', code3: 'SGP', numeric_code: '702', name: 'Singapore', official_name: 'Republic of Singapore', capital: 'Singapore', continent_code: 'AS', region: 'Asia', sub_region: 'South-Eastern Asia', phone_code: '+65' },
        { code: 'KR', code3: 'KOR', numeric_code: '410', name: 'South Korea', official_name: 'Republic of Korea', capital: 'Seoul', continent_code: 'AS', region: 'Asia', sub_region: 'Eastern Asia', phone_code: '+82' },
        { code: 'LK', code3: 'LKA', numeric_code: '144', name: 'Sri Lanka', official_name: 'Democratic Socialist Republic of Sri Lanka', capital: 'Sri Jayawardenepura Kotte', continent_code: 'AS', region: 'Asia', sub_region: 'Southern Asia', phone_code: '+94' },
        { code: 'SY', code3: 'SYR', numeric_code: '760', name: 'Syria', official_name: 'Syrian Arab Republic', capital: 'Damascus', continent_code: 'AS', region: 'Asia', sub_region: 'Western Asia', phone_code: '+963' },
        { code: 'TW', code3: 'TWN', numeric_code: '158', name: 'Taiwan', official_name: 'Republic of China (Taiwan)', capital: 'Taipei', continent_code: 'AS', region: 'Asia', sub_region: 'Eastern Asia', phone_code: '+886' },
        { code: 'TJ', code3: 'TJK', numeric_code: '762', name: 'Tajikistan', official_name: 'Republic of Tajikistan', capital: 'Dushanbe', continent_code: 'AS', region: 'Asia', sub_region: 'Central Asia', phone_code: '+992' },
        { code: 'TH', code3: 'THA', numeric_code: '764', name: 'Thailand', official_name: 'Kingdom of Thailand', capital: 'Bangkok', continent_code: 'AS', region: 'Asia', sub_region: 'South-Eastern Asia', phone_code: '+66' },
        { code: 'TL', code3: 'TLS', numeric_code: '626', name: 'Timor-Leste', official_name: 'Democratic Republic of Timor-Leste', capital: 'Dili', continent_code: 'AS', region: 'Asia', sub_region: 'South-Eastern Asia', phone_code: '+670' },
        { code: 'TR', code3: 'TUR', numeric_code: '792', name: 'Turkey', official_name: 'Republic of Turkey', capital: 'Ankara', continent_code: 'AS', region: 'Asia', sub_region: 'Western Asia', phone_code: '+90' },
        { code: 'TM', code3: 'TKM', numeric_code: '795', name: 'Turkmenistan', official_name: 'Turkmenistan', capital: 'Ashgabat', continent_code: 'AS', region: 'Asia', sub_region: 'Central Asia', phone_code: '+993' },
        { code: 'AE', code3: 'ARE', numeric_code: '784', name: 'United Arab Emirates', official_name: 'United Arab Emirates', capital: 'Abu Dhabi', continent_code: 'AS', region: 'Asia', sub_region: 'Western Asia', phone_code: '+971' },
        { code: 'UZ', code3: 'UZB', numeric_code: '860', name: 'Uzbekistan', official_name: 'Republic of Uzbekistan', capital: 'Tashkent', continent_code: 'AS', region: 'Asia', sub_region: 'Central Asia', phone_code: '+998' },
        { code: 'VN', code3: 'VNM', numeric_code: '704', name: 'Vietnam', official_name: 'Socialist Republic of Vietnam', capital: 'Hanoi', continent_code: 'AS', region: 'Asia', sub_region: 'South-Eastern Asia', phone_code: '+84' },
        { code: 'YE', code3: 'YEM', numeric_code: '887', name: 'Yemen', official_name: 'Republic of Yemen', capital: 'Sana\'a', continent_code: 'AS', region: 'Asia', sub_region: 'Western Asia', phone_code: '+967' },

        // Europe (EU)
        { code: 'AL', code3: 'ALB', numeric_code: '008', name: 'Albania', official_name: 'Republic of Albania', capital: 'Tirana', continent_code: 'EU', region: 'Europe', sub_region: 'Southern Europe', phone_code: '+355' },
        { code: 'AD', code3: 'AND', numeric_code: '020', name: 'Andorra', official_name: 'Principality of Andorra', capital: 'Andorra la Vella', continent_code: 'EU', region: 'Europe', sub_region: 'Southern Europe', phone_code: '+376' },
        { code: 'AT', code3: 'AUT', numeric_code: '040', name: 'Austria', official_name: 'Republic of Austria', capital: 'Vienna', continent_code: 'EU', region: 'Europe', sub_region: 'Western Europe', phone_code: '+43' },
        { code: 'BY', code3: 'BLR', numeric_code: '112', name: 'Belarus', official_name: 'Republic of Belarus', capital: 'Minsk', continent_code: 'EU', region: 'Europe', sub_region: 'Eastern Europe', phone_code: '+375' },
        { code: 'BE', code3: 'BEL', numeric_code: '056', name: 'Belgium', official_name: 'Kingdom of Belgium', capital: 'Brussels', continent_code: 'EU', region: 'Europe', sub_region: 'Western Europe', phone_code: '+32' },
        { code: 'BA', code3: 'BIH', numeric_code: '070', name: 'Bosnia and Herzegovina', official_name: 'Bosnia and Herzegovina', capital: 'Sarajevo', continent_code: 'EU', region: 'Europe', sub_region: 'Southern Europe', phone_code: '+387' },
        { code: 'BG', code3: 'BGR', numeric_code: '100', name: 'Bulgaria', official_name: 'Republic of Bulgaria', capital: 'Sofia', continent_code: 'EU', region: 'Europe', sub_region: 'Eastern Europe', phone_code: '+359' },
        { code: 'HR', code3: 'HRV', numeric_code: '191', name: 'Croatia', official_name: 'Republic of Croatia', capital: 'Zagreb', continent_code: 'EU', region: 'Europe', sub_region: 'Southern Europe', phone_code: '+385' },
        { code: 'CZ', code3: 'CZE', numeric_code: '203', name: 'Czech Republic', official_name: 'Czech Republic', capital: 'Prague', continent_code: 'EU', region: 'Europe', sub_region: 'Eastern Europe', phone_code: '+420' },
        { code: 'DK', code3: 'DNK', numeric_code: '208', name: 'Denmark', official_name: 'Kingdom of Denmark', capital: 'Copenhagen', continent_code: 'EU', region: 'Europe', sub_region: 'Northern Europe', phone_code: '+45' },
        { code: 'EE', code3: 'EST', numeric_code: '233', name: 'Estonia', official_name: 'Republic of Estonia', capital: 'Tallinn', continent_code: 'EU', region: 'Europe', sub_region: 'Northern Europe', phone_code: '+372' },
        { code: 'FI', code3: 'FIN', numeric_code: '246', name: 'Finland', official_name: 'Republic of Finland', capital: 'Helsinki', continent_code: 'EU', region: 'Europe', sub_region: 'Northern Europe', phone_code: '+358' },
        { code: 'FR', code3: 'FRA', numeric_code: '250', name: 'France', official_name: 'French Republic', capital: 'Paris', continent_code: 'EU', region: 'Europe', sub_region: 'Western Europe', phone_code: '+33' },
        { code: 'DE', code3: 'DEU', numeric_code: '276', name: 'Germany', official_name: 'Federal Republic of Germany', capital: 'Berlin', continent_code: 'EU', region: 'Europe', sub_region: 'Western Europe', phone_code: '+49' },
        { code: 'GR', code3: 'GRC', numeric_code: '300', name: 'Greece', official_name: 'Hellenic Republic', capital: 'Athens', continent_code: 'EU', region: 'Europe', sub_region: 'Southern Europe', phone_code: '+30' },
        { code: 'HU', code3: 'HUN', numeric_code: '348', name: 'Hungary', official_name: 'Hungary', capital: 'Budapest', continent_code: 'EU', region: 'Europe', sub_region: 'Eastern Europe', phone_code: '+36' },
        { code: 'IS', code3: 'ISL', numeric_code: '352', name: 'Iceland', official_name: 'Republic of Iceland', capital: 'Reykjavik', continent_code: 'EU', region: 'Europe', sub_region: 'Northern Europe', phone_code: '+354' },
        { code: 'IE', code3: 'IRL', numeric_code: '372', name: 'Ireland', official_name: 'Republic of Ireland', capital: 'Dublin', continent_code: 'EU', region: 'Europe', sub_region: 'Northern Europe', phone_code: '+353' },
        { code: 'IT', code3: 'ITA', numeric_code: '380', name: 'Italy', official_name: 'Italian Republic', capital: 'Rome', continent_code: 'EU', region: 'Europe', sub_region: 'Southern Europe', phone_code: '+39' },
        { code: 'XK', code3: 'XKX', numeric_code: '383', name: 'Kosovo', official_name: 'Republic of Kosovo', capital: 'Pristina', continent_code: 'EU', region: 'Europe', sub_region: 'Southern Europe', phone_code: '+383' },
        { code: 'LV', code3: 'LVA', numeric_code: '428', name: 'Latvia', official_name: 'Republic of Latvia', capital: 'Riga', continent_code: 'EU', region: 'Europe', sub_region: 'Northern Europe', phone_code: '+371' },
        { code: 'LI', code3: 'LIE', numeric_code: '438', name: 'Liechtenstein', official_name: 'Principality of Liechtenstein', capital: 'Vaduz', continent_code: 'EU', region: 'Europe', sub_region: 'Western Europe', phone_code: '+423' },
        { code: 'LT', code3: 'LTU', numeric_code: '440', name: 'Lithuania', official_name: 'Republic of Lithuania', capital: 'Vilnius', continent_code: 'EU', region: 'Europe', sub_region: 'Northern Europe', phone_code: '+370' },
        { code: 'LU', code3: 'LUX', numeric_code: '442', name: 'Luxembourg', official_name: 'Grand Duchy of Luxembourg', capital: 'Luxembourg', continent_code: 'EU', region: 'Europe', sub_region: 'Western Europe', phone_code: '+352' },
        { code: 'MT', code3: 'MLT', numeric_code: '470', name: 'Malta', official_name: 'Republic of Malta', capital: 'Valletta', continent_code: 'EU', region: 'Europe', sub_region: 'Southern Europe', phone_code: '+356' },
        { code: 'MD', code3: 'MDA', numeric_code: '498', name: 'Moldova', official_name: 'Republic of Moldova', capital: 'Chișinău', continent_code: 'EU', region: 'Europe', sub_region: 'Eastern Europe', phone_code: '+373' },
        { code: 'MC', code3: 'MCO', numeric_code: '492', name: 'Monaco', official_name: 'Principality of Monaco', capital: 'Monaco', continent_code: 'EU', region: 'Europe', sub_region: 'Western Europe', phone_code: '+377' },
        { code: 'ME', code3: 'MNE', numeric_code: '499', name: 'Montenegro', official_name: 'Montenegro', capital: 'Podgorica', continent_code: 'EU', region: 'Europe', sub_region: 'Southern Europe', phone_code: '+382' },
        { code: 'NL', code3: 'NLD', numeric_code: '528', name: 'Netherlands', official_name: 'Kingdom of the Netherlands', capital: 'Amsterdam', continent_code: 'EU', region: 'Europe', sub_region: 'Western Europe', phone_code: '+31' },
        { code: 'MK', code3: 'MKD', numeric_code: '807', name: 'North Macedonia', official_name: 'Republic of North Macedonia', capital: 'Skopje', continent_code: 'EU', region: 'Europe', sub_region: 'Southern Europe', phone_code: '+389' },
        { code: 'NO', code3: 'NOR', numeric_code: '578', name: 'Norway', official_name: 'Kingdom of Norway', capital: 'Oslo', continent_code: 'EU', region: 'Europe', sub_region: 'Northern Europe', phone_code: '+47' },
        { code: 'PL', code3: 'POL', numeric_code: '616', name: 'Poland', official_name: 'Republic of Poland', capital: 'Warsaw', continent_code: 'EU', region: 'Europe', sub_region: 'Eastern Europe', phone_code: '+48' },
        { code: 'PT', code3: 'PRT', numeric_code: '620', name: 'Portugal', official_name: 'Portuguese Republic', capital: 'Lisbon', continent_code: 'EU', region: 'Europe', sub_region: 'Southern Europe', phone_code: '+351' },
        { code: 'RO', code3: 'ROU', numeric_code: '642', name: 'Romania', official_name: 'Romania', capital: 'Bucharest', continent_code: 'EU', region: 'Europe', sub_region: 'Eastern Europe', phone_code: '+40' },
        { code: 'RU', code3: 'RUS', numeric_code: '643', name: 'Russia', official_name: 'Russian Federation', capital: 'Moscow', continent_code: 'EU', region: 'Europe', sub_region: 'Eastern Europe', phone_code: '+7' },
        { code: 'SM', code3: 'SMR', numeric_code: '674', name: 'San Marino', official_name: 'Republic of San Marino', capital: 'San Marino', continent_code: 'EU', region: 'Europe', sub_region: 'Southern Europe', phone_code: '+378' },
        { code: 'RS', code3: 'SRB', numeric_code: '688', name: 'Serbia', official_name: 'Republic of Serbia', capital: 'Belgrade', continent_code: 'EU', region: 'Europe', sub_region: 'Southern Europe', phone_code: '+381' },
        { code: 'SK', code3: 'SVK', numeric_code: '703', name: 'Slovakia', official_name: 'Slovak Republic', capital: 'Bratislava', continent_code: 'EU', region: 'Europe', sub_region: 'Eastern Europe', phone_code: '+421' },
        { code: 'SI', code3: 'SVN', numeric_code: '705', name: 'Slovenia', official_name: 'Republic of Slovenia', capital: 'Ljubljana', continent_code: 'EU', region: 'Europe', sub_region: 'Southern Europe', phone_code: '+386' },
        { code: 'ES', code3: 'ESP', numeric_code: '724', name: 'Spain', official_name: 'Kingdom of Spain', capital: 'Madrid', continent_code: 'EU', region: 'Europe', sub_region: 'Southern Europe', phone_code: '+34' },
        { code: 'SE', code3: 'SWE', numeric_code: '752', name: 'Sweden', official_name: 'Kingdom of Sweden', capital: 'Stockholm', continent_code: 'EU', region: 'Europe', sub_region: 'Northern Europe', phone_code: '+46' },
        { code: 'CH', code3: 'CHE', numeric_code: '756', name: 'Switzerland', official_name: 'Swiss Confederation', capital: 'Bern', continent_code: 'EU', region: 'Europe', sub_region: 'Western Europe', phone_code: '+41' },
        { code: 'UA', code3: 'UKR', numeric_code: '804', name: 'Ukraine', official_name: 'Ukraine', capital: 'Kiev', continent_code: 'EU', region: 'Europe', sub_region: 'Eastern Europe', phone_code: '+380' },
        { code: 'GB', code3: 'GBR', numeric_code: '826', name: 'United Kingdom', official_name: 'United Kingdom of Great Britain and Northern Ireland', capital: 'London', continent_code: 'EU', region: 'Europe', sub_region: 'Northern Europe', phone_code: '+44' },
        { code: 'VA', code3: 'VAT', numeric_code: '336', name: 'Vatican City', official_name: 'Vatican City State', capital: 'Vatican City', continent_code: 'EU', region: 'Europe', sub_region: 'Southern Europe', phone_code: '+379' },

        // North America (NA)
        { code: 'AG', code3: 'ATG', numeric_code: '028', name: 'Antigua and Barbuda', official_name: 'Antigua and Barbuda', capital: 'Saint John\'s', continent_code: 'NA', region: 'Americas', sub_region: 'Caribbean', phone_code: '+1268' },
        { code: 'BS', code3: 'BHS', numeric_code: '044', name: 'Bahamas', official_name: 'Commonwealth of the Bahamas', capital: 'Nassau', continent_code: 'NA', region: 'Americas', sub_region: 'Caribbean', phone_code: '+1242' },
        { code: 'BB', code3: 'BRB', numeric_code: '052', name: 'Barbados', official_name: 'Barbados', capital: 'Bridgetown', continent_code: 'NA', region: 'Americas', sub_region: 'Caribbean', phone_code: '+1246' },
        { code: 'BZ', code3: 'BLZ', numeric_code: '084', name: 'Belize', official_name: 'Belize', capital: 'Belmopan', continent_code: 'NA', region: 'Americas', sub_region: 'Central America', phone_code: '+501' },
        { code: 'CA', code3: 'CAN', numeric_code: '124', name: 'Canada', official_name: 'Canada', capital: 'Ottawa', continent_code: 'NA', region: 'Americas', sub_region: 'Northern America', phone_code: '+1' },
        { code: 'CR', code3: 'CRI', numeric_code: '188', name: 'Costa Rica', official_name: 'Republic of Costa Rica', capital: 'San José', continent_code: 'NA', region: 'Americas', sub_region: 'Central America', phone_code: '+506' },
        { code: 'CU', code3: 'CUB', numeric_code: '192', name: 'Cuba', official_name: 'Republic of Cuba', capital: 'Havana', continent_code: 'NA', region: 'Americas', sub_region: 'Caribbean', phone_code: '+53' },
        { code: 'DM', code3: 'DMA', numeric_code: '212', name: 'Dominica', official_name: 'Commonwealth of Dominica', capital: 'Roseau', continent_code: 'NA', region: 'Americas', sub_region: 'Caribbean', phone_code: '+1767' },
        { code: 'DO', code3: 'DOM', numeric_code: '214', name: 'Dominican Republic', official_name: 'Dominican Republic', capital: 'Santo Domingo', continent_code: 'NA', region: 'Americas', sub_region: 'Caribbean', phone_code: '+1809' },
        { code: 'SV', code3: 'SLV', numeric_code: '222', name: 'El Salvador', official_name: 'Republic of El Salvador', capital: 'San Salvador', continent_code: 'NA', region: 'Americas', sub_region: 'Central America', phone_code: '+503' },
        { code: 'GD', code3: 'GRD', numeric_code: '308', name: 'Grenada', official_name: 'Grenada', capital: 'Saint George\'s', continent_code: 'NA', region: 'Americas', sub_region: 'Caribbean', phone_code: '+1473' },
        { code: 'GT', code3: 'GTM', numeric_code: '320', name: 'Guatemala', official_name: 'Republic of Guatemala', capital: 'Guatemala City', continent_code: 'NA', region: 'Americas', sub_region: 'Central America', phone_code: '+502' },
        { code: 'HT', code3: 'HTI', numeric_code: '332', name: 'Haiti', official_name: 'Republic of Haiti', capital: 'Port-au-Prince', continent_code: 'NA', region: 'Americas', sub_region: 'Caribbean', phone_code: '+509' },
        { code: 'HN', code3: 'HND', numeric_code: '340', name: 'Honduras', official_name: 'Republic of Honduras', capital: 'Tegucigalpa', continent_code: 'NA', region: 'Americas', sub_region: 'Central America', phone_code: '+504' },
        { code: 'JM', code3: 'JAM', numeric_code: '388', name: 'Jamaica', official_name: 'Jamaica', capital: 'Kingston', continent_code: 'NA', region: 'Americas', sub_region: 'Caribbean', phone_code: '+1876' },
        { code: 'MX', code3: 'MEX', numeric_code: '484', name: 'Mexico', official_name: 'United Mexican States', capital: 'Mexico City', continent_code: 'NA', region: 'Americas', sub_region: 'Central America', phone_code: '+52' },
        { code: 'NI', code3: 'NIC', numeric_code: '558', name: 'Nicaragua', official_name: 'Republic of Nicaragua', capital: 'Managua', continent_code: 'NA', region: 'Americas', sub_region: 'Central America', phone_code: '+505' },
        { code: 'PA', code3: 'PAN', numeric_code: '591', name: 'Panama', official_name: 'Republic of Panama', capital: 'Panama City', continent_code: 'NA', region: 'Americas', sub_region: 'Central America', phone_code: '+507' },
        { code: 'KN', code3: 'KNA', numeric_code: '659', name: 'Saint Kitts and Nevis', official_name: 'Federation of Saint Christopher and Nevis', capital: 'Basseterre', continent_code: 'NA', region: 'Americas', sub_region: 'Caribbean', phone_code: '+1869' },
        { code: 'LC', code3: 'LCA', numeric_code: '662', name: 'Saint Lucia', official_name: 'Saint Lucia', capital: 'Castries', continent_code: 'NA', region: 'Americas', sub_region: 'Caribbean', phone_code: '+1758' },
        { code: 'VC', code3: 'VCT', numeric_code: '670', name: 'Saint Vincent and the Grenadines', official_name: 'Saint Vincent and the Grenadines', capital: 'Kingstown', continent_code: 'NA', region: 'Americas', sub_region: 'Caribbean', phone_code: '+1784' },
        { code: 'TT', code3: 'TTO', numeric_code: '780', name: 'Trinidad and Tobago', official_name: 'Republic of Trinidad and Tobago', capital: 'Port of Spain', continent_code: 'NA', region: 'Americas', sub_region: 'Caribbean', phone_code: '+1868' },
        { code: 'US', code3: 'USA', numeric_code: '840', name: 'United States', official_name: 'United States of America', capital: 'Washington, D.C.', continent_code: 'NA', region: 'Americas', sub_region: 'Northern America', phone_code: '+1' },

        // South America (SA)
        { code: 'AR', code3: 'ARG', numeric_code: '032', name: 'Argentina', official_name: 'Argentine Republic', capital: 'Buenos Aires', continent_code: 'SA', region: 'Americas', sub_region: 'South America', phone_code: '+54' },
        { code: 'BO', code3: 'BOL', numeric_code: '068', name: 'Bolivia', official_name: 'Plurinational State of Bolivia', capital: 'Sucre', continent_code: 'SA', region: 'Americas', sub_region: 'South America', phone_code: '+591' },
        { code: 'BR', code3: 'BRA', numeric_code: '076', name: 'Brazil', official_name: 'Federative Republic of Brazil', capital: 'Brasília', continent_code: 'SA', region: 'Americas', sub_region: 'South America', phone_code: '+55' },
        { code: 'CL', code3: 'CHL', numeric_code: '152', name: 'Chile', official_name: 'Republic of Chile', capital: 'Santiago', continent_code: 'SA', region: 'Americas', sub_region: 'South America', phone_code: '+56' },
        { code: 'CO', code3: 'COL', numeric_code: '170', name: 'Colombia', official_name: 'Republic of Colombia', capital: 'Bogotá', continent_code: 'SA', region: 'Americas', sub_region: 'South America', phone_code: '+57' },
        { code: 'EC', code3: 'ECU', numeric_code: '218', name: 'Ecuador', official_name: 'Republic of Ecuador', capital: 'Quito', continent_code: 'SA', region: 'Americas', sub_region: 'South America', phone_code: '+593' },
        { code: 'FK', code3: 'FLK', numeric_code: '238', name: 'Falkland Islands', official_name: 'Falkland Islands', capital: 'Stanley', continent_code: 'SA', region: 'Americas', sub_region: 'South America', phone_code: '+500' },
        { code: 'GF', code3: 'GUF', numeric_code: '254', name: 'French Guiana', official_name: 'Guiana', capital: 'Cayenne', continent_code: 'SA', region: 'Americas', sub_region: 'South America', phone_code: '+594' },
        { code: 'GY', code3: 'GUY', numeric_code: '328', name: 'Guyana', official_name: 'Co-operative Republic of Guyana', capital: 'Georgetown', continent_code: 'SA', region: 'Americas', sub_region: 'South America', phone_code: '+592' },
        { code: 'PY', code3: 'PRY', numeric_code: '600', name: 'Paraguay', official_name: 'Republic of Paraguay', capital: 'Asunción', continent_code: 'SA', region: 'Americas', sub_region: 'South America', phone_code: '+595' },
        { code: 'PE', code3: 'PER', numeric_code: '604', name: 'Peru', official_name: 'Republic of Peru', capital: 'Lima', continent_code: 'SA', region: 'Americas', sub_region: 'South America', phone_code: '+51' },
        { code: 'SR', code3: 'SUR', numeric_code: '740', name: 'Suriname', official_name: 'Republic of Suriname', capital: 'Paramaribo', continent_code: 'SA', region: 'Americas', sub_region: 'South America', phone_code: '+597' },
        { code: 'UY', code3: 'URY', numeric_code: '858', name: 'Uruguay', official_name: 'Oriental Republic of Uruguay', capital: 'Montevideo', continent_code: 'SA', region: 'Americas', sub_region: 'South America', phone_code: '+598' },
        { code: 'VE', code3: 'VEN', numeric_code: '862', name: 'Venezuela', official_name: 'Bolivarian Republic of Venezuela', capital: 'Caracas', continent_code: 'SA', region: 'Americas', sub_region: 'South America', phone_code: '+58' },

        // Oceania (OC)
        { code: 'AU', code3: 'AUS', numeric_code: '036', name: 'Australia', official_name: 'Commonwealth of Australia', capital: 'Canberra', continent_code: 'OC', region: 'Oceania', sub_region: 'Australia and New Zealand', phone_code: '+61' },
        { code: 'FJ', code3: 'FJI', numeric_code: '242', name: 'Fiji', official_name: 'Republic of Fiji', capital: 'Suva', continent_code: 'OC', region: 'Oceania', sub_region: 'Melanesia', phone_code: '+679' },
        { code: 'KI', code3: 'KIR', numeric_code: '296', name: 'Kiribati', official_name: 'Republic of Kiribati', capital: 'Tarawa', continent_code: 'OC', region: 'Oceania', sub_region: 'Micronesia', phone_code: '+686' },
        { code: 'MH', code3: 'MHL', numeric_code: '584', name: 'Marshall Islands', official_name: 'Republic of the Marshall Islands', capital: 'Majuro', continent_code: 'OC', region: 'Oceania', sub_region: 'Micronesia', phone_code: '+692' },
        { code: 'FM', code3: 'FSM', numeric_code: '583', name: 'Micronesia', official_name: 'Federated States of Micronesia', capital: 'Palikir', continent_code: 'OC', region: 'Oceania', sub_region: 'Micronesia', phone_code: '+691' },
        { code: 'NR', code3: 'NRU', numeric_code: '520', name: 'Nauru', official_name: 'Republic of Nauru', capital: 'Yaren', continent_code: 'OC', region: 'Oceania', sub_region: 'Micronesia', phone_code: '+674' },
        { code: 'NZ', code3: 'NZL', numeric_code: '554', name: 'New Zealand', official_name: 'New Zealand', capital: 'Wellington', continent_code: 'OC', region: 'Oceania', sub_region: 'Australia and New Zealand', phone_code: '+64' },
        { code: 'PW', code3: 'PLW', numeric_code: '585', name: 'Palau', official_name: 'Republic of Palau', capital: 'Ngerulmud', continent_code: 'OC', region: 'Oceania', sub_region: 'Micronesia', phone_code: '+680' },
        { code: 'PG', code3: 'PNG', numeric_code: '598', name: 'Papua New Guinea', official_name: 'Independent State of Papua New Guinea', capital: 'Port Moresby', continent_code: 'OC', region: 'Oceania', sub_region: 'Melanesia', phone_code: '+675' },
        { code: 'WS', code3: 'WSM', numeric_code: '882', name: 'Samoa', official_name: 'Independent State of Samoa', capital: 'Apia', continent_code: 'OC', region: 'Oceania', sub_region: 'Polynesia', phone_code: '+685' },
        { code: 'SB', code3: 'SLB', numeric_code: '090', name: 'Solomon Islands', official_name: 'Solomon Islands', capital: 'Honiara', continent_code: 'OC', region: 'Oceania', sub_region: 'Melanesia', phone_code: '+677' },
        { code: 'TO', code3: 'TON', numeric_code: '776', name: 'Tonga', official_name: 'Kingdom of Tonga', capital: 'Nuku\'alofa', continent_code: 'OC', region: 'Oceania', sub_region: 'Polynesia', phone_code: '+676' },
        { code: 'TV', code3: 'TUV', numeric_code: '798', name: 'Tuvalu', official_name: 'Tuvalu', capital: 'Funafuti', continent_code: 'OC', region: 'Oceania', sub_region: 'Polynesia', phone_code: '+688' },
        { code: 'VU', code3: 'VUT', numeric_code: '548', name: 'Vanuatu', official_name: 'Republic of Vanuatu', capital: 'Port Vila', continent_code: 'OC', region: 'Oceania', sub_region: 'Melanesia', phone_code: '+678' }
    ]

    // Process countries in batches to avoid overwhelming the database
    const batchSize = 50
    let processed = 0

    for (let i = 0; i < allCountries.length; i += batchSize) {
        const batch = allCountries.slice(i, i + batchSize)

        for (const country of batch) {
            // Get continent ID by code
            const continent = await dbGet('SELECT id FROM continents WHERE code = ?', [country.continent_code])

            if (!continent) {
                console.log(`Continent with code ${country.continent_code} not found for country ${country.name}`)
                continue
            }

            // Check if country already exists
            const existing = await dbGet('SELECT id FROM country WHERE code = ?', [country.code])

            if (!existing) {
                await dbRun(`
                    INSERT INTO country (code, code3, numeric_code, name, official_name, capital, continent_id, region, sub_region, phone_code)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    country.code, country.code3, country.numeric_code, country.name,
                    country.official_name, country.capital, continent.id,
                    country.region, country.sub_region, country.phone_code
                ])
                processed++
            }
        }

        console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allCountries.length / batchSize)} - ${processed} countries added`)
    }

    await recordMigration(migrationName)
    console.log(`Migration ${migrationName} completed successfully - Added ${processed} countries`)
}

// Migration 005: Create organization_legal_type table
export async function migration_005_create_organization_legal_type_table() {
    const migrationName = '005_create_organization_legal_type_table'

    if (await migrationExists(migrationName)) {
        console.log(`Migration ${migrationName} already executed, skipping...`)
        return
    }

    console.log(`Executing migration: ${migrationName}`)

    // Create organization_legal_type table
    await dbRun(`
        CREATE TABLE IF NOT EXISTS organization_legal_type (
            id TEXT PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            abbreviation TEXT,
            jurisdiction_country_code TEXT NOT NULL,
            jurisdiction_region TEXT,
            description TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (jurisdiction_country_code) REFERENCES country(code)
        )
    `)

    // Create indexes
    await dbRun('CREATE INDEX IF NOT EXISTS idx_org_legal_type_code ON organization_legal_type(code)')
    await dbRun('CREATE INDEX IF NOT EXISTS idx_org_legal_type_name ON organization_legal_type(name)')
    await dbRun('CREATE INDEX IF NOT EXISTS idx_org_legal_type_country ON organization_legal_type(jurisdiction_country_code)')
    await dbRun('CREATE INDEX IF NOT EXISTS idx_org_legal_type_active ON organization_legal_type(is_active)')
    await dbRun('CREATE INDEX IF NOT EXISTS idx_org_legal_type_jurisdiction ON organization_legal_type(jurisdiction_country_code, jurisdiction_region)')

    await recordMigration(migrationName)
    console.log(`Migration ${migrationName} completed successfully`)
}

// Migration 006: Add common organization legal types
export async function migration_006_add_common_legal_types() {
    const migrationName = '006_add_common_legal_types'

    if (await migrationExists(migrationName)) {
        console.log(`Migration ${migrationName} already executed, skipping...`)
        return
    }

    console.log(`Executing migration: ${migrationName}`)

    const commonLegalTypes = [
        // United States
        { code: 'LLC_US', name: 'Limited Liability Company', abbreviation: 'LLC', country: 'US', description: 'Flexible business structure that provides limited liability protection' },
        { code: 'CORP_US', name: 'Corporation', abbreviation: 'Corp.', country: 'US', description: 'Separate legal entity with shareholders, directors, and officers' },
        { code: 'LLP_US', name: 'Limited Liability Partnership', abbreviation: 'LLP', country: 'US', description: 'Partnership where partners have limited liability' },
        { code: 'LP_US', name: 'Limited Partnership', abbreviation: 'LP', country: 'US', description: 'Partnership with general and limited partners' },
        { code: 'SOLE_PROP_US', name: 'Sole Proprietorship', abbreviation: 'Sole Prop.', country: 'US', description: 'Unincorporated business owned by one person' },

        // United Kingdom
        { code: 'LTD_UK', name: 'Private Limited Company', abbreviation: 'Ltd.', country: 'GB', description: 'Private company limited by shares' },
        { code: 'PLC_UK', name: 'Public Limited Company', abbreviation: 'PLC', country: 'GB', description: 'Public company limited by shares' },
        { code: 'LLP_UK', name: 'Limited Liability Partnership', abbreviation: 'LLP', country: 'GB', description: 'Corporate body with limited liability' },
        { code: 'PART_UK', name: 'Partnership', abbreviation: 'Partnership', country: 'GB', description: 'Business owned by two or more people' },

        // India
        { code: 'PVT_LTD_IN', name: 'Private Limited Company', abbreviation: 'Pvt Ltd', country: 'IN', description: 'Private company limited by shares under Companies Act' },
        { code: 'LTD_IN', name: 'Public Limited Company', abbreviation: 'Ltd', country: 'IN', description: 'Public company limited by shares' },
        { code: 'LLP_IN', name: 'Limited Liability Partnership', abbreviation: 'LLP', country: 'IN', description: 'Partnership with limited liability under LLP Act' },
        { code: 'PART_IN', name: 'Partnership Firm', abbreviation: 'Partnership', country: 'IN', description: 'Partnership governed by Partnership Act' },
        { code: 'SOLE_PROP_IN', name: 'Sole Proprietorship', abbreviation: 'Proprietorship', country: 'IN', description: 'Business owned by single individual' },

        // Germany
        { code: 'GMBH_DE', name: 'Gesellschaft mit beschränkter Haftung', abbreviation: 'GmbH', country: 'DE', description: 'Private limited liability company' },
        { code: 'AG_DE', name: 'Aktiengesellschaft', abbreviation: 'AG', country: 'DE', description: 'Public stock corporation' },
        { code: 'KG_DE', name: 'Kommanditgesellschaft', abbreviation: 'KG', country: 'DE', description: 'Limited partnership' },
        { code: 'OHG_DE', name: 'Offene Handelsgesellschaft', abbreviation: 'OHG', country: 'DE', description: 'General partnership' },

        // France
        { code: 'SARL_FR', name: 'Société à responsabilité limitée', abbreviation: 'SARL', country: 'FR', description: 'Limited liability company' },
        { code: 'SA_FR', name: 'Société anonyme', abbreviation: 'SA', country: 'FR', description: 'Public limited company' },
        { code: 'SAS_FR', name: 'Société par actions simplifiée', abbreviation: 'SAS', country: 'FR', description: 'Simplified joint-stock company' },
        { code: 'EURL_FR', name: 'Entreprise unipersonnelle à responsabilité limitée', abbreviation: 'EURL', country: 'FR', description: 'Single-member limited liability company' },

        // Netherlands
        { code: 'BV_NL', name: 'Besloten vennootschap', abbreviation: 'B.V.', country: 'NL', description: 'Private limited liability company' },
        { code: 'NV_NL', name: 'Naamloze vennootschap', abbreviation: 'N.V.', country: 'NL', description: 'Public limited liability company' },
        { code: 'VOF_NL', name: 'Vennootschap onder firma', abbreviation: 'V.O.F.', country: 'NL', description: 'General partnership' },

        // Italy
        { code: 'SRL_IT', name: 'Società a responsabilità limitata', abbreviation: 'S.r.l.', country: 'IT', description: 'Limited liability company' },
        { code: 'SPA_IT', name: 'Società per azioni', abbreviation: 'S.p.A.', country: 'IT', description: 'Joint-stock company' },
        { code: 'SAS_IT', name: 'Società in accomandita semplice', abbreviation: 'S.a.s.', country: 'IT', description: 'Limited partnership' },

        // Canada
        { code: 'CORP_CA', name: 'Corporation', abbreviation: 'Corp.', country: 'CA', description: 'Federal or provincial corporation' },
        { code: 'LP_CA', name: 'Limited Partnership', abbreviation: 'LP', country: 'CA', description: 'Partnership with limited liability' },
        { code: 'LLP_CA', name: 'Limited Liability Partnership', abbreviation: 'LLP', country: 'CA', description: 'Professional partnership with limited liability' },

        // Australia
        { code: 'PTY_LTD_AU', name: 'Proprietary Limited Company', abbreviation: 'Pty Ltd', country: 'AU', description: 'Private company limited by shares' },
        { code: 'LTD_AU', name: 'Public Company Limited', abbreviation: 'Ltd', country: 'AU', description: 'Public company limited by shares' },
        { code: 'PART_AU', name: 'Partnership', abbreviation: 'Partnership', country: 'AU', description: 'General partnership' },

        // Japan
        { code: 'KK_JP', name: 'Kabushiki Kaisha', abbreviation: 'K.K.', country: 'JP', description: 'Joint-stock company' },
        { code: 'GK_JP', name: 'Godo Kaisha', abbreviation: 'G.K.', country: 'JP', description: 'Limited liability company' },
        { code: 'GOMEI_JP', name: 'Gomei Kaisha', abbreviation: 'Gomei', country: 'JP', description: 'General partnership company' },

        // Singapore
        { code: 'PTE_LTD_SG', name: 'Private Limited Company', abbreviation: 'Pte Ltd', country: 'SG', description: 'Private company limited by shares' },
        { code: 'LTD_SG', name: 'Public Limited Company', abbreviation: 'Ltd', country: 'SG', description: 'Public company limited by shares' },
        { code: 'LLP_SG', name: 'Limited Liability Partnership', abbreviation: 'LLP', country: 'SG', description: 'Partnership with limited liability' }
    ]

    let processed = 0

    for (const legalType of commonLegalTypes) {
        // Check if legal type already exists
        const existing = await dbGet('SELECT id FROM organization_legal_type WHERE code = ?', [legalType.code])

        if (!existing) {
            const id = `OLT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

            await dbRun(`
                INSERT INTO organization_legal_type (id, code, name, abbreviation, jurisdiction_country_code, description)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                id, legalType.code, legalType.name, legalType.abbreviation,
                legalType.country, legalType.description
            ])
            processed++
        }
    }

    await recordMigration(migrationName)
    console.log(`Migration ${migrationName} completed successfully - Added ${processed} legal types`)
}

// Migration 007: Create industry_name table
export async function migration_007_create_industry_name_table() {
    const migrationName = '007_create_industry_name_table'

    if (await migrationExists(migrationName)) {
        console.log(`Migration ${migrationName} already executed, skipping...`)
        return
    }

    console.log(`Executing migration: ${migrationName}`)

    // Create industry_name table
    await dbRun(`
        CREATE TABLE IF NOT EXISTS industry_name (
            id TEXT PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            category TEXT,
            description TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `)

    // Create indexes
    const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_industry_code ON industry_name(code)',
        'CREATE INDEX IF NOT EXISTS idx_industry_name ON industry_name(name)',
        'CREATE INDEX IF NOT EXISTS idx_industry_category ON industry_name(category)',
        'CREATE INDEX IF NOT EXISTS idx_industry_active ON industry_name(is_active)'
    ]

    for (const indexSql of indexes) {
        await dbRun(indexSql)
    }

    await recordMigration(migrationName)
    console.log(`Migration ${migrationName} completed successfully`)
}

// Migration 008: Add common industries
export async function migration_008_add_common_industries() {
    const migrationName = '008_add_common_industries'

    if (await migrationExists(migrationName)) {
        console.log(`Migration ${migrationName} already executed, skipping...`)
        return
    }

    console.log(`Executing migration: ${migrationName}`)

    const commonIndustries = [
        // Technology
        { code: 'TECH_SOFTWARE', name: 'Software Development', category: 'Technology', description: 'Development of software applications and systems' },
        { code: 'TECH_HARDWARE', name: 'Computer Hardware', category: 'Technology', description: 'Manufacturing and distribution of computer hardware' },
        { code: 'TECH_SAAS', name: 'Software as a Service', category: 'Technology', description: 'Cloud-based software solutions' },
        { code: 'TECH_AI_ML', name: 'Artificial Intelligence & Machine Learning', category: 'Technology', description: 'AI and ML solutions and services' },
        { code: 'TECH_CYBERSECURITY', name: 'Cybersecurity', category: 'Technology', description: 'Information security and cybersecurity solutions' },
        { code: 'TECH_TELECOM', name: 'Telecommunications', category: 'Technology', description: 'Communication infrastructure and services' },

        // Finance
        { code: 'FIN_BANKING', name: 'Banking', category: 'Finance', description: 'Traditional banking and financial services' },
        { code: 'FIN_INVESTMENT', name: 'Investment Management', category: 'Finance', description: 'Investment and asset management services' },
        { code: 'FIN_INSURANCE', name: 'Insurance', category: 'Finance', description: 'Insurance products and services' },
        { code: 'FIN_FINTECH', name: 'Financial Technology', category: 'Finance', description: 'Technology-driven financial services' },
        { code: 'FIN_ACCOUNTING', name: 'Accounting & Auditing', category: 'Finance', description: 'Professional accounting and auditing services' },
        { code: 'FIN_CRYPTO', name: 'Cryptocurrency & Blockchain', category: 'Finance', description: 'Digital currency and blockchain technology' },

        // Healthcare
        { code: 'HC_HOSPITALS', name: 'Hospitals & Medical Centers', category: 'Healthcare', description: 'Hospital and medical facility operations' },
        { code: 'HC_PHARMA', name: 'Pharmaceuticals', category: 'Healthcare', description: 'Drug development and pharmaceutical manufacturing' },
        { code: 'HC_BIOTECH', name: 'Biotechnology', category: 'Healthcare', description: 'Biotechnology research and development' },
        { code: 'HC_MEDICAL_DEVICES', name: 'Medical Devices', category: 'Healthcare', description: 'Medical equipment and device manufacturing' },
        { code: 'HC_HEALTHTECH', name: 'Health Technology', category: 'Healthcare', description: 'Technology solutions for healthcare' },
        { code: 'HC_WELLNESS', name: 'Health & Wellness', category: 'Healthcare', description: 'Wellness and preventive health services' },

        // Manufacturing
        { code: 'MFG_AUTOMOTIVE', name: 'Automotive Manufacturing', category: 'Manufacturing', description: 'Vehicle and automotive parts manufacturing' },
        { code: 'MFG_AEROSPACE', name: 'Aerospace & Defense', category: 'Manufacturing', description: 'Aircraft and defense equipment manufacturing' },
        { code: 'MFG_ELECTRONICS', name: 'Electronics Manufacturing', category: 'Manufacturing', description: 'Electronic components and devices manufacturing' },
        { code: 'MFG_MACHINERY', name: 'Machinery & Equipment', category: 'Manufacturing', description: 'Industrial machinery manufacturing' },
        { code: 'MFG_TEXTILES', name: 'Textiles & Apparel', category: 'Manufacturing', description: 'Textile and clothing manufacturing' },
        { code: 'MFG_FOOD_BEVERAGE', name: 'Food & Beverage', category: 'Manufacturing', description: 'Food processing and beverage production' },

        // Retail & E-commerce
        { code: 'RETAIL_ECOMMERCE', name: 'E-commerce', category: 'Retail', description: 'Online retail and marketplace platforms' },
        { code: 'RETAIL_FASHION', name: 'Fashion & Apparel', category: 'Retail', description: 'Fashion retail and clothing stores' },
        { code: 'RETAIL_GROCERY', name: 'Grocery & Supermarkets', category: 'Retail', description: 'Grocery stores and supermarket chains' },
        { code: 'RETAIL_ELECTRONICS', name: 'Electronics Retail', category: 'Retail', description: 'Consumer electronics retail' },
        { code: 'RETAIL_AUTOMOTIVE', name: 'Automotive Retail', category: 'Retail', description: 'Car dealerships and automotive retail' },

        // Education
        { code: 'EDU_HIGHER', name: 'Higher Education', category: 'Education', description: 'Universities and colleges' },
        { code: 'EDU_K12', name: 'K-12 Education', category: 'Education', description: 'Primary and secondary schools' },
        { code: 'EDU_ONLINE', name: 'Online Education', category: 'Education', description: 'Online learning platforms and courses' },
        { code: 'EDU_TRAINING', name: 'Professional Training', category: 'Education', description: 'Professional development and training services' },
        { code: 'EDU_RESEARCH', name: 'Research Institutions', category: 'Education', description: 'Academic and scientific research organizations' },

        // Real Estate
        { code: 'RE_DEVELOPMENT', name: 'Real Estate Development', category: 'Real Estate', description: 'Property development and construction' },
        { code: 'RE_INVESTMENT', name: 'Real Estate Investment', category: 'Real Estate', description: 'Property investment and management' },
        { code: 'RE_COMMERCIAL', name: 'Commercial Real Estate', category: 'Real Estate', description: 'Commercial property services' },
        { code: 'RE_RESIDENTIAL', name: 'Residential Real Estate', category: 'Real Estate', description: 'Residential property services' },
        { code: 'RE_PROPTECH', name: 'Property Technology', category: 'Real Estate', description: 'Technology solutions for real estate' },

        // Energy & Utilities
        { code: 'ENERGY_OIL_GAS', name: 'Oil & Gas', category: 'Energy', description: 'Petroleum and natural gas industry' },
        { code: 'ENERGY_RENEWABLE', name: 'Renewable Energy', category: 'Energy', description: 'Solar, wind, and other renewable energy sources' },
        { code: 'ENERGY_UTILITIES', name: 'Utilities', category: 'Energy', description: 'Electric, water, and gas utilities' },
        { code: 'ENERGY_NUCLEAR', name: 'Nuclear Energy', category: 'Energy', description: 'Nuclear power generation' },

        // Transportation & Logistics
        { code: 'TRANS_SHIPPING', name: 'Shipping & Maritime', category: 'Transportation', description: 'Ocean freight and maritime services' },
        { code: 'TRANS_AVIATION', name: 'Aviation', category: 'Transportation', description: 'Airlines and aviation services' },
        { code: 'TRANS_LOGISTICS', name: 'Logistics & Supply Chain', category: 'Transportation', description: 'Freight forwarding and logistics services' },
        { code: 'TRANS_TRUCKING', name: 'Trucking & Ground Transport', category: 'Transportation', description: 'Ground transportation services' },
        { code: 'TRANS_RIDE_SHARING', name: 'Ride Sharing & Mobility', category: 'Transportation', description: 'Ride sharing and mobility services' },

        // Media & Entertainment
        { code: 'MEDIA_PUBLISHING', name: 'Publishing', category: 'Media', description: 'Book, magazine, and digital publishing' },
        { code: 'MEDIA_BROADCAST', name: 'Broadcasting', category: 'Media', description: 'Television and radio broadcasting' },
        { code: 'MEDIA_STREAMING', name: 'Streaming & Digital Media', category: 'Media', description: 'Online streaming and digital content platforms' },
        { code: 'MEDIA_GAMING', name: 'Gaming & Interactive Entertainment', category: 'Media', description: 'Video games and interactive entertainment' },
        { code: 'MEDIA_ADVERTISING', name: 'Advertising & Marketing', category: 'Media', description: 'Advertising agencies and marketing services' },

        // Professional Services
        { code: 'PROF_CONSULTING', name: 'Management Consulting', category: 'Professional Services', description: 'Business strategy and management consulting' },
        { code: 'PROF_LEGAL', name: 'Legal Services', category: 'Professional Services', description: 'Law firms and legal services' },
        { code: 'PROF_ARCHITECTURE', name: 'Architecture & Engineering', category: 'Professional Services', description: 'Architectural and engineering services' },
        { code: 'PROF_HR', name: 'Human Resources', category: 'Professional Services', description: 'HR consulting and staffing services' },
        { code: 'PROF_MARKETING', name: 'Marketing & PR', category: 'Professional Services', description: 'Marketing and public relations agencies' },

        // Government & Non-Profit
        { code: 'GOV_FEDERAL', name: 'Federal Government', category: 'Government', description: 'Federal government agencies and departments' },
        { code: 'GOV_STATE', name: 'State Government', category: 'Government', description: 'State government agencies' },
        { code: 'GOV_LOCAL', name: 'Local Government', category: 'Government', description: 'Municipal and local government' },
        { code: 'NPO_CHARITY', name: 'Charitable Organizations', category: 'Non-Profit', description: 'Charitable and philanthropic organizations' },
        { code: 'NPO_FOUNDATION', name: 'Foundations', category: 'Non-Profit', description: 'Private and public foundations' },
        { code: 'NPO_ADVOCACY', name: 'Advocacy Organizations', category: 'Non-Profit', description: 'Policy advocacy and lobbying organizations' },

        // Hospitality & Tourism
        { code: 'HOSP_HOTELS', name: 'Hotels & Lodging', category: 'Hospitality', description: 'Hotel chains and accommodation services' },
        { code: 'HOSP_RESTAURANTS', name: 'Restaurants & Food Service', category: 'Hospitality', description: 'Restaurant chains and food service' },
        { code: 'HOSP_TRAVEL', name: 'Travel & Tourism', category: 'Hospitality', description: 'Travel agencies and tourism services' },
        { code: 'HOSP_EVENTS', name: 'Events & Entertainment', category: 'Hospitality', description: 'Event planning and entertainment venues' },

        // Agriculture & Food
        { code: 'AGR_FARMING', name: 'Crop Production', category: 'Agriculture', description: 'Agricultural crop farming and production' },
        { code: 'AGR_LIVESTOCK', name: 'Livestock & Animal Husbandry', category: 'Agriculture', description: 'Livestock farming and animal products' },
        { code: 'AGR_FORESTRY', name: 'Forestry & Logging', category: 'Agriculture', description: 'Forest management and timber production' },
        { code: 'AGR_FISHERIES', name: 'Fisheries & Aquaculture', category: 'Agriculture', description: 'Fishing and fish farming operations' }
    ]

    let processed = 0

    for (const industry of commonIndustries) {
        // Check if industry already exists
        const existing = await dbGet('SELECT id FROM industry_name WHERE code = ?', [industry.code])

        if (!existing) {
            const id = `IND_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

            await dbRun(`
                INSERT INTO industry_name (id, code, name, category, description)
                VALUES (?, ?, ?, ?, ?)
            `, [
                id, industry.code, industry.name, industry.category, industry.description
            ])
            processed++
        }
    }

    await recordMigration(migrationName)
    console.log(`Migration ${migrationName} completed successfully - Added ${processed} industries`)
}

// Migration 009: Update organizations table with comprehensive schema
export async function migration_009_update_organizations_table() {
    const migrationName = '009_update_organizations_table'

    if (await migrationExists(migrationName)) {
        console.log(`Migration ${migrationName} already executed, skipping...`)
        return
    }

    console.log(`Executing migration: ${migrationName}`)

    // Check existing table structure
    const tableInfo = await new Promise((resolve, reject) => {
        db.all("PRAGMA table_info(organizations)", (err, rows) => {
            if (err) reject(err)
            else resolve(rows)
        })
    })

    const existingColumns = tableInfo.map(col => col.name)

    // Define all new columns to add
    const newColumns = [
        // Core Identity
        { name: 'legal_name', sql: 'ALTER TABLE organizations ADD COLUMN legal_name TEXT NOT NULL DEFAULT ""' },
        { name: 'tag_line', sql: 'ALTER TABLE organizations ADD COLUMN tag_line TEXT' },
        { name: 'mission_statement', sql: 'ALTER TABLE organizations ADD COLUMN mission_statement TEXT' },
        { name: 'brand_assets_url', sql: 'ALTER TABLE organizations ADD COLUMN brand_assets_url TEXT' },
        { name: 'sector', sql: 'ALTER TABLE organizations ADD COLUMN sector TEXT' },
        { name: 'organization_type', sql: 'ALTER TABLE organizations ADD COLUMN organization_type TEXT DEFAULT "private"' },

        // Ownership & Management
        { name: 'owner_id', sql: 'ALTER TABLE organizations ADD COLUMN owner_id TEXT' },
        { name: 'parent_org_id', sql: 'ALTER TABLE organizations ADD COLUMN parent_org_id TEXT' },
        { name: 'registration_number', sql: 'ALTER TABLE organizations ADD COLUMN registration_number TEXT' },
        { name: 'incorporation_number', sql: 'ALTER TABLE organizations ADD COLUMN incorporation_number TEXT' },
        { name: 'gst_number', sql: 'ALTER TABLE organizations ADD COLUMN gst_number TEXT' },
        { name: 'pan_number', sql: 'ALTER TABLE organizations ADD COLUMN pan_number TEXT' },

        // Digital Presence
        { name: 'sub_domain_to_v4l_app', sql: 'ALTER TABLE organizations ADD COLUMN sub_domain_to_v4l_app TEXT UNIQUE' },
        { name: 'website', sql: 'ALTER TABLE organizations ADD COLUMN website TEXT' },
        { name: 'social_links', sql: 'ALTER TABLE organizations ADD COLUMN social_links TEXT' },
        { name: 'support_email_address', sql: 'ALTER TABLE organizations ADD COLUMN support_email_address TEXT' },

        // Contact Info
        { name: 'primary_phone_number', sql: 'ALTER TABLE organizations ADD COLUMN primary_phone_number TEXT' },
        { name: 'primary_email_address', sql: 'ALTER TABLE organizations ADD COLUMN primary_email_address TEXT' },
        { name: 'fax_number', sql: 'ALTER TABLE organizations ADD COLUMN fax_number TEXT' },
        { name: 'address_line1', sql: 'ALTER TABLE organizations ADD COLUMN address_line1 TEXT' },
        { name: 'address_line2', sql: 'ALTER TABLE organizations ADD COLUMN address_line2 TEXT' },
        { name: 'city', sql: 'ALTER TABLE organizations ADD COLUMN city TEXT' },
        { name: 'state', sql: 'ALTER TABLE organizations ADD COLUMN state TEXT' },
        { name: 'postal_code', sql: 'ALTER TABLE organizations ADD COLUMN postal_code TEXT' },
        { name: 'country', sql: 'ALTER TABLE organizations ADD COLUMN country TEXT' },

        // Financial & Ops
        { name: 'fiscal_year_start_month', sql: 'ALTER TABLE organizations ADD COLUMN fiscal_year_start_month INTEGER DEFAULT 1' },
        { name: 'primary_currency_code', sql: 'ALTER TABLE organizations ADD COLUMN primary_currency_code TEXT DEFAULT "USD"' },
        { name: 'bank_account_number', sql: 'ALTER TABLE organizations ADD COLUMN bank_account_number TEXT' },
        { name: 'ifsc', sql: 'ALTER TABLE organizations ADD COLUMN ifsc TEXT' },
        { name: 'iban', sql: 'ALTER TABLE organizations ADD COLUMN iban TEXT' },
        { name: 'billing_address_id', sql: 'ALTER TABLE organizations ADD COLUMN billing_address_id TEXT' },
        { name: 'shipping_address_id', sql: 'ALTER TABLE organizations ADD COLUMN shipping_address_id TEXT' },

        // Regional Settings
        { name: 'main_time_zone', sql: 'ALTER TABLE organizations ADD COLUMN main_time_zone TEXT DEFAULT "UTC"' },
        { name: 'main_locale', sql: 'ALTER TABLE organizations ADD COLUMN main_locale TEXT DEFAULT "en_US"' },
        { name: 'country_of_incorporation', sql: 'ALTER TABLE organizations ADD COLUMN country_of_incorporation TEXT' },

        // Status & Compliance
        { name: 'status', sql: 'ALTER TABLE organizations ADD COLUMN status TEXT DEFAULT "active"' },
        { name: 'compliance_certifications', sql: 'ALTER TABLE organizations ADD COLUMN compliance_certifications TEXT' },
        { name: 'data_protection_officer_contact', sql: 'ALTER TABLE organizations ADD COLUMN data_protection_officer_contact TEXT' },

        // Audit / Metadata
        { name: 'updated_by', sql: 'ALTER TABLE organizations ADD COLUMN updated_by TEXT' },
        { name: 'notes', sql: 'ALTER TABLE organizations ADD COLUMN notes TEXT' },
        { name: 'internal_comments', sql: 'ALTER TABLE organizations ADD COLUMN internal_comments TEXT' }
    ]

    // Add missing columns
    for (const column of newColumns) {
        if (!existingColumns.includes(column.name)) {
            console.log(`Adding column: ${column.name}`)
            await dbRun(column.sql)
        } else {
            console.log(`Column ${column.name} already exists, skipping...`)
        }
    }

    // Update industry column to industry_id if not already updated
    if (existingColumns.includes('industry') && !existingColumns.includes('industry_id')) {
        console.log('Renaming industry column to industry_id')
        // SQLite doesn't support RENAME COLUMN directly in older versions
        // We'll add the new column and migrate data if needed
        await dbRun('ALTER TABLE organizations ADD COLUMN industry_id TEXT')
    }

    // Create additional indexes for new columns
    const newIndexes = [
        'CREATE INDEX IF NOT EXISTS idx_organization_legal_name ON organizations(legal_name)',
        'CREATE INDEX IF NOT EXISTS idx_organization_subdomain_v4l ON organizations(sub_domain_to_v4l_app)',
        'CREATE INDEX IF NOT EXISTS idx_organization_owner ON organizations(owner_id)',
        'CREATE INDEX IF NOT EXISTS idx_organization_parent ON organizations(parent_org_id)',
        'CREATE INDEX IF NOT EXISTS idx_organization_type ON organizations(organization_type)',
        'CREATE INDEX IF NOT EXISTS idx_organization_status ON organizations(status)',
        'CREATE INDEX IF NOT EXISTS idx_organization_country ON organizations(country)',
        'CREATE INDEX IF NOT EXISTS idx_organization_incorporation_country ON organizations(country_of_incorporation)',
        'CREATE INDEX IF NOT EXISTS idx_organization_city ON organizations(city)',
        'CREATE INDEX IF NOT EXISTS idx_organization_currency ON organizations(primary_currency_code)',
        'CREATE INDEX IF NOT EXISTS idx_organization_updated_by ON organizations(updated_by)'
    ]

    for (const indexSql of newIndexes) {
        await dbRun(indexSql)
    }

    await recordMigration(migrationName)
    console.log(`Migration ${migrationName} completed successfully`)
}

// Run all pending migrations
export async function runMigrations() {
    await initMigrationTable()
    await migration_001_add_person_fields()
    await migration_002_create_continent_table()
    await migration_003_create_country_table()
    await migration_004_add_all_countries()
    await migration_005_create_organization_legal_type_table()
    await migration_006_add_common_legal_types()
    await migration_007_create_industry_name_table()
    await migration_008_add_common_industries()
    await migration_009_update_organizations_table()
    console.log('All migrations completed')
}