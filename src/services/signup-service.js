import { apiClient } from './api-client.js'

export const signupService = {
    // Complete user registration
    register: async (userData) => await apiClient.post('/signup', userData),

    // Check if username is available
    checkUsername: async (username) => {
        try {
            const response = await apiClient.get(`/signup/check-username/${encodeURIComponent(username)}`)
            return response.available
        } catch (e) {
            console.warn('Username check failed', e)
            return false // Assume not available if check fails
        }
    },

    // Check if email is available
    checkEmail: async (email) => {
        try {
            const response = await apiClient.get(`/signup/check-email/${encodeURIComponent(email)}`)
            return response.available
        } catch (e) {
            console.warn('Email check failed', e)
            return false // Assume not available if check fails
        }
    }
}