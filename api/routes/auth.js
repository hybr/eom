import { Router } from 'express'
import { dbAll, dbRun, dbGet } from '../models/database.js'
import { broadcast } from '../server.js'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'

const router = Router()

// Rate limiting for login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
})

// JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

// Helper function to verify password
function verifyPassword(password, hash, salt) {
    const testHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
    return testHash === hash
}

// Helper function to generate JWT token
function generateToken(user) {
    return jwt.sign(
        {
            userId: user.person_id,
            credentialId: user.credential_id,
            username: user.username,
            email: user.primary_email_address
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    )
}

// Helper function to generate session token
function generateSessionToken() {
    return crypto.randomBytes(32).toString('hex')
}

// POST /api/auth/signin - User authentication
router.post('/signin', loginLimiter, async (req, res) => {
    try {
        const { username, password, remember_me = false } = req.body
        const clientIp = req.ip || req.connection.remoteAddress

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' })
        }

        // Get user credentials with person data
        const user = await dbGet(`
            SELECT
                pc.id as credential_id, pc.person_id, pc.username, pc.password_hash, pc.password_salt,
                pc.failed_attempts, pc.locked_until, pc.is_active, pc.must_change_password,
                pc.email_verified, pc.two_factor_secret, pc.role_id,
                p.name_prefix, p.first_name, p.middle_name, p.last_name, p.name_suffix,
                p.primary_email_address, p.primary_phone_number
            FROM person_credentials pc
            JOIN persons p ON pc.person_id = p.id
            WHERE pc.username = ? COLLATE NOCASE
        `, [username])

        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' })
        }

        // Check if account is active
        if (!user.is_active) {
            return res.status(401).json({ error: 'Account is deactivated. Please contact support.' })
        }

        // Check if account is locked
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            const unlockTime = new Date(user.locked_until).toLocaleString()
            return res.status(401).json({ error: `Account is locked until ${unlockTime}` })
        }

        // Verify password
        if (!verifyPassword(password, user.password_hash, user.password_salt)) {
            // Increment failed attempts
            const newFailedAttempts = (user.failed_attempts || 0) + 1
            let lockUntil = null

            // Lock account after 5 failed attempts for 30 minutes
            if (newFailedAttempts >= 5) {
                lockUntil = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
            }

            await dbRun(`
                UPDATE person_credentials
                SET failed_attempts = ?, locked_until = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [newFailedAttempts, lockUntil, user.credential_id])

            return res.status(401).json({
                error: 'Invalid username or password',
                attempts_remaining: Math.max(0, 5 - newFailedAttempts)
            })
        }

        // Password is correct - generate tokens and update login info
        const sessionToken = generateSessionToken()
        const jwtToken = generateToken(user)
        const refreshToken = generateSessionToken()

        // Update login info and reset failed attempts
        await dbRun(`
            UPDATE person_credentials
            SET
                last_login_at = CURRENT_TIMESTAMP,
                failed_attempts = 0,
                locked_until = NULL,
                last_ip = ?,
                session_token = ?,
                refresh_token = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [clientIp, sessionToken, refreshToken, user.credential_id])

        // Prepare user data for response
        const userData = {
            person_id: user.person_id,
            credential_id: user.credential_id,
            username: user.username,
            full_name: [user.name_prefix, user.first_name, user.middle_name, user.last_name, user.name_suffix]
                .filter(Boolean)
                .join(' '),
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.primary_email_address,
            phone: user.primary_phone_number,
            email_verified: user.email_verified,
            role_id: user.role_id,
            must_change_password: user.must_change_password,
            last_login_at: new Date().toISOString()
        }

        // Set JWT as httpOnly cookie
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: remember_me ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000 // 7 days or 1 day
        }

        res.cookie('auth_token', jwtToken, cookieOptions)

        // Broadcast successful login
        broadcast({
            type: 'user_signed_in',
            data: {
                username: user.username,
                full_name: userData.full_name,
                login_time: userData.last_login_at
            },
            timestamp: new Date().toISOString()
        })

        res.json({
            message: 'Sign in successful',
            user: userData,
            session_token: sessionToken,
            // Don't send JWT in response body for security
            requires_password_change: user.must_change_password
        })

    } catch (error) {
        console.error('Error during signin:', error)
        res.status(500).json({ error: 'Sign in failed. Please try again.' })
    }
})

