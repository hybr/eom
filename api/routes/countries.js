import { Router } from 'express'
import { dbAll, dbRun, dbGet } from '../models/database.js'
import { broadcast } from '../server.js'

const router = Router()

// GET /api/countries - List all countries
router.get('/', async (req, res) => {
    try {
        const { active_only = 'false', continent_id, region } = req.query

        let sql = `
            SELECT c.*, cont.name as continent_name, cont.code as continent_code
            FROM country c
            LEFT JOIN continents cont ON c.continent_id = cont.id
        `
        let params = []
        let conditions = []

        if (active_only === 'true') {
            conditions.push('c.is_active = 1')
        }

        if (continent_id) {
            conditions.push('c.continent_id = ?')
            params.push(continent_id)
        }

        if (region) {
            conditions.push('c.region = ?')
            params.push(region)
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ')
        }

        sql += ' ORDER BY c.name ASC'

        const countries = await dbAll(sql, params)
        res.json(countries)
    } catch (error) {
        console.error('Error fetching countries:', error)
        res.status(500).json({ error: 'Failed to fetch countries' })
    }
})

// GET /api/countries/search - Search countries by name or code
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query

        if (!q || q.trim().length < 2) {
            return res.status(400).json({ error: 'Search query must be at least 2 characters' })
        }

        const searchTerm = `%${q.trim()}%`
        const sql = `
            SELECT c.*, cont.name as continent_name, cont.code as continent_code
            FROM country c
            LEFT JOIN continents cont ON c.continent_id = cont.id
            WHERE (
                c.name LIKE ? OR
                c.official_name LIKE ? OR
                c.capital LIKE ? OR
                c.code LIKE ? OR
                c.code3 LIKE ?
            ) AND c.is_active = 1
            ORDER BY c.name ASC
            LIMIT 50
        `

        const countries = await dbAll(sql, [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm])
        res.json(countries)
    } catch (error) {
        console.error('Error searching countries:', error)
        res.status(500).json({ error: 'Failed to search countries' })
    }
})

// GET /api/countries/code/:code - Get country by ISO code (alpha-2, alpha-3, or numeric)
router.get('/code/:code', async (req, res) => {
    try {
        const code = req.params.code.toUpperCase()

        const sql = `
            SELECT c.*, cont.name as continent_name, cont.code as continent_code
            FROM country c
            LEFT JOIN continents cont ON c.continent_id = cont.id
            WHERE c.code = ? OR c.code3 = ? OR c.numeric_code = ?
        `
        const country = await dbGet(sql, [code, code, code])

        if (!country) {
            return res.status(404).json({ error: 'Country not found' })
        }

        res.json(country)
    } catch (error) {
        console.error('Error fetching country by code:', error)
        res.status(500).json({ error: 'Failed to fetch country' })
    }
})

// GET /api/countries/:id - Get specific country
router.get('/:id', async (req, res) => {
    try {
        const sql = `
            SELECT c.*, cont.name as continent_name, cont.code as continent_code
            FROM country c
            LEFT JOIN continents cont ON c.continent_id = cont.id
            WHERE c.id = ?
        `
        const country = await dbGet(sql, [req.params.id])

        if (!country) {
            return res.status(404).json({ error: 'Country not found' })
        }

        res.json(country)
    } catch (error) {
        console.error('Error fetching country:', error)
        res.status(500).json({ error: 'Failed to fetch country' })
    }
})

