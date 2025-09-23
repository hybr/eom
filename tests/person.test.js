/** @jest-environment jsdom */
import { personService } from '../src/services/person-service.js'


// We will mock fetch
global.fetch = jest.fn()


describe('personService', () => {
    beforeEach(() => fetch.mockReset())


    test('list returns array on success', async () => {
        fetch.mockResolvedValueOnce({ ok: true, json: async () => [{ id: 1, first_name: 'A', last_name: 'B' }] })
        const list = await personService.list()
        expect(Array.isArray(list)).toBe(true)
        expect(list[0].first_name).toBe('A')
    })


    test('create posts and returns created entity', async () => {
        const payload = { first_name: 'X', last_name: 'Y' }
        fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 99, ...payload }) })
        const res = await personService.create(payload)
        expect(res.id).toBe(99)
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/persons'), expect.objectContaining({ method: 'POST' }))
    })
})