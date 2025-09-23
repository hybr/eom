import { apiClient } from './api-client.js'

class AuthService {
    constructor() {
        this.currentUser = null
        this.authListeners = []
        this.refreshToken = localStorage.getItem('refresh_token')

        // Check if user is already authenticated on startup
        this.checkAuth()
    }

    // Event listeners for auth state changes
    onAuthChange(callback) {
        this.authListeners.push(callback)
        // Immediately call with current state
        callback(this.currentUser)

        // Return unsubscribe function
        return () => {
            this.authListeners = this.authListeners.filter(listener => listener !== callback)
        }
    }

    notifyAuthChange() {
        this.authListeners.forEach(callback => callback(this.currentUser))
    }

    // Sign in user
    async signIn(credentials) {
        try {
            const response = await apiClient.post('/auth/signin', credentials)

            this.currentUser = response.user

            // Store refresh token if provided
            if (response.session_token) {
                localStorage.setItem('refresh_token', response.session_token)
                this.refreshToken = response.session_token
            }

            this.notifyAuthChange()

            return {
                success: true,
                user: response.user,
                requiresPasswordChange: response.requires_password_change,
                message: response.message
            }
        } catch (error) {
            const errorMessage = error.message || 'Sign in failed'
            console.error('Sign in error:', error)

            return {
                success: false,
                error: errorMessage,
                attemptsRemaining: error.attempts_remaining
            }
        }
    }

    // Sign out user
    async signOut() {
        try {
            await apiClient.post('/auth/signout')
        } catch (error) {
            console.warn('Sign out API call failed:', error)
        } finally {
            // Clear local state regardless of API call success
            this.currentUser = null
            localStorage.removeItem('refresh_token')
            this.refreshToken = null
            this.notifyAuthChange()
        }
    }

    // Check current authentication status
    async checkAuth() {
        try {
            const response = await apiClient.get('/auth/me')
            this.currentUser = response.user
            this.notifyAuthChange()
            return this.currentUser
        } catch (error) {
            this.currentUser = null
            this.notifyAuthChange()
            return null
        }
    }

    // Refresh authentication token
    async refreshAuth() {
        if (!this.refreshToken) {
            return false
        }

        try {
            const response = await apiClient.post('/auth/refresh', {
                refresh_token: this.refreshToken
            })

            // Update refresh token
            localStorage.setItem('refresh_token', response.refresh_token)
            this.refreshToken = response.refresh_token

            // Get fresh user data
            await this.checkAuth()

            return true
        } catch (error) {
            console.error('Token refresh failed:', error)
            // Clear invalid refresh token
            localStorage.removeItem('refresh_token')
            this.refreshToken = null
            this.currentUser = null
            this.notifyAuthChange()
            return false
        }
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.currentUser
    }

    // Check if user has specific role
    hasRole(roleId) {
        return this.currentUser && this.currentUser.role_id === roleId
    }

    // Check if user needs to change password
    mustChangePassword() {
        return this.currentUser && this.currentUser.must_change_password
    }

    // Auto-refresh token periodically
    startAutoRefresh() {
        // Refresh token every 23 hours (tokens expire in 24 hours)
        setInterval(() => {
            if (this.isAuthenticated()) {
                this.refreshAuth()
            }
        }, 23 * 60 * 60 * 1000)
    }
}

// Create singleton instance
export const authService = new AuthService()

// Start auto-refresh
authService.startAutoRefresh()