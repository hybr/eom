import { Router } from 'express'
import { dbAll, dbRun } from '../models/database.js'
import { broadcast } from '../server.js'

const router = Router()

// GET /api/persons - List all persons
router.get('/', async (req, res) => {
    try {
        const persons = await dbAll('SELECT * FROM persons ORDER BY created_at DESC')
        res.json(persons)
    } catch (error) {
        console.error('Error fetching persons:', error)
        res.status(500).json({ error: 'Failed to fetch persons' })
    }
})

// POST /api/persons - Create a new person
router.post('/', async (req, res) => {
    try {
        const {
            name_prefix,
            first_name,
            middle_name,
            last_name,
            name_suffix,
            date_of_birth,
            primary_phone_number,
            primary_email_address
        } = req.body

        if (!first_name || !last_name) {
            return res.status(400).json({ error: 'first_name and last_name are required' })
        }

        const result = await dbRun(
            `INSERT INTO persons (
                name_prefix, first_name, middle_name, last_name, name_suffix,
                date_of_birth, primary_phone_number, primary_email_address
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [name_prefix, first_name, middle_name, last_name, name_suffix,
             date_of_birth, primary_phone_number, primary_email_address]
        )

        const newPerson = await dbAll(
            'SELECT * FROM persons WHERE id = ?',
            [result.id]
        )

        // Broadcast the new person to all connected WebSocket clients
        broadcast({
            type: 'person_created',
            data: newPerson[0],
            timestamp: new Date().toISOString()
        })

        res.status(201).json(newPerson[0])
    } catch (error) {
        console.error('Error creating person:', error)
        res.status(500).json({ error: 'Failed to create person' })
    }
})

export default router