import { apiClient } from './api-client.js'


export const personService = {
    list: async () => {
        try { return await apiClient.get('/persons') }
        catch (e) { console.warn('person list failed', e); return [] }
    },
    create: async (payload) => await apiClient.post('/persons', payload)
}