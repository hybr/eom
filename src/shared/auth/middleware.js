const { promisify } = require('util')
const jwt = require('jsonwebtoken')
const AppError = require('../errors/AppError')
const { getDatabase } = require('../db/database')

const protect = async (req, res, next) => {
  try {
    // 1) Getting token and check of it's there
    let token
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1]
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt
    }

    if (!token) {
      return next(
        new AppError('You are not logged in! Please log in to get access.', 401)
      )
    }

    // 2) Verification token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET)

    // 3) Check if user still exists
    const db = getDatabase()
    const currentUser = await db('users')
      .select('*')
      .where('id', decoded.id)
      .first()

    if (!currentUser) {
      return next(
        new AppError(
          'The user belonging to this token does no longer exist.',
          401
        )
      )
    }

    // 4) Check if user changed password after the token was issued
    if (changedPasswordAfter(currentUser.passwordChangedAt, decoded.iat)) {
      return next(
        new AppError('User recently changed password! Please log in again.', 401)
      )
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser
    res.locals.user = currentUser
    next()
  } catch (error) {
    return next(error)
  }
}

// Only for rendered pages, no errors!
const isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) verify the token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      )

      // 2) Check if user still exists
      const db = getDatabase()
      const currentUser = await db('users')
        .select('*')
        .where('id', decoded.id)
        .first()

      if (!currentUser) {
        return next()
      }

      // 3) Check if user changed password after the token was issued
      if (changedPasswordAfter(currentUser.passwordChangedAt, decoded.iat)) {
        return next()
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser
      return next()
    } catch (error) {
      return next()
    }
  }
  next()
}

const restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'manager']. role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      )
    }

    next()
  }
}

const restrictToOwner = (ownerField = 'userId') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id
      const db = getDatabase()

      // Get the resource to check ownership
      const resource = await db(req.entityName || req.baseUrl.replace('/api/', ''))
        .select(ownerField)
        .where('id', resourceId)
        .first()

      if (!resource) {
        return next(new AppError('Resource not found', 404))
      }

      // Check if user owns the resource or has admin/manager role
      if (
        resource[ownerField] !== req.user.id &&
        !['admin', 'manager'].includes(req.user.role)
      ) {
        return next(
          new AppError('You do not have permission to access this resource', 403)
        )
      }

      next()
    } catch (error) {
      return next(error)
    }
  }
}

const changedPasswordAfter = (passwordChangedAt, JWTTimestamp) => {
  if (passwordChangedAt) {
    const changedTimestamp = parseInt(
      passwordChangedAt.getTime() / 1000,
      10
    )

    return JWTTimestamp < changedTimestamp
  }

  // False means NOT changed
  return false
}

module.exports = {
  protect,
  isLoggedIn,
  restrictTo,
  restrictToOwner
}