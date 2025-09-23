import { Router } from 'express'
import { dbAll, dbRun, dbGet } from '../models/database.js'
import { broadcast } from '../server.js'

const router = Router()

// GET /api/organization-legal-types - List all organization legal types
router.get('/', async (req, res) => {
    try {
        const { active_only = 'false', country_code, region } = req.query

        let sql = `
            SELECT olt.*, c.name as country_name
            FROM organization_legal_type olt
            LEFT JOIN country c ON olt.jurisdiction_country_code = c.code
        `
        let params = []
        let conditions = []

        if (active_only === 'true') {
            conditions.push('olt.is_active = 1')
        }

        if (country_code) {
            conditions.push('olt.jurisdiction_country_code = ?')
            params.push(country_code.toUpperCase())
        }

        if (region) {
            conditions.push('olt.jurisdiction_region = ?')
            params.push(region)
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ')
        }

        sql += ' ORDER BY olt.jurisdiction_country_code ASC, olt.name ASC'

        const legalTypes = await dbAll(sql, params)
        res.json(legalTypes)
    } catch (error) {
        console.error('Error fetching organization legal types:', error)
        res.status(500).json({ error: 'Failed to fetch organization legal types' })
    }
})

// GET /api/organization-legal-types/search - Search legal types by name, code, or abbreviation
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query

        if (!q || q.trim().length < 2) {
            return res.status(400).json({ error: 'Search query must be at least 2 characters' })
        }

        const searchTerm = `%${q.trim()}%`
        const sql = `
            SELECT olt.*, c.name as country_name
            FROM organization_legal_type olt
            LEFT JOIN country c ON olt.jurisdiction_country_code = c.code
            WHERE (
                olt.code LIKE ? OR
                olt.name LIKE ? OR
                olt.abbreviation LIKE ? OR
                olt.description LIKE ?
            ) AND olt.is_active = 1
            ORDER BY olt.name ASC
            LIMIT 50
        `

        const legalTypes = await dbAll(sql, [searchTerm, searchTerm, searchTerm, searchTerm])
        res.json(legalTypes)
    } catch (error) {
        console.error('Error searching organization legal types:', error)
        res.status(500).json({ error: 'Failed to search organization legal types' })
    }
})

// GET /api/organization-legal-types/code/:code - Get legal type by code
router.get('/code/:code', async (req, res) => {
    try {
        const code = req.params.code.toUpperCase()

        const sql = `
            SELECT olt.*, c.name as country_name
            FROM organization_legal_type olt
            LEFT JOIN country c ON olt.jurisdiction_country_code = c.code
            WHERE olt.code = ?
        `
        const legalType = await dbGet(sql, [code])

        if (!legalType) {
            return res.status(404).json({ error: 'Organization legal type not found' })
        }

        res.json(legalType)
    } catch (error) {
        console.error('Error fetching organization legal type by code:', error)
        res.status(500).json({ error: 'Failed to fetch organization legal type' })
    }
})

// GET /api/organization-legal-types/:id - Get specific organization legal type
router.get('/:id', async (req, res) => {
    try {
        const sql = `
            SELECT olt.*, c.name as country_name
            FROM organization_legal_type olt
            LEFT JOIN country c ON olt.jurisdiction_country_code = c.code
            WHERE olt.id = ?
        `
        const legalType = await dbGet(sql, [req.params.id])

        if (!legalType) {
            return res.status(404).json({ error: 'Organization legal type not found' })
        }

        res.json(legalType)
    } catch (error) {
        console.error('Error fetching organization legal type:', error)
        res.status(500).json({ error: 'Failed to fetch organization legal type' })
    }
})

// POST /api/organization-legal-types - Create new organization legal type
router.post('/', async (req, res) => {
    try {
        const {
            code, name, abbreviation, jurisdiction_country_code,
            jurisdiction_region, description, is_active = true
        } = req.body

        // Validate required fields
        if (!code || !name || !jurisdiction_country_code) {
            return res.status(400).json({
                error: 'Code, name, and jurisdiction_country_code are required'
            })
        }

        // Validate code format
        if (!/^[A-Z0-9_]+$/.test(code)) {
            return res.status(400).json({
                error: 'Code must contain only uppercase letters, numbers, and underscores'
            })
        }

        // Validate country code format
        if (!/^[A-Z]{2}$/.test(jurisdiction_country_code)) {
            return res.status(400).json({
                error: 'Jurisdiction country code must be exactly 2 uppercase letters'
            })
        }

        // Check if country exists
        const country = await dbGet('SELECT code FROM country WHERE code = ?', [jurisdiction_country_code])
        if (!country) {
            return res.status(400).json({ error: 'Invalid jurisdiction_country_code' })
        }

        // Check for duplicate codes
        const existingLegalType = await dbGet('SELECT id FROM organization_legal_type WHERE code = ?', [code])
        if (existingLegalType) {
            return res.status(400).json({ error: 'Organization legal type with this code already exists' })
        }

        const id = `OLT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        const result = await dbRun(`
            INSERT INTO organization_legal_type (
                id, code, name, abbreviation, jurisdiction_country_code,
                jurisdiction_region, description, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id, code.toUpperCase(), name, abbreviation, jurisdiction_country_code.toUpperCase(),
            jurisdiction_region, description, is_active ? 1 : 0
        ])

        const newLegalType = await dbGet(`
            SELECT olt.*, c.name as country_name
            FROM organization_legal_type olt
            LEFT JOIN country c ON olt.jurisdiction_country_code = c.code
            WHERE olt.id = ?
        `, [id])

        // Broadcast the new legal type
        broadcast({
            type: 'organization_legal_type_created',
            data: newLegalType,
            timestamp: new Date().toISOString()
        })

        res.status(201).json(newLegalType)
    } catch (error) {
        console.error('Error creating organization legal type:', error)
        res.status(500).json({ error: 'Failed to create organization legal type' })
    }
})

