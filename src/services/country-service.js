import { apiClient } from './api-client.js'

export const countryService = {
    // List all countries
    list: async (activeOnly = false) => {
        try {
            const params = activeOnly ? '?active_only=true' : ''
            return await apiClient.get(`/countries${params}`)
        }
        catch (e) { console.warn('country list failed', e); return [] }
    },

    // Get specific country
    get: async (id) => {
        try { return await apiClient.get(`/countries/${id}`) }
        catch (e) { console.warn('country get failed', e); return null }
    },

    // Create new country
    create: async (payload) => await apiClient.post('/countries', payload),

    // Update country
    update: async (id, payload) => await apiClient.put(`/countries/${id}`, payload),

    // Delete country (soft delete)
    delete: async (id) => await apiClient.del(`/countries/${id}`),

    // Activate country
    activate: async (id) => await apiClient.post(`/countries/${id}/activate`),

    // Search countries by name or code
    search: async (query) => {
        try {
            return await apiClient.get(`/countries/search?q=${encodeURIComponent(query)}`)
        }
        catch (e) { console.warn('country search failed', e); return [] }
    },

    // Get countries by continent
    getByContinent: async (continentId) => {
        try {
            return await apiClient.get(`/countries?continent_id=${continentId}`)
        }
        catch (e) { console.warn('countries by continent failed', e); return [] }
    },

    // Get countries by region
    getByRegion: async (region) => {
        try {
            return await apiClient.get(`/countries?region=${encodeURIComponent(region)}`)
        }
        catch (e) { console.warn('countries by region failed', e); return [] }
    },

    // Get country by ISO code (alpha-2, alpha-3, or numeric)
    getByCode: async (code) => {
        try {
            return await apiClient.get(`/countries/code/${encodeURIComponent(code)}`)
        }
        catch (e) { console.warn('country by code failed', e); return null }
    }
}