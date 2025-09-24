const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { getDatabase } = require('../../shared/db/database')
const { createSendToken, verifyToken, refreshAccessToken } = require('../../shared/auth/jwt')
const { protect } = require('../../shared/auth/middleware')
const AppError = require('../../shared/errors/AppError')
const logger = require('../../shared/logging/logger')

const router = express.Router()

// Register
router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password, firstName, lastName, role = 'user' } = req.body

    // Basic validation
    if (!username || !email || !password || !firstName || !lastName) {
      return next(new AppError('All fields are required', 400))
    }

    if (password.length < 6) {
      return next(new AppError('Password must be at least 6 characters long', 400))
    }

    const db = getDatabase()

    // Check if user already exists
    const existingUser = await db('users')
      .select('id')
      .where('email', email)
      .orWhere('username', username)
      .first()

    if (existingUser) {
      return next(new AppError('User with this email or username already exists', 409))
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const now = new Date().toISOString()
    const userData = {
      username,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role,
      status: 'active',
      createdAt: now,
      updatedAt: now
    }

    const [userId] = await db('users').insert(userData)

    // Get created user (without password)
    const newUser = await db('users')
      .select('id', 'username', 'email', 'firstName', 'lastName', 'role', 'status', 'createdAt')
      .where('id', userId)
      .first()

    logger.info('User registered successfully', { userId, email, username })

    // Send token
    createSendToken(newUser, 201, req, res)
  } catch (error) {
    next(error)
  }
})

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password, username } = req.body

    // Check if email/username and password exist
    if ((!email && !username) || !password) {
      return next(new AppError('Please provide email/username and password', 400))
    }

    const db = getDatabase()

    // Find user by email or username
    let query = db('users').select('*')

    if (email) {
      query = query.where('email', email)
    } else {
      query = query.where('username', username)
    }

    const user = await query.first()

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return next(new AppError('Incorrect credentials', 401))
    }

    // Check if user is active
    if (user.status !== 'active') {
      return next(new AppError('Your account is not active. Please contact administrator.', 401))
    }

    // Update last login
    await db('users')
      .where('id', user.id)
      .update({
        lastLogin: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

    logger.info('User logged in successfully', { userId: user.id, email: user.email })

    // Send token
    createSendToken(user, 200, req, res)
  } catch (error) {
    next(error)
  }
})

// Logout
router.post('/logout', (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  })

  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  })
})

// Refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return next(new AppError('Refresh token is required', 400))
    }

    const { accessToken, userId } = await refreshAccessToken(refreshToken)

    const db = getDatabase()
    const user = await db('users')
      .select('id', 'username', 'email', 'firstName', 'lastName', 'role', 'status')
      .where('id', userId)
      .first()

    if (!user) {
      return next(new AppError('User not found', 404))
    }

    res.status(200).json({
      status: 'success',
      tokens: {
        access: accessToken
      },
      data: {
        user
      }
    })
  } catch (error) {
    next(error)
  }
})

// Get current user
router.get('/me', protect, async (req, res, next) => {
  try {
    const db = getDatabase()
    const user = await db('users')
      .select('id', 'username', 'email', 'firstName', 'lastName', 'role', 'status', 'lastLogin', 'createdAt', 'updatedAt')
      .where('id', req.user.id)
      .first()

    if (!user) {
      return next(new AppError('User not found', 404))
    }

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    })
  } catch (error) {
    next(error)
  }
})

// Update current user
router.patch('/me', protect, async (req, res, next) => {
  try {
    const { firstName, lastName, email } = req.body
    const updateData = {}

    if (firstName) updateData.firstName = firstName
    if (lastName) updateData.lastName = lastName
    if (email) updateData.email = email

    if (Object.keys(updateData).length === 0) {
      return next(new AppError('Nothing to update', 400))
    }

    updateData.updatedAt = new Date().toISOString()

    const db = getDatabase()

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await db('users')
        .select('id')
        .where('email', email)
        .where('id', '!=', req.user.id)
        .first()

      if (existingUser) {
        return next(new AppError('Email is already taken', 409))
      }
    }

    await db('users')
      .where('id', req.user.id)
      .update(updateData)

    const updatedUser = await db('users')
      .select('id', 'username', 'email', 'firstName', 'lastName', 'role', 'status', 'lastLogin', 'createdAt', 'updatedAt')
      .where('id', req.user.id)
      .first()

    logger.info('User profile updated', { userId: req.user.id, updates: Object.keys(updateData) })

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser
      }
    })
  } catch (error) {
    next(error)
  }
})

// Change password
router.patch('/change-password', protect, async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body

    if (!currentPassword || !newPassword || !confirmPassword) {
      return next(new AppError('Please provide current password, new password, and confirm password', 400))
    }

    if (newPassword !== confirmPassword) {
      return next(new AppError('New password and confirm password do not match', 400))
    }

    if (newPassword.length < 6) {
      return next(new AppError('New password must be at least 6 characters long', 400))
    }

    const db = getDatabase()
    const user = await db('users')
      .select('*')
      .where('id', req.user.id)
      .first()

    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return next(new AppError('Current password is incorrect', 401))
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update password
    await db('users')
      .where('id', req.user.id)
      .update({
        password: hashedPassword,
        passwordChangedAt: new Date(),
        updatedAt: new Date().toISOString()
      })

    logger.info('Password changed successfully', { userId: req.user.id })

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router