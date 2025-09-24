const jwt = require('jsonwebtoken')
const { promisify } = require('util')
const AppError = require('../errors/AppError')

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

const signToken = (id, type = 'access') => {
  const expiresIn = type === 'refresh' ? JWT_REFRESH_EXPIRES_IN : JWT_EXPIRES_IN
  return jwt.sign({ id, type }, JWT_SECRET, {
    expiresIn
  })
}

const createSendToken = (user, statusCode, req, res) => {
  const accessToken = signToken(user.id, 'access')
  const refreshToken = signToken(user.id, 'refresh')

  const cookieOptions = {
    expires: new Date(
      Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
  }

  res.cookie('jwt', accessToken, cookieOptions)

  // Remove password from output
  user.password = undefined

  res.status(statusCode).json({
    status: 'success',
    tokens: {
      access: accessToken,
      refresh: refreshToken
    },
    data: {
      user
    }
  })
}

const verifyToken = async (token, type = 'access') => {
  try {
    const decoded = await promisify(jwt.verify)(token, JWT_SECRET)

    if (decoded.type !== type) {
      throw new AppError('Invalid token type', 401)
    }

    return decoded
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new AppError('Invalid token. Please log in again!', 401)
    } else if (error.name === 'TokenExpiredError') {
      throw new AppError('Your token has expired! Please log in again.', 401)
    }
    throw error
  }
}

const refreshAccessToken = async (refreshToken) => {
  const decoded = await verifyToken(refreshToken, 'refresh')
  const newAccessToken = signToken(decoded.id, 'access')

  return {
    accessToken: newAccessToken,
    userId: decoded.id
  }
}

module.exports = {
  signToken,
  createSendToken,
  verifyToken,
  refreshAccessToken
}