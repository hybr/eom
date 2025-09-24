import { EventBus } from '../utils/EventBus.js'

export class AuthService {
  constructor () {
    this.eventBus = new EventBus()
    this.currentUser = null
    this.token = localStorage.getItem('token')
  }

  async login (credentials) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Login failed')
      }

      const data = await response.json()

      if (data.status === 'success' && data.tokens) {
        this.token = data.tokens.access
        this.currentUser = data.data.user

        localStorage.setItem('token', this.token)
        if (data.tokens.refresh) {
          localStorage.setItem('refreshToken', data.tokens.refresh)
        }

        this.eventBus.emit('auth:login', this.currentUser)
        return this.currentUser
      }

      throw new Error('Invalid response format')
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  async register (userData) {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Registration failed')
      }

      const data = await response.json()

      if (data.status === 'success' && data.tokens) {
        this.token = data.tokens.access
        this.currentUser = data.data.user

        localStorage.setItem('token', this.token)
        if (data.tokens.refresh) {
          localStorage.setItem('refreshToken', data.tokens.refresh)
        }

        this.eventBus.emit('auth:login', this.currentUser)
        return this.currentUser
      }

      throw new Error('Invalid response format')
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  }

  async logout () {
    try {
      if (this.token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      this.token = null
      this.currentUser = null
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      this.eventBus.emit('auth:logout')
    }
  }

  async getCurrentUser () {
    if (!this.token) {
      throw new Error('No authentication token')
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          await this.tryRefreshToken()
          // Retry the request
          return this.getCurrentUser()
        }
        throw new Error('Failed to get current user')
      }

      const data = await response.json()
      if (data.status === 'success' && data.data.user) {
        this.currentUser = data.data.user
        return this.currentUser
      }

      throw new Error('Invalid response format')
    } catch (error) {
      console.error('Get current user error:', error)
      throw error
    }
  }

  async tryRefreshToken () {
    const refreshToken = localStorage.getItem('refreshToken')

    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      })

      if (!response.ok) {
        throw new Error('Failed to refresh token')
      }

      const data = await response.json()
      if (data.status === 'success' && data.tokens) {
        this.token = data.tokens.access
        localStorage.setItem('token', this.token)
        return this.token
      }

      throw new Error('Invalid refresh response')
    } catch (error) {
      console.error('Token refresh error:', error)
      // Remove invalid tokens and logout
      this.logout()
      throw error
    }
  }

  async updateProfile (profileData) {
    if (!this.token) {
      throw new Error('Not authenticated')
    }

    try {
      const response = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update profile')
      }

      const data = await response.json()
      if (data.status === 'success' && data.data.user) {
        this.currentUser = data.data.user
        this.eventBus.emit('auth:profile-updated', this.currentUser)
        return this.currentUser
      }

      throw new Error('Invalid response format')
    } catch (error) {
      console.error('Update profile error:', error)
      throw error
    }
  }

  async changePassword (passwordData) {
    if (!this.token) {
      throw new Error('Not authenticated')
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(passwordData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to change password')
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Change password error:', error)
      throw error
    }
  }

  isAuthenticated () {
    return !!this.token && !!this.currentUser
  }

  getToken () {
    return this.token
  }

  getUser () {
    return this.currentUser
  }

  hasRole (role) {
    return this.currentUser?.role === role
  }

  hasAnyRole (roles) {
    return roles.includes(this.currentUser?.role)
  }

  canPerformAction (entityConfig, action) {
    if (!this.currentUser) {
      return false
    }

    const permissions = entityConfig.permissions
    if (!permissions || !permissions[action]) {
      return true // No restrictions defined
    }

    const allowedRoles = permissions[action]

    // Check for special 'self' permission
    if (allowedRoles.includes('self') || allowedRoles.includes('user-owner')) {
      return true // This would need entity-specific ownership check
    }

    return this.hasAnyRole(allowedRoles)
  }

  removeToken () {
    this.token = null
    this.currentUser = null
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
  }
}