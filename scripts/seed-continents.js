const { getDatabase, initializeDatabase } = require('../src/shared/db/database')

const continentsData = [
  {
    name: 'Asia',
    code: 'AS',
    areaSqKm: 44579000,
    population: 4641054775,
    numberOfCountries: 49,
    largestCountry: 'Russia',
    smallestCountry: 'Maldives',
    highestPoint: 'Mount Everest',
    highestPointElevation: 8848,
    lowestPoint: 'Dead Sea',
    lowestPointElevation: -430,
    timezoneZones: 'UTC+02:00 to UTC+12:00',
    languagesMajor: 'Chinese, Hindi, Arabic, Bengali, Japanese, Korean, Indonesian',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'Africa',
    code: 'AF',
    areaSqKm: 30370000,
    population: 1340598147,
    numberOfCountries: 54,
    largestCountry: 'Algeria',
    smallestCountry: 'Seychelles',
    highestPoint: 'Mount Kilimanjaro',
    highestPointElevation: 5895,
    lowestPoint: 'Lake Assal',
    lowestPointElevation: -155,
    timezoneZones: 'UTC-01:00 to UTC+04:00',
    languagesMajor: 'Arabic, Swahili, French, English, Portuguese, Hausa',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'North America',
    code: 'NA',
    areaSqKm: 24709000,
    population: 579024000,
    numberOfCountries: 23,
    largestCountry: 'Canada',
    smallestCountry: 'Saint Kitts and Nevis',
    highestPoint: 'Denali',
    highestPointElevation: 6190,
    lowestPoint: 'Death Valley',
    lowestPointElevation: -86,
    timezoneZones: 'UTC-10:00 to UTC-03:00',
    languagesMajor: 'English, Spanish, French',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'South America',
    code: 'SA',
    areaSqKm: 17840000,
    population: 434254119,
    numberOfCountries: 12,
    largestCountry: 'Brazil',
    smallestCountry: 'Suriname',
    highestPoint: 'Aconcagua',
    highestPointElevation: 6961,
    lowestPoint: 'Laguna del Carbón',
    lowestPointElevation: -105,
    timezoneZones: 'UTC-05:00 to UTC-02:00',
    languagesMajor: 'Spanish, Portuguese, English, French, Dutch',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'Antarctica',
    code: 'AN',
    areaSqKm: 14200000,
    population: 4400,
    numberOfCountries: 0,
    largestCountry: null,
    smallestCountry: null,
    highestPoint: 'Vinson Massif',
    highestPointElevation: 4892,
    lowestPoint: 'Bentley Subglacial Trench',
    lowestPointElevation: -2555,
    timezoneZones: 'All time zones (UTC-12:00 to UTC+12:00)',
    languagesMajor: 'English, Russian, Spanish, French, Norwegian',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'Europe',
    code: 'EU',
    areaSqKm: 10180000,
    population: 746419440,
    numberOfCountries: 50,
    largestCountry: 'Russia',
    smallestCountry: 'Vatican City',
    highestPoint: 'Mount Elbrus',
    highestPointElevation: 5642,
    lowestPoint: 'Caspian Sea',
    lowestPointElevation: -28,
    timezoneZones: 'UTC+00:00 to UTC+04:00',
    languagesMajor: 'Russian, German, French, English, Italian, Spanish, Polish',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'Oceania',
    code: 'OC',
    areaSqKm: 8600000,
    population: 45606000,
    numberOfCountries: 14,
    largestCountry: 'Australia',
    smallestCountry: 'Nauru',
    highestPoint: 'Puncak Jaya',
    highestPointElevation: 4884,
    lowestPoint: 'Lake Eyre',
    lowestPointElevation: -15,
    timezoneZones: 'UTC+08:00 to UTC+12:00',
    languagesMajor: 'English, Tok Pisin, French, Fijian, Samoan',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

async function seedContinents() {
  try {
    console.log('Starting to seed continents...')

    // Initialize database first
    await initializeDatabase()
    const db = getDatabase()

    // Check if continents already exist
    const existingContinents = await db('continents').select('*')
    if (existingContinents.length > 0) {
      console.log(`Found ${existingContinents.length} existing continents. Skipping seed.`)
      console.log('Existing continents:', existingContinents.map(c => c.name).join(', '))
      return
    }

    // Insert continents
    await db('continents').insert(continentsData)

    console.log('✅ Successfully seeded 7 continents!')

    // Verify insertion
    const insertedContinents = await db('continents').select('name', 'code', 'population').orderBy('areaSqKm', 'desc')
    console.log('\n📊 Inserted continents:')
    insertedContinents.forEach((continent, index) => {
      console.log(`${index + 1}. ${continent.name} (${continent.code}) - Population: ${continent.population.toLocaleString()}`)
    })

  } catch (error) {
    console.error('❌ Error seeding continents:', error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  seedContinents()
    .then(() => {
      console.log('\n🎉 Continent seeding completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Continent seeding failed:', error)
      process.exit(1)
    })
}

module.exports = { seedContinents, continentsData }