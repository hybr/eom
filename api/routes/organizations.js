import { Router } from 'express'
import { dbAll, dbRun } from '../models/database.js'
import { broadcast } from '../server.js'

const router = Router()

// GET /api/organizations - List all organizations
router.get('/', async (req, res) => {
    try {
        const organizations = await dbAll('SELECT * FROM organizations ORDER BY created_at DESC')
        res.json(organizations)
    } catch (error) {
        console.error('Error fetching organizations:', error)
        res.status(500).json({ error: 'Failed to fetch organizations' })
    }
})

// POST /api/organizations - Create a new organization
router.post('/', async (req, res) => {
    try {
        const { name } = req.body

        if (!name) {
            return res.status(400).json({ error: 'name is required' })
        }

        const result = await dbRun(
            'INSERT INTO organizations (name) VALUES (?)',
            [name]
        )

        const newOrganization = await dbAll(
            'SELECT * FROM organizations WHERE id = ?',
            [result.id]
        )

        // Broadcast the new organization to all connected WebSocket clients
        broadcast({
            type: 'organization_created',
            data: newOrganization[0],
            timestamp: new Date().toISOString()
        })

        res.status(201).json(newOrganization[0])
    } catch (error) {
        console.error('Error creating organization:', error)
        res.status(500).json({ error: 'Failed to create organization' })
    }
})

export default router