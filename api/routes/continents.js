import { Router } from 'express'
import { dbAll, dbRun, dbGet } from '../models/database.js'
import { broadcast } from '../server.js'

const router = Router()

// GET /api/continents - List all continents
router.get('/', async (req, res) => {
    try {
        const { active_only = 'false' } = req.query

        let sql = 'SELECT * FROM continents'
        let params = []

        if (active_only === 'true') {
            sql += ' WHERE is_active = 1'
        }

        sql += ' ORDER BY name ASC'

        const continents = await dbAll(sql, params)
        res.json(continents)
    } catch (error) {
        console.error('Error fetching continents:', error)
        res.status(500).json({ error: 'Failed to fetch continents' })
    }
})

// GET /api/continents/:id - Get specific continent
router.get('/:id', async (req, res) => {
    try {
        const continent = await dbGet('SELECT * FROM continents WHERE id = ?', [req.params.id])

        if (!continent) {
            return res.status(404).json({ error: 'Continent not found' })
        }

        res.json(continent)
    } catch (error) {
        console.error('Error fetching continent:', error)
        res.status(500).json({ error: 'Failed to fetch continent' })
    }
})

// POST /api/continents - Create new continent
router.post('/', async (req, res) => {
    try {
        const { code, name, description, is_active = true } = req.body

        if (!code || !name) {
            return res.status(400).json({ error: 'Code and name are required' })
        }

        // Validate code format (2-3 uppercase letters)
        if (!/^[A-Z]{2,3}$/.test(code)) {
            return res.status(400).json({ error: 'Code must be 2-3 uppercase letters' })
        }

        // Check if code already exists
        const existingContinent = await dbGet('SELECT id FROM continents WHERE code = ?', [code])
        if (existingContinent) {
            return res.status(400).json({ error: 'Continent code already exists' })
        }

        const result = await dbRun(`
            INSERT INTO continents (code, name, description, is_active)
            VALUES (?, ?, ?, ?)
        `, [code, name, description, is_active ? 1 : 0])

        const newContinent = await dbGet('SELECT * FROM continents WHERE id = ?', [result.id])

        // Broadcast the new continent
        broadcast({
            type: 'continent_created',
            data: newContinent,
            timestamp: new Date().toISOString()
        })

        res.status(201).json(newContinent)
    } catch (error) {
        console.error('Error creating continent:', error)
        res.status(500).json({ error: 'Failed to create continent' })
    }
})

// PUT /api/continents/:id - Update continent
router.put('/:id', async (req, res) => {
    try {
        const continentId = req.params.id
        const { code, name, description, is_active } = req.body

        // Check if continent exists
        const existingContinent = await dbGet('SELECT * FROM continents WHERE id = ?', [continentId])
        if (!existingContinent) {
            return res.status(404).json({ error: 'Continent not found' })
        }

        // Validate required fields
        if (!code || !name) {
            return res.status(400).json({ error: 'Code and name are required' })
        }

        // Validate code format
        if (!/^[A-Z]{2,3}$/.test(code)) {
            return res.status(400).json({ error: 'Code must be 2-3 uppercase letters' })
        }

        // Check if code already exists (excluding current continent)
        if (code !== existingContinent.code) {
            const duplicateCode = await dbGet('SELECT id FROM continents WHERE code = ? AND id != ?', [code, continentId])
            if (duplicateCode) {
                return res.status(400).json({ error: 'Continent code already exists' })
            }
        }

        await dbRun(`
            UPDATE continents
            SET code = ?, name = ?, description = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [code, name, description, is_active ? 1 : 0, continentId])

        const updatedContinent = await dbGet('SELECT * FROM continents WHERE id = ?', [continentId])

        // Broadcast the update
        broadcast({
            type: 'continent_updated',
            data: updatedContinent,
            timestamp: new Date().toISOString()
        })

        res.json(updatedContinent)
    } catch (error) {
        console.error('Error updating continent:', error)
        res.status(500).json({ error: 'Failed to update continent' })
    }
})

// DELETE /api/continents/:id - Delete continent (soft delete by setting is_active to false)
router.delete('/:id', async (req, res) => {
    try {
        const continentId = req.params.id

        // Check if continent exists
        const existingContinent = await dbGet('SELECT * FROM continents WHERE id = ?', [continentId])
        if (!existingContinent) {
            return res.status(404).json({ error: 'Continent not found' })
        }

        // Soft delete by setting is_active to false
        await dbRun(`
            UPDATE continents
            SET is_active = 0, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [continentId])

        const deletedContinent = await dbGet('SELECT * FROM continents WHERE id = ?', [continentId])

        // Broadcast the deletion
        broadcast({
            type: 'continent_deleted',
            data: deletedContinent,
            timestamp: new Date().toISOString()
        })

        res.json({ message: 'Continent deactivated successfully', continent: deletedContinent })
    } catch (error) {
        console.error('Error deleting continent:', error)
        res.status(500).json({ error: 'Failed to delete continent' })
    }
})

// POST /api/continents/:id/activate - Reactivate continent
router.post('/:id/activate', async (req, res) => {
    try {
        const continentId = req.params.id

        // Check if continent exists
        const existingContinent = await dbGet('SELECT * FROM continents WHERE id = ?', [continentId])
        if (!existingContinent) {
            return res.status(404).json({ error: 'Continent not found' })
        }

        await dbRun(`
            UPDATE continents
            SET is_active = 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [continentId])

        const activatedContinent = await dbGet('SELECT * FROM continents WHERE id = ?', [continentId])

        // Broadcast the activation
        broadcast({
            type: 'continent_activated',
            data: activatedContinent,
            timestamp: new Date().toISOString()
        })

        res.json({ message: 'Continent activated successfully', continent: activatedContinent })
    } catch (error) {
        console.error('Error activating continent:', error)
        res.status(500).json({ error: 'Failed to activate continent' })
    }
})

export default router