import { Router } from 'express'
import { dbAll, dbRun, dbGet } from '../models/database.js'
import { broadcast } from '../server.js'
import crypto from 'crypto'

const router = Router()

// Helper function to hash passwords (simple example - use bcrypt in production)
function hashPassword(password, salt = null) {
    if (!salt) salt = crypto.randomBytes(16).toString('hex')
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
    return { hash, salt }
}

// GET /api/person-credentials - List all credentials (without sensitive data)
router.get('/', async (req, res) => {
    try {
        const credentials = await dbAll(`
            SELECT
                pc.id, pc.person_id, pc.username, pc.last_login_at, pc.failed_attempts,
                pc.locked_until, pc.password_changed_at, pc.must_change_password,
                pc.is_active, pc.last_ip, pc.role_id, pc.email_verified, pc.phone_verified,
                pc.auth_provider, pc.created_at, pc.updated_at,
                p.first_name, p.last_name
            FROM person_credentials pc
            LEFT JOIN persons p ON pc.person_id = p.id
            ORDER BY pc.created_at DESC
        `)
        res.json(credentials)
    } catch (error) {
        console.error('Error fetching person credentials:', error)
        res.status(500).json({ error: 'Failed to fetch person credentials' })
    }
})

// GET /api/person-credentials/:id - Get specific credential
router.get('/:id', async (req, res) => {
    try {
        const credential = await dbGet(`
            SELECT
                pc.id, pc.person_id, pc.username, pc.last_login_at, pc.failed_attempts,
                pc.locked_until, pc.password_changed_at, pc.must_change_password,
                pc.is_active, pc.last_ip, pc.role_id, pc.email_verified, pc.phone_verified,
                pc.auth_provider, pc.created_at, pc.updated_at,
                p.first_name, p.last_name
            FROM person_credentials pc
            LEFT JOIN persons p ON pc.person_id = p.id
            WHERE pc.id = ?
        `, [req.params.id])

        if (!credential) {
            return res.status(404).json({ error: 'Person credential not found' })
        }

        res.json(credential)
    } catch (error) {
        console.error('Error fetching person credential:', error)
        res.status(500).json({ error: 'Failed to fetch person credential' })
    }
})

// POST /api/person-credentials - Create new credential
router.post('/', async (req, res) => {
    try {
        const {
            person_id,
            username,
            password,
            role_id,
            must_change_password = false,
            security_question,
            security_answer,
            auth_provider = 'local'
        } = req.body

        if (!person_id || !username || !password) {
            return res.status(400).json({ error: 'person_id, username, and password are required' })
        }

        // Check if person exists
        const person = await dbGet('SELECT id FROM persons WHERE id = ?', [person_id])
        if (!person) {
            return res.status(400).json({ error: 'Person does not exist' })
        }

        // Check if username already exists
        const existingCredential = await dbGet('SELECT id FROM person_credentials WHERE username = ?', [username])
        if (existingCredential) {
            return res.status(400).json({ error: 'Username already exists' })
        }

        // Hash password
        const { hash: password_hash, salt: password_salt } = hashPassword(password)

        // Hash security answer if provided
        let security_answer_hash = null
        if (security_answer) {
            security_answer_hash = crypto.createHash('sha256').update(security_answer.toLowerCase()).digest('hex')
        }

        const result = await dbRun(`
            INSERT INTO person_credentials (
                person_id, username, password_hash, password_salt, password_changed_at,
                must_change_password, role_id, security_question, security_answer_hash,
                auth_provider
            ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?)
        `, [
            person_id, username, password_hash, password_salt,
            must_change_password ? 1 : 0, role_id, security_question,
            security_answer_hash, auth_provider
        ])

        const newCredential = await dbGet(`
            SELECT
                pc.id, pc.person_id, pc.username, pc.last_login_at, pc.failed_attempts,
                pc.locked_until, pc.password_changed_at, pc.must_change_password,
                pc.is_active, pc.last_ip, pc.role_id, pc.email_verified, pc.phone_verified,
                pc.auth_provider, pc.created_at, pc.updated_at,
                p.first_name, p.last_name
            FROM person_credentials pc
            LEFT JOIN persons p ON pc.person_id = p.id
            WHERE pc.id = ?
        `, [result.id])

        // Broadcast the new credential (without sensitive data)
        broadcast({
            type: 'person_credential_created',
            data: newCredential,
            timestamp: new Date().toISOString()
        })

        res.status(201).json(newCredential)
    } catch (error) {
        console.error('Error creating person credential:', error)
        res.status(500).json({ error: 'Failed to create person credential' })
    }
})

