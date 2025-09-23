import { Router } from 'express'
import { dbAll, dbRun, dbGet } from '../models/database.js'
import { broadcast } from '../server.js'
import crypto from 'crypto'

const router = Router()

// Helper function to hash passwords
function hashPassword(password, salt = null) {
    if (!salt) salt = crypto.randomBytes(16).toString('hex')
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
    return { hash, salt }
}

// POST /api/signup - Complete user registration (Person + PersonCredential)
router.post('/', async (req, res) => {
    try {
        const {
            // Person data
            name_prefix,
            first_name,
            middle_name,
            last_name,
            name_suffix,
            date_of_birth,
            primary_phone_number,
            primary_email_address,
            // Credential data
            username,
            password,
            confirm_password,
            security_question,
            security_answer
        } = req.body

        // Validation
        if (!first_name || !last_name) {
            return res.status(400).json({ error: 'First name and last name are required' })
        }

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' })
        }

        if (password !== confirm_password) {
            return res.status(400).json({ error: 'Passwords do not match' })
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' })
        }

        // Check if username already exists
        const existingCredential = await dbGet('SELECT id FROM person_credentials WHERE username = ?', [username])
        if (existingCredential) {
            return res.status(400).json({ error: 'Username already exists' })
        }

        // Check if email already exists
        if (primary_email_address) {
            const existingEmail = await dbGet('SELECT id FROM persons WHERE primary_email_address = ?', [primary_email_address])
            if (existingEmail) {
                return res.status(400).json({ error: 'Email address already registered' })
            }
        }

        // Begin transaction-like operation
        // 1. Create Person
        const personResult = await dbRun(`
            INSERT INTO persons (
                name_prefix, first_name, middle_name, last_name, name_suffix,
                date_of_birth, primary_phone_number, primary_email_address
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [name_prefix, first_name, middle_name, last_name, name_suffix,
             date_of_birth, primary_phone_number, primary_email_address])

        const personId = personResult.id

        // 2. Create PersonCredential
        const { hash: password_hash, salt: password_salt } = hashPassword(password)

        let security_answer_hash = null
        if (security_answer) {
            security_answer_hash = crypto.createHash('sha256').update(security_answer.toLowerCase()).digest('hex')
        }

        const credentialResult = await dbRun(`
            INSERT INTO person_credentials (
                person_id, username, password_hash, password_salt, password_changed_at,
                must_change_password, security_question, security_answer_hash,
                auth_provider, email_verified
            ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 0, ?, ?, 'local', ?)
        `, [
            personId, username, password_hash, password_salt,
            security_question, security_answer_hash,
            primary_email_address ? 0 : 1 // Auto-verify if no email provided
        ])

        // 3. Get the complete user data
        const newUser = await dbGet(`
            SELECT
                p.id as person_id, p.name_prefix, p.first_name, p.middle_name,
                p.last_name, p.name_suffix, p.date_of_birth, p.primary_phone_number,
                p.primary_email_address, p.created_at as person_created_at,
                pc.id as credential_id, pc.username, pc.email_verified, pc.created_at as credential_created_at
            FROM persons p
            JOIN person_credentials pc ON p.id = pc.person_id
            WHERE p.id = ? AND pc.id = ?
        `, [personId, credentialResult.id])

        // Broadcast the new user registration
        broadcast({
            type: 'user_registered',
            data: {
                person_id: newUser.person_id,
                username: newUser.username,
                full_name: [newUser.name_prefix, newUser.first_name, newUser.middle_name, newUser.last_name, newUser.name_suffix]
                    .filter(Boolean)
                    .join(' ')
            },
            timestamp: new Date().toISOString()
        })

        // Return success (without sensitive data)
        res.status(201).json({
            message: 'Account created successfully',
            user: {
                person_id: newUser.person_id,
                credential_id: newUser.credential_id,
                username: newUser.username,
                full_name: [newUser.name_prefix, newUser.first_name, newUser.middle_name, newUser.last_name, newUser.name_suffix]
                    .filter(Boolean)
                    .join(' '),
                email: newUser.primary_email_address,
                email_verified: newUser.email_verified,
                created_at: newUser.person_created_at
            }
        })

    } catch (error) {
        console.error('Error during signup:', error)
        res.status(500).json({ error: 'Failed to create account. Please try again.' })
    }
})

// GET /api/signup/check-username/:username - Check if username is available
router.get('/check-username/:username', async (req, res) => {
    try {
        const username = req.params.username
        const existing = await dbGet('SELECT id FROM person_credentials WHERE username = ?', [username])
        res.json({ available: !existing })
    } catch (error) {
        console.error('Error checking username:', error)
        res.status(500).json({ error: 'Failed to check username availability' })
    }
})

// GET /api/signup/check-email/:email - Check if email is available
router.get('/check-email/:email', async (req, res) => {
    try {
        const email = req.params.email
        const existing = await dbGet('SELECT id FROM persons WHERE primary_email_address = ?', [email])
        res.json({ available: !existing })
    } catch (error) {
        console.error('Error checking email:', error)
        res.status(500).json({ error: 'Failed to check email availability' })
    }
})

export default router