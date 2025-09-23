import { apiClient } from './api-client.js'

export const personCredentialService = {
    list: async () => {
        try { return await apiClient.get('/person-credentials') }
        catch (e) { console.warn('person credential list failed', e); return [] }
    },

    get: async (id) => {
        try { return await apiClient.get(`/person-credentials/${id}`) }
        catch (e) { console.warn('person credential get failed', e); return null }
    },

    create: async (payload) => await apiClient.post('/person-credentials', payload),

    update: async (id, payload) => await apiClient.put(`/person-credentials/${id}`, payload),

    changePassword: async (id, newPassword) => await apiClient.post(`/person-credentials/${id}/change-password`, {
        new_password: newPassword
    })
}