// PUT /api/person-credentials/:id - Update credential
router.put('/:id', async (req, res) => {
    try {
        const credentialId = req.params.id
        const {
            is_active,
            role_id,
            failed_attempts,
            locked_until,
            must_change_password,
            email_verified,
            phone_verified,
            two_factor_secret,
            security_question,
            security_answer
        } = req.body

        // Check if credential exists
        const existingCredential = await dbGet('SELECT id FROM person_credentials WHERE id = ?', [credentialId])
        if (!existingCredential) {
            return res.status(404).json({ error: 'Person credential not found' })
        }

        // Build update query dynamically based on provided fields
        const updateFields = []
        const updateValues = []

        if (typeof is_active !== 'undefined') {
            updateFields.push('is_active = ?')
            updateValues.push(is_active ? 1 : 0)
        }
        if (role_id !== undefined) {
            updateFields.push('role_id = ?')
            updateValues.push(role_id)
        }
        if (typeof failed_attempts !== 'undefined') {
            updateFields.push('failed_attempts = ?')
            updateValues.push(failed_attempts)
        }
        if (locked_until !== undefined) {
            updateFields.push('locked_until = ?')
            updateValues.push(locked_until)
        }
        if (typeof must_change_password !== 'undefined') {
            updateFields.push('must_change_password = ?')
            updateValues.push(must_change_password ? 1 : 0)
        }
        if (typeof email_verified !== 'undefined') {
            updateFields.push('email_verified = ?')
            updateValues.push(email_verified ? 1 : 0)
        }
        if (typeof phone_verified !== 'undefined') {
            updateFields.push('phone_verified = ?')
            updateValues.push(phone_verified ? 1 : 0)
        }
        if (two_factor_secret !== undefined) {
            updateFields.push('two_factor_secret = ?')
            updateValues.push(two_factor_secret)
        }
        if (security_question !== undefined) {
            updateFields.push('security_question = ?')
            updateValues.push(security_question)
        }
        if (security_answer !== undefined) {
            const security_answer_hash = security_answer ?
                crypto.createHash('sha256').update(security_answer.toLowerCase()).digest('hex') : null
            updateFields.push('security_answer_hash = ?')
            updateValues.push(security_answer_hash)
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' })
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP')
        updateValues.push(credentialId)

        await dbRun(`
            UPDATE person_credentials
            SET ${updateFields.join(', ')}
            WHERE id = ?
        `, updateValues)

        const updatedCredential = await dbGet(`
            SELECT
                pc.id, pc.person_id, pc.username, pc.last_login_at, pc.failed_attempts,
                pc.locked_until, pc.password_changed_at, pc.must_change_password,
                pc.is_active, pc.last_ip, pc.role_id, pc.email_verified, pc.phone_verified,
                pc.auth_provider, pc.created_at, pc.updated_at,
                p.first_name, p.last_name
            FROM person_credentials pc
            LEFT JOIN persons p ON pc.person_id = p.id
            WHERE pc.id = ?
        `, [credentialId])

        // Broadcast the update
        broadcast({
            type: 'person_credential_updated',
            data: updatedCredential,
            timestamp: new Date().toISOString()
        })

        res.json(updatedCredential)
    } catch (error) {
        console.error('Error updating person credential:', error)
        res.status(500).json({ error: 'Failed to update person credential' })
    }
})

// POST /api/person-credentials/:id/change-password - Change password
router.post('/:id/change-password', async (req, res) => {
    try {
        const credentialId = req.params.id
        const { new_password } = req.body

        if (!new_password) {
            return res.status(400).json({ error: 'new_password is required' })
        }

        // Check if credential exists
        const existingCredential = await dbGet('SELECT id FROM person_credentials WHERE id = ?', [credentialId])
        if (!existingCredential) {
            return res.status(404).json({ error: 'Person credential not found' })
        }

        // Hash new password
        const { hash: password_hash, salt: password_salt } = hashPassword(new_password)

        await dbRun(`
            UPDATE person_credentials
            SET password_hash = ?, password_salt = ?, password_changed_at = CURRENT_TIMESTAMP,
                must_change_password = 0, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [password_hash, password_salt, credentialId])

        res.json({ message: 'Password changed successfully' })
    } catch (error) {
        console.error('Error changing password:', error)
        res.status(500).json({ error: 'Failed to change password' })
    }
})

export default router