import { apiClient } from './api-client.js'

export const continentService = {
    // List all continents
    list: async (activeOnly = false) => {
        try {
            const params = activeOnly ? '?active_only=true' : ''
            return await apiClient.get(`/continents${params}`)
        }
        catch (e) { console.warn('continent list failed', e); return [] }
    },

    // Get specific continent
    get: async (id) => {
        try { return await apiClient.get(`/continents/${id}`) }
        catch (e) { console.warn('continent get failed', e); return null }
    },

    // Create new continent
    create: async (payload) => await apiClient.post('/continents', payload),

    // Update continent
    update: async (id, payload) => await apiClient.put(`/continents/${id}`, payload),

    // Delete continent (soft delete)
    delete: async (id) => await apiClient.del(`/continents/${id}`),

    // Activate continent
    activate: async (id) => await apiClient.post(`/continents/${id}/activate`)
}