// POST /api/auth/signout - User logout
router.post('/signout', async (req, res) => {
    try {
        const authToken = req.cookies.auth_token

        if (authToken) {
            try {
                const decoded = jwt.verify(authToken, JWT_SECRET)

                // Clear session tokens from database
                await dbRun(`
                    UPDATE person_credentials
                    SET session_token = NULL, refresh_token = NULL, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [decoded.credentialId])

                // Broadcast logout
                broadcast({
                    type: 'user_signed_out',
                    data: {
                        username: decoded.username,
                        logout_time: new Date().toISOString()
                    },
                    timestamp: new Date().toISOString()
                })
            } catch (jwtError) {
                // Token invalid, but still proceed with logout
                console.log('Invalid token during logout:', jwtError.message)
            }
        }

        // Clear auth cookie
        res.clearCookie('auth_token')
        res.json({ message: 'Signed out successfully' })

    } catch (error) {
        console.error('Error during signout:', error)
        res.status(500).json({ error: 'Sign out failed' })
    }
})

// GET /api/auth/me - Get current user info
router.get('/me', async (req, res) => {
    try {
        const authToken = req.cookies.auth_token

        if (!authToken) {
            return res.status(401).json({ error: 'Not authenticated' })
        }

        const decoded = jwt.verify(authToken, JWT_SECRET)

        // Get fresh user data
        const user = await dbGet(`
            SELECT
                pc.id as credential_id, pc.person_id, pc.username, pc.is_active,
                pc.email_verified, pc.role_id, pc.must_change_password, pc.last_login_at,
                p.name_prefix, p.first_name, p.middle_name, p.last_name, p.name_suffix,
                p.primary_email_address, p.primary_phone_number
            FROM person_credentials pc
            JOIN persons p ON pc.person_id = p.id
            WHERE pc.id = ? AND pc.is_active = 1
        `, [decoded.credentialId])

        if (!user) {
            res.clearCookie('auth_token')
            return res.status(401).json({ error: 'User not found or deactivated' })
        }

        const userData = {
            person_id: user.person_id,
            credential_id: user.credential_id,
            username: user.username,
            full_name: [user.name_prefix, user.first_name, user.middle_name, user.last_name, user.name_suffix]
                .filter(Boolean)
                .join(' '),
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.primary_email_address,
            phone: user.primary_phone_number,
            email_verified: user.email_verified,
            role_id: user.role_id,
            must_change_password: user.must_change_password,
            last_login_at: user.last_login_at
        }

        res.json({ user: userData })

    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            res.clearCookie('auth_token')
            return res.status(401).json({ error: 'Invalid or expired token' })
        }

        console.error('Error getting user info:', error)
        res.status(500).json({ error: 'Failed to get user info' })
    }
})

// POST /api/auth/refresh - Refresh JWT token
router.post('/refresh', async (req, res) => {
    try {
        const { refresh_token } = req.body

        if (!refresh_token) {
            return res.status(401).json({ error: 'Refresh token required' })
        }

        // Find user by refresh token
        const user = await dbGet(`
            SELECT
                pc.id as credential_id, pc.person_id, pc.username, pc.is_active,
                p.primary_email_address
            FROM person_credentials pc
            JOIN persons p ON pc.person_id = p.id
            WHERE pc.refresh_token = ? AND pc.is_active = 1
        `, [refresh_token])

        if (!user) {
            return res.status(401).json({ error: 'Invalid refresh token' })
        }

        // Generate new tokens
        const newJwtToken = generateToken(user)
        const newRefreshToken = generateSessionToken()

        // Update refresh token in database
        await dbRun(`
            UPDATE person_credentials
            SET refresh_token = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [newRefreshToken, user.credential_id])

        // Set new JWT cookie
        res.cookie('auth_token', newJwtToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        })

        res.json({
            message: 'Token refreshed',
            refresh_token: newRefreshToken
        })

    } catch (error) {
        console.error('Error refreshing token:', error)
        res.status(500).json({ error: 'Failed to refresh token' })
    }
})

export default router