// PUT /api/organization-legal-types/:id - Update organization legal type
router.put('/:id', async (req, res) => {
    try {
        const legalTypeId = req.params.id
        const {
            code, name, abbreviation, jurisdiction_country_code,
            jurisdiction_region, description, is_active
        } = req.body

        // Check if legal type exists
        const existingLegalType = await dbGet('SELECT * FROM organization_legal_type WHERE id = ?', [legalTypeId])
        if (!existingLegalType) {
            return res.status(404).json({ error: 'Organization legal type not found' })
        }

        // Validate required fields
        if (!code || !name || !jurisdiction_country_code) {
            return res.status(400).json({
                error: 'Code, name, and jurisdiction_country_code are required'
            })
        }

        // Validate code format
        if (!/^[A-Z0-9_]+$/.test(code)) {
            return res.status(400).json({
                error: 'Code must contain only uppercase letters, numbers, and underscores'
            })
        }

        // Validate country code format
        if (!/^[A-Z]{2}$/.test(jurisdiction_country_code)) {
            return res.status(400).json({
                error: 'Jurisdiction country code must be exactly 2 uppercase letters'
            })
        }

        // Check if country exists
        const country = await dbGet('SELECT code FROM country WHERE code = ?', [jurisdiction_country_code])
        if (!country) {
            return res.status(400).json({ error: 'Invalid jurisdiction_country_code' })
        }

        // Check for duplicate codes (excluding current legal type)
        const duplicateLegalType = await dbGet(`
            SELECT id FROM organization_legal_type
            WHERE code = ? AND id != ?
        `, [code, legalTypeId])

        if (duplicateLegalType) {
            return res.status(400).json({ error: 'Organization legal type with this code already exists' })
        }

        await dbRun(`
            UPDATE organization_legal_type
            SET code = ?, name = ?, abbreviation = ?, jurisdiction_country_code = ?,
                jurisdiction_region = ?, description = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            code.toUpperCase(), name, abbreviation, jurisdiction_country_code.toUpperCase(),
            jurisdiction_region, description, is_active ? 1 : 0, legalTypeId
        ])

        const updatedLegalType = await dbGet(`
            SELECT olt.*, c.name as country_name
            FROM organization_legal_type olt
            LEFT JOIN country c ON olt.jurisdiction_country_code = c.code
            WHERE olt.id = ?
        `, [legalTypeId])

        // Broadcast the update
        broadcast({
            type: 'organization_legal_type_updated',
            data: updatedLegalType,
            timestamp: new Date().toISOString()
        })

        res.json(updatedLegalType)
    } catch (error) {
        console.error('Error updating organization legal type:', error)
        res.status(500).json({ error: 'Failed to update organization legal type' })
    }
})

// DELETE /api/organization-legal-types/:id - Delete legal type (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const legalTypeId = req.params.id

        // Check if legal type exists
        const existingLegalType = await dbGet('SELECT * FROM organization_legal_type WHERE id = ?', [legalTypeId])
        if (!existingLegalType) {
            return res.status(404).json({ error: 'Organization legal type not found' })
        }

        // Soft delete by setting is_active to false
        await dbRun(`
            UPDATE organization_legal_type
            SET is_active = 0, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [legalTypeId])

        const deletedLegalType = await dbGet(`
            SELECT olt.*, c.name as country_name
            FROM organization_legal_type olt
            LEFT JOIN country c ON olt.jurisdiction_country_code = c.code
            WHERE olt.id = ?
        `, [legalTypeId])

        // Broadcast the deletion
        broadcast({
            type: 'organization_legal_type_deleted',
            data: deletedLegalType,
            timestamp: new Date().toISOString()
        })

        res.json({ message: 'Organization legal type deactivated successfully', legalType: deletedLegalType })
    } catch (error) {
        console.error('Error deleting organization legal type:', error)
        res.status(500).json({ error: 'Failed to delete organization legal type' })
    }
})

// POST /api/organization-legal-types/:id/activate - Reactivate legal type
router.post('/:id/activate', async (req, res) => {
    try {
        const legalTypeId = req.params.id

        // Check if legal type exists
        const existingLegalType = await dbGet('SELECT * FROM organization_legal_type WHERE id = ?', [legalTypeId])
        if (!existingLegalType) {
            return res.status(404).json({ error: 'Organization legal type not found' })
        }

        await dbRun(`
            UPDATE organization_legal_type
            SET is_active = 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [legalTypeId])

        const activatedLegalType = await dbGet(`
            SELECT olt.*, c.name as country_name
            FROM organization_legal_type olt
            LEFT JOIN country c ON olt.jurisdiction_country_code = c.code
            WHERE olt.id = ?
        `, [legalTypeId])

        // Broadcast the activation
        broadcast({
            type: 'organization_legal_type_activated',
            data: activatedLegalType,
            timestamp: new Date().toISOString()
        })

        res.json({ message: 'Organization legal type activated successfully', legalType: activatedLegalType })
    } catch (error) {
        console.error('Error activating organization legal type:', error)
        res.status(500).json({ error: 'Failed to activate organization legal type' })
    }
})

export default router