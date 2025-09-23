import { apiClient } from './api-client.js'

export const organizationLegalTypeService = {
    // List all organization legal types
    list: async (activeOnly = false) => {
        try {
            const params = activeOnly ? '?active_only=true' : ''
            return await apiClient.get(`/organization-legal-types${params}`)
        }
        catch (e) { console.warn('organization legal type list failed', e); return [] }
    },

    // Get specific organization legal type
    get: async (id) => {
        try { return await apiClient.get(`/organization-legal-types/${id}`) }
        catch (e) { console.warn('organization legal type get failed', e); return null }
    },

    // Create new organization legal type
    create: async (payload) => await apiClient.post('/organization-legal-types', payload),

    // Update organization legal type
    update: async (id, payload) => await apiClient.put(`/organization-legal-types/${id}`, payload),

    // Delete organization legal type (soft delete)
    delete: async (id) => await apiClient.del(`/organization-legal-types/${id}`),

    // Activate organization legal type
    activate: async (id) => await apiClient.post(`/organization-legal-types/${id}/activate`),

    // Search organization legal types by name, code, or abbreviation
    search: async (query) => {
        try {
            return await apiClient.get(`/organization-legal-types/search?q=${encodeURIComponent(query)}`)
        }
        catch (e) { console.warn('organization legal type search failed', e); return [] }
    },

    // Get organization legal types by country
    getByCountry: async (countryCode) => {
        try {
            return await apiClient.get(`/organization-legal-types?country_code=${countryCode}`)
        }
        catch (e) { console.warn('organization legal types by country failed', e); return [] }
    },

    // Get organization legal types by region
    getByRegion: async (countryCode, region) => {
        try {
            return await apiClient.get(`/organization-legal-types?country_code=${countryCode}&region=${encodeURIComponent(region)}`)
        }
        catch (e) { console.warn('organization legal types by region failed', e); return [] }
    },

    // Get organization legal type by code
    getByCode: async (code) => {
        try {
            return await apiClient.get(`/organization-legal-types/code/${encodeURIComponent(code)}`)
        }
        catch (e) { console.warn('organization legal type by code failed', e); return null }
    }
}