// POST /api/countries - Create new country
router.post('/', async (req, res) => {
    try {
        const {
            code, code3, numeric_code, name, official_name, capital,
            continent_id, region, sub_region, phone_code, is_active = true
        } = req.body

        // Validate required fields
        if (!code || !code3 || !numeric_code || !name || !continent_id) {
            return res.status(400).json({
                error: 'Code, code3, numeric_code, name, and continent_id are required'
            })
        }

        // Validate code formats
        if (!/^[A-Z]{2}$/.test(code)) {
            return res.status(400).json({ error: 'Code must be exactly 2 uppercase letters' })
        }

        if (!/^[A-Z]{3}$/.test(code3)) {
            return res.status(400).json({ error: 'Code3 must be exactly 3 uppercase letters' })
        }

        if (!/^\d{3}$/.test(numeric_code)) {
            return res.status(400).json({ error: 'Numeric code must be exactly 3 digits' })
        }

        if (phone_code && !/^\+\d{1,4}$/.test(phone_code)) {
            return res.status(400).json({ error: 'Phone code must start with + and contain 1-4 digits' })
        }

        // Check if continent exists
        const continent = await dbGet('SELECT id FROM continents WHERE id = ?', [continent_id])
        if (!continent) {
            return res.status(400).json({ error: 'Invalid continent_id' })
        }

        // Check for duplicate codes
        const existingCountry = await dbGet(`
            SELECT id FROM country
            WHERE code = ? OR code3 = ? OR numeric_code = ?
        `, [code, code3, numeric_code])

        if (existingCountry) {
            return res.status(400).json({ error: 'Country with this code already exists' })
        }

        const result = await dbRun(`
            INSERT INTO country (
                code, code3, numeric_code, name, official_name, capital,
                continent_id, region, sub_region, phone_code, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            code, code3, numeric_code, name, official_name, capital,
            continent_id, region, sub_region, phone_code, is_active ? 1 : 0
        ])

        const newCountry = await dbGet(`
            SELECT c.*, cont.name as continent_name, cont.code as continent_code
            FROM country c
            LEFT JOIN continents cont ON c.continent_id = cont.id
            WHERE c.id = ?
        `, [result.id])

        // Broadcast the new country
        broadcast({
            type: 'country_created',
            data: newCountry,
            timestamp: new Date().toISOString()
        })

        res.status(201).json(newCountry)
    } catch (error) {
        console.error('Error creating country:', error)
        res.status(500).json({ error: 'Failed to create country' })
    }
})

// PUT /api/countries/:id - Update country
router.put('/:id', async (req, res) => {
    try {
        const countryId = req.params.id
        const {
            code, code3, numeric_code, name, official_name, capital,
            continent_id, region, sub_region, phone_code, is_active
        } = req.body

        // Check if country exists
        const existingCountry = await dbGet('SELECT * FROM country WHERE id = ?', [countryId])
        if (!existingCountry) {
            return res.status(404).json({ error: 'Country not found' })
        }

        // Validate required fields
        if (!code || !code3 || !numeric_code || !name || !continent_id) {
            return res.status(400).json({
                error: 'Code, code3, numeric_code, name, and continent_id are required'
            })
        }

        // Validate code formats
        if (!/^[A-Z]{2}$/.test(code)) {
            return res.status(400).json({ error: 'Code must be exactly 2 uppercase letters' })
        }

        if (!/^[A-Z]{3}$/.test(code3)) {
            return res.status(400).json({ error: 'Code3 must be exactly 3 uppercase letters' })
        }

        if (!/^\d{3}$/.test(numeric_code)) {
            return res.status(400).json({ error: 'Numeric code must be exactly 3 digits' })
        }

        if (phone_code && !/^\+\d{1,4}$/.test(phone_code)) {
            return res.status(400).json({ error: 'Phone code must start with + and contain 1-4 digits' })
        }

        // Check if continent exists
        const continent = await dbGet('SELECT id FROM continents WHERE id = ?', [continent_id])
        if (!continent) {
            return res.status(400).json({ error: 'Invalid continent_id' })
        }

        // Check for duplicate codes (excluding current country)
        const duplicateCountry = await dbGet(`
            SELECT id FROM country
            WHERE (code = ? OR code3 = ? OR numeric_code = ?) AND id != ?
        `, [code, code3, numeric_code, countryId])

        if (duplicateCountry) {
            return res.status(400).json({ error: 'Country with this code already exists' })
        }

        await dbRun(`
            UPDATE country
            SET code = ?, code3 = ?, numeric_code = ?, name = ?, official_name = ?,
                capital = ?, continent_id = ?, region = ?, sub_region = ?,
                phone_code = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            code, code3, numeric_code, name, official_name, capital,
            continent_id, region, sub_region, phone_code, is_active ? 1 : 0, countryId
        ])

        const updatedCountry = await dbGet(`
            SELECT c.*, cont.name as continent_name, cont.code as continent_code
            FROM country c
            LEFT JOIN continents cont ON c.continent_id = cont.id
            WHERE c.id = ?
        `, [countryId])

        // Broadcast the update
        broadcast({
            type: 'country_updated',
            data: updatedCountry,
            timestamp: new Date().toISOString()
        })

        res.json(updatedCountry)
    } catch (error) {
        console.error('Error updating country:', error)
        res.status(500).json({ error: 'Failed to update country' })
    }
})

// DELETE /api/countries/:id - Delete country (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const countryId = req.params.id

        // Check if country exists
        const existingCountry = await dbGet('SELECT * FROM country WHERE id = ?', [countryId])
        if (!existingCountry) {
            return res.status(404).json({ error: 'Country not found' })
        }

        // Soft delete by setting is_active to false
        await dbRun(`
            UPDATE country
            SET is_active = 0, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [countryId])

        const deletedCountry = await dbGet(`
            SELECT c.*, cont.name as continent_name, cont.code as continent_code
            FROM country c
            LEFT JOIN continents cont ON c.continent_id = cont.id
            WHERE c.id = ?
        `, [countryId])

        // Broadcast the deletion
        broadcast({
            type: 'country_deleted',
            data: deletedCountry,
            timestamp: new Date().toISOString()
        })

        res.json({ message: 'Country deactivated successfully', country: deletedCountry })
    } catch (error) {
        console.error('Error deleting country:', error)
        res.status(500).json({ error: 'Failed to delete country' })
    }
})

// POST /api/countries/:id/activate - Reactivate country
router.post('/:id/activate', async (req, res) => {
    try {
        const countryId = req.params.id

        // Check if country exists
        const existingCountry = await dbGet('SELECT * FROM country WHERE id = ?', [countryId])
        if (!existingCountry) {
            return res.status(404).json({ error: 'Country not found' })
        }

        await dbRun(`
            UPDATE country
            SET is_active = 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [countryId])

        const activatedCountry = await dbGet(`
            SELECT c.*, cont.name as continent_name, cont.code as continent_code
            FROM country c
            LEFT JOIN continents cont ON c.continent_id = cont.id
            WHERE c.id = ?
        `, [countryId])

        // Broadcast the activation
        broadcast({
            type: 'country_activated',
            data: activatedCountry,
            timestamp: new Date().toISOString()
        })

        res.json({ message: 'Country activated successfully', country: activatedCountry })
    } catch (error) {
        console.error('Error activating country:', error)
        res.status(500).json({ error: 'Failed to activate country' })
    }
})

export default router