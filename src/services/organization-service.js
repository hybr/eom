import { apiClient } from './api-client.js'


export const organizationService = {
    list: async () => {
        try { return await apiClient.get('/organizations') }
        catch (e) { console.warn('org list failed', e); return [] }
    },
    create: async (payload) => await apiClient.post('/organizations', payload)
}